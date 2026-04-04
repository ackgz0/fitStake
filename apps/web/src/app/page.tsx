"use client";

import dynamic from "next/dynamic";
import {
  type ComponentProps,
  type ComponentType,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AnchorProvider,
  BN,
  Idl,
  Program,
  web3,
} from "@coral-xyz/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import type { SquatTrackerProps } from "@/components/SquatTracker";
import fitstakeVaultIdl from "@/idl/fitstake_vault.json";
import { localeToBcp47 } from "@/lib/i18n";
import {
  defaultUserState,
  loadUserState,
  saveUserState,
  todayLocalYMD,
  type FitstakeUserPersistedState,
} from "@/lib/fitstakeStorage";

const Confetti = dynamic(
  () => import("react-confetti"),
  { ssr: false },
) as ComponentType<
  ComponentProps<typeof import("react-confetti").default>
>;

function SquatTrackerLoading() {
  const { t } = useLanguage();
  return (
    <p className="text-slate-400 text-sm">{t("squatTrackerLoading")}</p>
  );
}

const SquatTracker = dynamic(
  () =>
    import("@/components/SquatTracker").then((m) => ({
      default: m.SquatTracker,
    })),
  { ssr: false, loading: SquatTrackerLoading },
) as ComponentType<SquatTrackerProps>;

const PROGRAM_ID = new web3.PublicKey(
  "Y423PxcQ8DobRYRrWRCYG7XrRkfvhT7MyP8TWex1MxX",
);

const IDL = fitstakeVaultIdl as Idl;

function deriveChallengePdas(walletPk: web3.PublicKey, challengeId: BN) {
  const [userProfilePda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_profile"),
      walletPk.toBuffer(),
      challengeId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID,
  );
  const [vaultPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID,
  );
  return { userProfilePda, vaultPda };
}

type FlowSelection = "pick" | "quick" | "30day";

export default function Home() {
  const { t, locale } = useLanguage();
  const dateLocale = localeToBcp47(locale);
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persisted, setPersisted] = useState<FitstakeUserPersistedState | null>(
    null,
  );

  const [flowSelection, setFlowSelection] = useState<FlowSelection>("pick");
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [exerciseType, setExerciseType] = useState<"squat" | "pushup">("squat");
  const [activeChallengeId, setActiveChallengeId] = useState<BN | null>(null);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);
  const [txKind, setTxKind] = useState<null | "stake" | "claim">(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setPersisted(null);
      setHydrated(false);
      setActiveChallengeId(null);
      setRewardUnlocked(false);
      setFlowSelection("pick");
      setIsChallengeActive(false);
      return;
    }
    const loaded = loadUserState(publicKey.toBase58());
    const st = loaded ?? defaultUserState();
    setPersisted(st);
    if (st.activeChallenge?.lastChainChallengeId) {
      setActiveChallengeId(new BN(st.activeChallenge.lastChainChallengeId));
    } else {
      setActiveChallengeId(null);
    }
    setRewardUnlocked(st.activeChallenge?.canClaim ?? false);
    setHydrated(true);
  }, [publicKey]);

  const persistReplace = useCallback(
    (next: FitstakeUserPersistedState) => {
      if (!publicKey) return;
      saveUserState(publicKey.toBase58(), next);
      setPersisted(next);
    },
    [publicKey],
  );

  useEffect(() => {
    if (!showConfetti) return;
    const update = () =>
      setConfettiSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [showConfetti]);

  const getProgram = useCallback(() => {
    if (!anchorWallet) {
      throw new Error(t("errWalletProgram"));
    }
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return new Program(IDL, provider);
  }, [anchorWallet, connection, t]);

  const handleBackToHome = useCallback(() => {
    const msg = isChallengeActive
      ? t("confirmBackActiveWorkout")
      : t("confirmBackChallenge");
    const ok = window.confirm(msg);
    if (!ok) return;

    if (persisted) {
      persistReplace({
        ...persisted,
        activeChallenge: null,
      });
    }
    setIsChallengeActive(false);
    setActiveChallengeId(null);
    setRewardUnlocked(false);
    setFlowSelection("pick");
  }, [isChallengeActive, persisted, persistReplace, t]);

  const ac = persisted?.activeChallenge;
  const is30DayActive = ac?.type === "30day_transformation";
  const isQuickActive = ac?.type === "quick_demo";
  const todayYmd = todayLocalYMD();
  const completedToday30 =
    is30DayActive && ac.lastWorkoutDate === todayYmd;
  const targetReps = is30DayActive ? 10 : 5;

  const handleChallengeComplete = useCallback(() => {
    if (!publicKey || !persisted?.activeChallenge) return;
    const cur = persisted.activeChallenge;

    if (cur.type === "quick_demo") {
      const trophyEarned = exerciseType === "pushup" ? 10 : 5;
      const exName =
        exerciseType === "pushup"
          ? t("exercisePushup")
          : t("squatLabelSquat");
      const next: FitstakeUserPersistedState = {
        ...persisted,
        activeChallenge: { ...cur, canClaim: true },
        completedChallenges: [
          ...persisted.completedChallenges,
          {
            name: t("quickChallengeName", {
              exercise: exName,
              trophy: trophyEarned,
            }),
            completedAt: new Date().toISOString(),
          },
        ],
        trophyPoints: persisted.trophyPoints + trophyEarned,
      };
      persistReplace(next);
      setRewardUnlocked(true);
      setIsChallengeActive(false);
      window.alert(t("alertQuickComplete", { trophy: trophyEarned }));
      return;
    }

    if (cur.type === "30day_transformation") {
      const trophyEarned = 15;
      const nextDay = cur.currentDay + 1;
      const last = todayLocalYMD();
      const canClaim = nextDay >= 30;
      const next: FitstakeUserPersistedState = {
        ...persisted,
        activeChallenge: {
          ...cur,
          currentDay: nextDay,
          lastWorkoutDate: last,
          canClaim: canClaim || cur.canClaim,
        },
        completedChallenges:
          nextDay >= 30
            ? [
                ...persisted.completedChallenges,
                {
                  name: t("challengeName30Day"),
                  completedAt: new Date().toISOString(),
                },
              ]
            : persisted.completedChallenges,
        trophyPoints: persisted.trophyPoints + trophyEarned,
      };
      persistReplace(next);
      setRewardUnlocked(canClaim);
      setIsChallengeActive(false);
      window.alert(
        nextDay >= 30
          ? t("alert30Complete", { trophy: trophyEarned })
          : t("alert30DayProgress", { day: nextDay, trophy: trophyEarned }),
      );
    }
  }, [exerciseType, persistReplace, persisted, publicKey, t]);

  const handleStake = useCallback(async () => {
    if (!anchorWallet || !publicKey) {
      window.alert(t("errWallet"));
      return;
    }
    if (flowSelection !== "quick" && flowSelection !== "30day") {
      window.alert(t("errPickChallenge"));
      return;
    }
    setTxKind("stake");
    try {
      const program = getProgram();
      const newChallengeId = new BN(Date.now());
      const { userProfilePda, vaultPda } = deriveChallengePdas(
        anchorWallet.publicKey,
        newChallengeId,
      );
      await program.methods
        .stakeSol(newChallengeId)
        .accounts({
          userProfile: userProfilePda,
          vault: vaultPda,
          user: anchorWallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      const nextChallenge = {
        type:
          flowSelection === "quick"
            ? ("quick_demo" as const)
            : ("30day_transformation" as const),
        startDate: new Date().toISOString(),
        currentDay: 0,
        lastWorkoutDate: null as string | null,
        lastChainChallengeId: newChallengeId.toString(),
        canClaim: false,
      };

      const base = persisted ?? defaultUserState();
      persistReplace({
        ...base,
        activeChallenge: nextChallenge,
      });

      setActiveChallengeId(newChallengeId);
      setRewardUnlocked(false);
      if (flowSelection === "quick") {
        setIsChallengeActive(true);
      } else {
        setIsChallengeActive(false);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTxKind(null);
    }
  }, [anchorWallet, flowSelection, getProgram, persistReplace, persisted, publicKey, t]);

  const handleClaim = useCallback(async () => {
    if (!anchorWallet) {
      window.alert(t("errWallet"));
      return;
    }
    if (!activeChallengeId) {
      window.alert(t("errNoChallengeId"));
      return;
    }
    if (!rewardUnlocked) {
      window.alert(t("errNotEligible"));
      return;
    }
    setTxKind("claim");
    try {
      const program = getProgram();
      const { userProfilePda, vaultPda } = deriveChallengePdas(
        anchorWallet.publicKey,
        activeChallengeId,
      );
      await program.methods
        .claimReward(activeChallengeId)
        .accounts({
          userProfile: userProfilePda,
          vault: vaultPda,
          user: anchorWallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      window.alert(t("alertClaimSuccess"));
      if (publicKey) {
        persistReplace({
          activeChallenge: null,
          completedChallenges: persisted?.completedChallenges ?? [],
          trophyPoints: persisted?.trophyPoints ?? 0,
        });
      }
      setRewardUnlocked(false);
      setActiveChallengeId(null);
      setFlowSelection("pick");
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 4500);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTxKind(null);
    }
  }, [
    activeChallengeId,
    anchorWallet,
    getProgram,
    persistReplace,
    persisted?.completedChallenges,
    persisted?.trophyPoints,
    publicKey,
    rewardUnlocked,
    t,
  ]);

  const isTxPending = txKind !== null;
  const stakeLabel =
    txKind === "stake" ? t("stakeProcessing") : t("stakeCta");
  const claimLabel =
    txKind === "claim" ? t("claimProcessing") : t("claimCta");

  const claimDisabled =
    !rewardUnlocked ||
    activeChallengeId === null ||
    isTxPending ||
    (is30DayActive && !ac?.canClaim);

  const claimTitle =
    is30DayActive && !ac?.canClaim
      ? t("claimTitle30NotDone")
      : !rewardUnlocked
        ? t("claimTitleNeedComplete")
        : undefined;

  const showChallengePicker =
    hydrated && persisted && !persisted.activeChallenge;
  const showActiveFlow = hydrated && persisted && !!persisted.activeChallenge;

  const showSquatTracker =
    isChallengeActive &&
    showActiveFlow &&
    (!is30DayActive || !completedToday30);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(34,211,238,0.12),transparent)] text-slate-100">
      {showConfetti && confettiSize.width > 0 && (
        <Confetti
          width={confettiSize.width}
          height={confettiSize.height}
          recycle={false}
          numberOfPieces={220}
          className="!fixed !inset-0 !pointer-events-none z-50"
        />
      )}

      {mounted && connected && (
        <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/85 px-4 py-3 backdrop-blur-xl sm:px-8">
          <span className="bg-gradient-to-r from-cyan-200 to-emerald-300 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
            FitStake
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {publicKey && hydrated && persisted && (
              <ProfileDropdown
                completedChallenges={persisted.completedChallenges}
                totalCompleted={persisted.completedChallenges.length}
                trophyPoints={persisted.trophyPoints}
              />
            )}
            <WalletMultiButton className="!bg-slate-900 !font-medium !shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)] hover:!bg-slate-800" />
          </div>
        </header>
      )}

      <div
        className={`flex min-h-screen flex-col ${mounted && connected ? "pt-20" : ""}`}
      >
        {(!mounted || !connected) && (
          <div className="fixed right-4 top-4 z-50 sm:right-8">
            <LanguageSwitcher />
          </div>
        )}
        {(!mounted || !connected) && (
          <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
            <div className="max-w-lg text-center">
              <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                FitStake
              </h1>
              <p className="mt-4 text-lg text-slate-400">
                {t("heroTagline")}
              </p>
              <div className="mt-12 flex justify-center">
                {mounted ? (
                  <WalletMultiButton className="!scale-110 !rounded-2xl !bg-gradient-to-r !from-cyan-600 !to-emerald-600 !px-8 !py-3 !font-semibold !shadow-[0_0_40px_-8px_rgba(34,211,238,0.55)] hover:!from-cyan-500 hover:!to-emerald-500" />
                ) : (
                  <span className="inline-block h-[50px] w-[200px] animate-pulse rounded-2xl bg-slate-800/60" />
                )}
              </div>
            </div>
          </section>
        )}

        {mounted && connected && publicKey && (
          <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 pb-20 pt-6 sm:px-6">
            {!hydrated || !persisted ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500 backdrop-blur-sm">
                {t("profileLoading")}
              </div>
            ) : (
              <>
                <section className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {t("profileTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("profileStorageNote")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="rounded-2xl border border-amber-500/20 bg-slate-950/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        {t("trophyPoints")}
                      </p>
                      <p className="text-2xl font-bold text-amber-300">
                        {persisted.trophyPoints} 🏆
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        {t("totalChallenges")}
                      </p>
                      <p className="text-2xl font-bold text-cyan-300">
                        {persisted.completedChallenges.length}
                      </p>
                    </div>
                    {ac && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          {t("activeProgram")}
                        </p>
                        <p className="text-sm font-medium text-emerald-300/90">
                          {is30DayActive
                            ? t("active30Day", { day: ac.currentDay })
                            : t("quickDemo")}
                        </p>
                      </div>
                    )}
                  </div>
                  {persisted.completedChallenges.length > 0 && (
                    <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-sm">
                      {[...persisted.completedChallenges].reverse().map((c, i) => (
                        <li
                          key={`${c.completedAt}-${i}`}
                          className="flex justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2"
                        >
                          <span className="text-slate-200">{c.name}</span>
                          <span className="shrink-0 text-slate-500">
                            {new Date(c.completedAt).toLocaleDateString(
                              dateLocale,
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {showChallengePicker && (
                  <section>
                    <h2 className="mb-4 text-center text-xl font-bold text-slate-100 sm:text-2xl">
                      {t("pickChallenge")}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setFlowSelection("quick")}
                        className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition ${
                          flowSelection === "quick"
                            ? "border-cyan-400/60 bg-cyan-950/30 shadow-[0_0_40px_-12px_rgba(34,211,238,0.5)]"
                            : "border-slate-700/80 bg-slate-900/30 hover:border-cyan-500/40"
                        }`}
                      >
                        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl transition group-hover:bg-cyan-500/20" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
                          {t("cardQuickBadge")}
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-white">
                          {t("cardQuickTitle")}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                          {t("cardQuickBody")}
                        </p>
                        <p className="mt-2 text-xs font-medium text-amber-400/80">
                          {t("cardQuickTrophy")}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlowSelection("30day")}
                        className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition ${
                          flowSelection === "30day"
                            ? "border-emerald-400/60 bg-emerald-950/30 shadow-[0_0_40px_-12px_rgba(52,211,153,0.45)]"
                            : "border-slate-700/80 bg-slate-900/30 hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-500/20" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                          {t("card30Badge")}
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-white">
                          {t("card30Title")}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                          {t("card30Body", { stake: "0.1 SOL" })}
                        </p>
                        <p className="mt-2 text-xs font-medium text-amber-400/80">
                          {t("card30Trophy")}
                        </p>
                      </button>
                    </div>
                  </section>
                )}

                {showChallengePicker && flowSelection !== "pick" && (
                  <section className="rounded-3xl border border-slate-800/80 bg-slate-900/35 p-6 backdrop-blur-xl">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-200">
                        {flowSelection === "quick"
                          ? t("prepQuick")
                          : t("prep30")}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setFlowSelection("pick")}
                        className="flex items-center gap-1.5 text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        {t("backToList")}
                      </button>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label={t("ariaExercise")}
                    >
                      <button
                        type="button"
                        onClick={() => setExerciseType("squat")}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                          exerciseType === "squat"
                            ? "bg-cyan-600 text-white ring-2 ring-cyan-400/80"
                            : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/80"
                        }`}
                      >
                        Squat
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseType("pushup")}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                          exerciseType === "pushup"
                            ? "bg-cyan-600 text-white ring-2 ring-cyan-400/80"
                            : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/80"
                        }`}
                      >
                        {t("exercisePushup")}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleStake}
                      disabled={isTxPending}
                      className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50 disabled:pointer-events-none sm:w-auto sm:px-10"
                    >
                      {stakeLabel}
                    </button>
                  </section>
                )}

                {showActiveFlow && (
                  <button
                    type="button"
                    onClick={handleBackToHome}
                    className="flex items-center gap-1.5 self-start rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-slate-600 hover:bg-slate-800/70 hover:text-slate-200"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    {t("backHome")}
                  </button>
                )}

                {showActiveFlow && is30DayActive && completedToday30 && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-4 text-center text-emerald-200/95">
                    {ac.currentDay >= 30 && ac.canClaim
                      ? t("msg30ClaimReady")
                      : t("msg30DoneToday")}
                  </div>
                )}

                {showActiveFlow &&
                  is30DayActive &&
                  !completedToday30 &&
                  !isChallengeActive && (
                    <button
                      type="button"
                      onClick={() => setIsChallengeActive(true)}
                      className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-900/20 py-4 font-semibold text-emerald-200 transition hover:bg-emerald-900/35"
                    >
                      {t("startTodayGoal")}
                    </button>
                  )}

                {showActiveFlow &&
                  isQuickActive &&
                  !ac.canClaim &&
                  !isChallengeActive && (
                    <>
                      <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={t("ariaExercise")}
                      >
                        <button
                          type="button"
                          onClick={() => setExerciseType("squat")}
                          className={`rounded-xl px-3 py-1.5 text-sm ${
                            exerciseType === "squat"
                              ? "bg-cyan-600 text-white"
                              : "border border-slate-600 bg-slate-800/50"
                          }`}
                        >
                          Squat
                        </button>
                        <button
                          type="button"
                          onClick={() => setExerciseType("pushup")}
                          className={`rounded-xl px-3 py-1.5 text-sm ${
                            exerciseType === "pushup"
                              ? "bg-cyan-600 text-white"
                              : "border border-slate-600 bg-slate-800/50"
                          }`}
                        >
                          {t("exercisePushup")}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChallengeActive(true)}
                        className="w-full rounded-2xl border border-cyan-500/40 bg-cyan-900/20 py-4 font-semibold text-cyan-200 transition hover:bg-cyan-900/35"
                      >
                        {t("resumeWorkout")}
                      </button>
                    </>
                  )}

                {showActiveFlow &&
                  is30DayActive &&
                  !completedToday30 &&
                  !isChallengeActive && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExerciseType("squat")}
                        className={`rounded-xl px-3 py-1.5 text-sm ${
                          exerciseType === "squat"
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-600 bg-slate-800/50"
                        }`}
                      >
                        Squat
                      </button>
                      <button
                        type="button"
                        onClick={() => setExerciseType("pushup")}
                        className={`rounded-xl px-3 py-1.5 text-sm ${
                          exerciseType === "pushup"
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-600 bg-slate-800/50"
                        }`}
                      >
                        {t("exercisePushup")}
                      </button>
                    </div>
                  )}

                {showSquatTracker && (
                  <SquatTracker
                    exerciseType={exerciseType}
                    targetReps={targetReps}
                    onChallengeComplete={handleChallengeComplete}
                  />
                )}

                {showActiveFlow && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleClaim}
                      disabled={claimDisabled}
                      title={claimTitle}
                      className="rounded-2xl border border-slate-600 bg-slate-800/60 px-6 py-3.5 font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {claimLabel}
                    </button>
                    {is30DayActive && !ac.canClaim && (
                      <p className="self-center text-sm text-slate-500">
                        {t("rewardHint30", { day: ac.currentDay })}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
