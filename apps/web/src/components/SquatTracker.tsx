"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";

import type { NormalizedLandmarkList } from "@mediapipe/pose";

type SquatTrackerProps = {
  onChallengeComplete: () => void;
};

const HIP_L = 23;
const HIP_R = 24;
const KNEE_L = 25;
const KNEE_R = 26;

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
  onChallengeComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wasSquattingRef = useRef(false);
  const completionNotifiedRef = useRef(false);

  const [squatCount, setSquatCount] = useState(0);
  const [isSquatting, setIsSquatting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCompleteRef = useRef(onChallengeComplete);
  onCompleteRef.current = onChallengeComplete;

  const handleSquatLogic = useCallback(
    (landmarks: NormalizedLandmarkList | undefined) => {
      if (!landmarks || landmarks.length < 27) return;

      const lh = landmarks[HIP_L];
      const rh = landmarks[HIP_R];
      const lk = landmarks[KNEE_L];
      const rk = landmarks[KNEE_R];
      if (!lh || !rh || !lk || !rk) return;

      const hipY = (lh.y + rh.y) / 2;
      const kneeY = (lk.y + rk.y) / 2;

      // Normalized image coords: y grows downward — hips "below" knees => larger hip Y.
      const squattingNow = hipY > kneeY;
      setIsSquatting(squattingNow);

      if (wasSquattingRef.current && !squattingNow) {
        setSquatCount((c) => {
          if (c >= 5) return c;
          const next = c + 1;
          if (next === 5 && !completionNotifiedRef.current) {
            completionNotifiedRef.current = true;
            onCompleteRef.current();
          }
          return next;
        });
      }
      wasSquattingRef.current = squattingNow;
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
            handleSquatLogic(results.poseLandmarks);
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
            e instanceof Error ? e.message : "Kamera veya MediaPipe hatası",
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
  }, [handleSquatLogic]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div
        className="text-center text-3xl font-extrabold tracking-wide text-amber-300 drop-shadow-lg"
        aria-live="polite"
      >
        Squats: {squatCount} / 5
      </div>
      {isSquatting && (
        <p className="text-center text-emerald-400 font-semibold text-sm">
          Çömelme algılandı
        </p>
      )}
      {error && (
        <p className="text-center text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="relative w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-slate-600 bg-black aspect-video">
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
