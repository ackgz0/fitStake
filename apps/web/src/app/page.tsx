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

import { ProfileDropdown } from "@/components/ProfileDropdown";
import fitstakeVaultIdl from "@/idl/fitstake_vault.json";
import type { SquatTrackerProps } from "@/components/SquatTracker";
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

const SquatTracker = dynamic(
  () =>
    import("@/components/SquatTracker").then((m) => ({
      default: m.SquatTracker,
    })),
  { ssr: false, loading: () => <p className="text-slate-400 text-sm">Yükleniyor…</p> },
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
      throw new Error("Cüzdan bağlı değil veya imza yok.");
    }
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return new Program(IDL, provider);
  }, [anchorWallet, connection]);

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
      const next: FitstakeUserPersistedState = {
        ...persisted,
        activeChallenge: { ...cur, canClaim: true },
        completedChallenges: [
          ...persisted.completedChallenges,
          {
            name: "Hızlı Demo (Anında Ödül)",
            completedAt: new Date().toISOString(),
          },
        ],
      };
      persistReplace(next);
      setRewardUnlocked(true);
      setIsChallengeActive(false);
      window.alert("Tebrikler! Görevi tamamladın. Ödülünü çekebilirsin.");
      return;
    }

    if (cur.type === "30day_transformation") {
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
                  name: "30 Günlük Dönüşüm",
                  completedAt: new Date().toISOString(),
                },
              ]
            : persisted.completedChallenges,
      };
      persistReplace(next);
      setRewardUnlocked(canClaim);
      setIsChallengeActive(false);
      window.alert(
        nextDay >= 30
          ? "30 günlük program tamamlandı! Ödülünü çekebilirsin."
          : `Gün ${nextDay}/30 tamamlandı. Yarın tekrar görüşürüz!`,
      );
    }
  }, [persistReplace, persisted, publicKey]);

  const handleStake = useCallback(async () => {
    if (!anchorWallet || !publicKey) {
      window.alert("Cüzdan bağlı değil.");
      return;
    }
    if (flowSelection !== "quick" && flowSelection !== "30day") {
      window.alert("Önce bir challenge seçin.");
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
  }, [anchorWallet, flowSelection, getProgram, persistReplace, persisted, publicKey]);

  const handleClaim = useCallback(async () => {
    if (!anchorWallet) {
      window.alert("Cüzdan bağlı değil.");
      return;
    }
    if (!activeChallengeId) {
      window.alert("Aktif challenge kimliği yok. Önce stake yapın.");
      return;
    }
    if (!rewardUnlocked) {
      window.alert("Henüz ödül için uygun değilsin.");
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
      window.alert("Tebrikler! Ödül cüzdanına yattı!");
      if (publicKey) {
        const cleared: FitstakeUserPersistedState = {
          activeChallenge: null,
          completedChallenges: persisted?.completedChallenges ?? [],
        };
        persistReplace(cleared);
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
    publicKey,
    rewardUnlocked,
  ]);

  const isTxPending = txKind !== null;
  const stakeLabel =
    txKind === "stake" ? "Ağa İşleniyor…" : "Challenge'a Katıl (0.1 SOL Stake)";
  const claimLabel =
    txKind === "claim" ? "Ağa İşleniyor…" : "Ödülünü Çek";

  const claimDisabled =
    !rewardUnlocked ||
    activeChallengeId === null ||
    isTxPending ||
    (is30DayActive && !ac?.canClaim);

  const claimTitle =
    is30DayActive && !ac?.canClaim
      ? "30 günlük programı bitirip günlük hedefleri tamamladıktan sonra ödül çekilebilir."
      : !rewardUnlocked
        ? "Önce görevi tamamlayın."
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
            {publicKey && hydrated && persisted && (
              <ProfileDropdown
                completedChallenges={persisted.completedChallenges}
                totalCompleted={persisted.completedChallenges.length}
              />
            )}
            <WalletMultiButton className="!bg-slate-900 !font-medium !shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)] hover:!bg-slate-800" />
          </div>
        </header>
      )}

      <div
        className={`flex min-h-screen flex-col ${mounted && connected ? "pt-20" : ""}`}
      >
        {!connected && (
          <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
            <div className="max-w-lg text-center">
              <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                FitStake
              </h1>
              <p className="mt-4 text-lg text-slate-400">
                Stake et, hareket et, kazan. Web3 ile fitness challenge.
              </p>
              <div className="mt-12 flex justify-center">
                <WalletMultiButton className="!scale-110 !rounded-2xl !bg-gradient-to-r !from-cyan-600 !to-emerald-600 !px-8 !py-3 !font-semibold !shadow-[0_0_40px_-8px_rgba(34,211,238,0.55)] hover:!from-cyan-500 hover:!to-emerald-500" />
              </div>
            </div>
          </section>
        )}

        {connected && publicKey && (
          <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 pb-20 pt-6 sm:px-6">
            {!mounted || !hydrated || !persisted ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500 backdrop-blur-sm">
                Profil verileri yükleniyor…
              </div>
            ) : (
              <>
                <section className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                  <h2 className="text-lg font-semibold text-slate-100">
                    Profilim
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Veriler bu cihazda saklanır (localStorage).
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Toplam tamamlanan challenge
                      </p>
                      <p className="text-2xl font-bold text-cyan-300">
                        {persisted.completedChallenges.length}
                      </p>
                    </div>
                    {ac && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Aktif program
                        </p>
                        <p className="text-sm font-medium text-emerald-300/90">
                          {is30DayActive
                            ? `30 Günlük Dönüşüm — Gün ${ac.currentDay}/30`
                            : "Hızlı Demo"}
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
                            {new Date(c.completedAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {showChallengePicker && (
                  <section>
                    <h2 className="mb-4 text-center text-xl font-bold text-slate-100 sm:text-2xl">
                      Challenge seç
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
                          Anında
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-white">
                          Hızlı Demo (Anında Ödül)
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                          0.1 SOL stake, 5 tekrar, ardından hemen claim. MVP akışı.
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
                          Uzun vade
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-white">
                          30 Günlük Dönüşüm
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                          Her gün 10 squat hedefi, 30 gün boyunca. Ödül, 30 gün
                          tamamlanınca (UI kuralı). Stake: mevcut sözleşme{" "}
                          <strong className="text-slate-300">0.1 SOL</strong>{" "}
                          (kartta 0.5 SOL hedefli ürün vizyonu).
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
                          ? "Hızlı Demo — hazırlan"
                          : "30 Günlük — hazırlan"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setFlowSelection("pick")}
                        className="text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
                      >
                        Challenge listesine dön
                      </button>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Egzersiz seçimi"
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
                        Şınav
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

                {showActiveFlow && is30DayActive && completedToday30 && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-4 text-center text-emerald-200/95">
                    {ac.currentDay >= 30 && ac.canClaim
                      ? "30 günlük programı tamamladın. Aşağıdan ödülünü çekebilirsin."
                      : "Bugünün hedefini tamamladın. Yarın görüşürüz!"}
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
                      Bugünkü hedefi başlat (10 tekrar)
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
                        aria-label="Egzersiz seçimi"
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
                          Şınav
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChallengeActive(true)}
                        className="w-full rounded-2xl border border-cyan-500/40 bg-cyan-900/20 py-4 font-semibold text-cyan-200 transition hover:bg-cyan-900/35"
                      >
                        Antrenmanı sürdür
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
                        Şınav
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
                        Ödül: 30 gün tamamlandıktan sonra (şu an{" "}
                        {ac.currentDay}/30).
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
