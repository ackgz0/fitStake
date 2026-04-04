"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";

import type { NormalizedLandmarkList } from "@mediapipe/pose";

import { useLanguage } from "@/components/LanguageProvider";

export type SquatTrackerProps = {
  exerciseType: "squat" | "pushup";
  /** Defaults to 5 (quick demo). Use 10 for the 30-day daily goal. */
  targetReps?: number;
  onChallengeComplete: () => void;
};

const SQUAT_HIP = 24;
const SQUAT_KNEE = 26;
const SQUAT_ANKLE = 28;
const PUSH_SHOULDER = 12;
const PUSH_ELBOW = 14;
const PUSH_WRIST = 16;

type Point2 = { x: number; y: number };

const calculateAngle = (a: Point2, b: Point2, c: Point2) => {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

function landmarkVisible(lm: { visibility?: number } | undefined) {
  return lm != null && (lm.visibility ?? 1) >= 0.3;
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmarkList,
  connections: Array<[number, number]>,
  width: number,
  height: number,
) {
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 3;
  for (const [start, end] of connections) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b) continue;
    if ((a.visibility ?? 1) < 0.3 || (b.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }
  ctx.fillStyle = "#fbbf24";
  for (const lm of landmarks) {
    if (!lm || (lm.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export const SquatTracker: FC<SquatTrackerProps> = ({
  exerciseType,
  targetReps = 5,
  onChallengeComplete,
}) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDownRef = useRef(false);
  const completionNotifiedRef = useRef(false);

  const isTrackingActiveRef = useRef(false);
  const exerciseTypeRef = useRef(exerciseType);
  exerciseTypeRef.current = exerciseType;
  const targetRepsRef = useRef(targetReps);
  targetRepsRef.current = targetReps;

  const [prepCountdown, setPrepCountdown] = useState(10);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [isInDownPhase, setIsInDownPhase] = useState(false);
  const [repFlash, setRepFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCompleteRef = useRef(onChallengeComplete);
  onCompleteRef.current = onChallengeComplete;

  useEffect(() => {
    isTrackingActiveRef.current = isTrackingActive;
  }, [isTrackingActive]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPrepCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (prepCountdown === 0) {
      setIsTrackingActive(true);
    }
  }, [prepCountdown]);

  const processExerciseFrame = useCallback(
    (landmarks: NormalizedLandmarkList | undefined) => {
      if (!isTrackingActiveRef.current || !landmarks) return;

      const kind = exerciseTypeRef.current;

      if (kind === "squat") {
        const hip = landmarks[SQUAT_HIP];
        const knee = landmarks[SQUAT_KNEE];
        const ankle = landmarks[SQUAT_ANKLE];
        if (
          !landmarkVisible(hip) ||
          !landmarkVisible(knee) ||
          !landmarkVisible(ankle)
        ) {
          return;
        }
        const kneeAngle = calculateAngle(hip, knee, ankle);
        const isDown = kneeAngle < 100;
        const completedUp = kneeAngle > 160 && isDownRef.current;
        setIsInDownPhase(isDown);
        if (isDown) isDownRef.current = true;
        if (completedUp) {
          isDownRef.current = false;
          const cap = targetRepsRef.current;
          setRepCount((c) => {
            if (c >= cap) return c;
            const next = c + 1;
            if (next === cap && !completionNotifiedRef.current) {
              completionNotifiedRef.current = true;
              onCompleteRef.current();
            }
            return next;
          });
          setRepFlash(true);
          window.setTimeout(() => setRepFlash(false), 450);
        }
      } else {
        const shoulder = landmarks[PUSH_SHOULDER];
        const elbow = landmarks[PUSH_ELBOW];
        const wrist = landmarks[PUSH_WRIST];
        if (
          !landmarkVisible(shoulder) ||
          !landmarkVisible(elbow) ||
          !landmarkVisible(wrist)
        ) {
          return;
        }
        const elbowAngle = calculateAngle(shoulder, elbow, wrist);
        const isDown = elbowAngle < 90;
        const completedUp = elbowAngle > 150 && isDownRef.current;
        setIsInDownPhase(isDown);
        if (isDown) isDownRef.current = true;
        if (completedUp) {
          isDownRef.current = false;
          const cap = targetRepsRef.current;
          setRepCount((c) => {
            if (c >= cap) return c;
            const next = c + 1;
            if (next === cap && !completionNotifiedRef.current) {
              completionNotifiedRef.current = true;
              onCompleteRef.current();
            }
            return next;
          });
          setRepFlash(true);
          window.setTimeout(() => setRepFlash(false), 450);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let cameraStop: (() => Promise<void>) | null = null;
    let poseClose: (() => Promise<void>) | null = null;

    const run = async () => {
      try {
        const [{ Pose, POSE_CONNECTIONS }, { Camera }] = await Promise.all([
          import("@mediapipe/pose"),
          import("@mediapipe/camera_utils"),
        ]);

        if (cancelled || !videoRef.current || !canvasRef.current) return;

        const poseVersion = "0.5.1675469404";
        const pose = new Pose({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${poseVersion}/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;
          canvas.width = w;
          canvas.height = h;

          ctx.save();
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(results.image, 0, 0, w, h);

          if (results.poseLandmarks) {
            drawSkeleton(
              ctx,
              results.poseLandmarks,
              POSE_CONNECTIONS,
              w,
              h,
            );
            processExerciseFrame(results.poseLandmarks);
          }
          ctx.restore();
        });

        await pose.initialize();
        poseClose = () => pose.close();

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (cancelled || !videoRef.current) return;
            await pose.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
          facingMode: "user",
        });

        cameraStop = () => camera.stop();
        await camera.start();
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : t("squatErrCamera"),
          );
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      void cameraStop?.();
      void poseClose?.();
    };
  }, [processExerciseFrame, t]);

  const exerciseLabel =
    exerciseType === "squat" ? t("squatLabelSquat") : t("squatLabelPushup");
  const phaseHint =
    exerciseType === "squat" ? t("squatPhaseSquat") : t("squatPhasePushup");

  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="text-center text-slate-300 text-sm font-medium">
        {t("squatTrackerExercise")}{" "}
        <span className="text-amber-300">{exerciseLabel}</span>
      </p>
      <div
        className={`text-center text-3xl font-extrabold tracking-wide drop-shadow-lg transition-colors duration-200 ${
          repFlash ? "text-emerald-300 scale-105" : "text-amber-300"
        }`}
        aria-live="polite"
      >
        {t("squatTrackerRep")} {repCount} / {targetReps}
      </div>
      {repFlash && (
        <p className="text-center text-emerald-400 font-bold text-lg animate-pulse">
          {t("squatTrackerPlusRep")}
        </p>
      )}
      {isTrackingActive && isInDownPhase && (
        <p className="text-center text-emerald-400 font-semibold text-sm">
          {phaseHint}
        </p>
      )}
      {error && (
        <p className="text-center text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="relative w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-slate-600 bg-black aspect-video">
        {prepCountdown > 0 && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85 px-4 text-center backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <p className="text-white text-lg sm:text-xl font-bold leading-snug max-w-md">
              {t("squatCameraPrep", { seconds: prepCountdown })}
            </p>
          </div>
        )}
        <video
          ref={videoRef}
          className="fixed pointer-events-none opacity-0 -z-10 w-[640px] h-[480px] max-w-none"
          style={{ left: -9999, top: 0 }}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      </div>
    </div>
  );
};
