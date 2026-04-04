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

import fitstakeVaultIdl from "@/idl/fitstake_vault.json";
import type { SquatTrackerProps } from "@/components/SquatTracker";

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

function truncatePublicKey(base58: string): string {
  if (base58.length <= 8) return base58;
  return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
}

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

export default function Home() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [exerciseType, setExerciseType] = useState<"squat" | "pushup">("squat");
  const [activeChallengeId, setActiveChallengeId] = useState<BN | null>(null);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);
  const [txKind, setTxKind] = useState<null | "stake" | "claim">(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });

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

  const handleChallengeComplete = useCallback(() => {
    window.alert("Tebrikler! Görevi tamamladın.");
    setIsChallengeActive(false);
    setRewardUnlocked(true);
  }, []);

  const handleStake = useCallback(async () => {
    if (!anchorWallet) {
      window.alert("Cüzdan bağlı değil.");
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
      setActiveChallengeId(newChallengeId);
      setIsChallengeActive(true);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTxKind(null);
    }
  }, [anchorWallet, getProgram]);

  const handleClaim = useCallback(async () => {
    if (!anchorWallet) {
      window.alert("Cüzdan bağlı değil.");
      return;
    }
    if (!activeChallengeId) {
      window.alert("Aktif challenge kimliği yok. Önce stake yapın.");
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
      setRewardUnlocked(false);
      setActiveChallengeId(null);
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 4500);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTxKind(null);
    }
  }, [anchorWallet, activeChallengeId, getProgram]);

  const isTxPending = txKind !== null;
  const stakeLabel =
    txKind === "stake" ? "Ağa İşleniyor…" : "Challenge'a Katıl (0.1 SOL Stake)";
  const claimLabel =
    txKind === "claim" ? "Ağa İşleniyor…" : "Ödülünü Çek (Önce görevi tamamla)";

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 relative">
      {showConfetti && confettiSize.width > 0 && (
        <Confetti
          width={confettiSize.width}
          height={confettiSize.height}
          recycle={false}
          numberOfPieces={220}
          className="!fixed !inset-0 !pointer-events-none z-50"
        />
      )}
      <header className="w-full max-w-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
          FitStake
        </h1>
        <WalletMultiButton />
      </header>

      {connected && publicKey && (
        <section className="w-full max-w-2xl">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              Dashboard
            </h2>
            <p className="text-sm text-slate-400 mb-1">Bağlı cüzdan</p>
            <p className="font-mono text-emerald-400/90 text-sm sm:text-base break-all mb-6">
              {truncatePublicKey(publicKey.toBase58())}
            </p>

            {isChallengeActive ? (
              <SquatTracker
                exerciseType={exerciseType}
                onChallengeComplete={handleChallengeComplete}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Egzersiz seçimi">
                  <button
                    type="button"
                    onClick={() => setExerciseType("squat")}
                    className={`rounded-xl font-medium py-2 px-4 transition-colors ${
                      exerciseType === "squat"
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400/80"
                        : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/80"
                    }`}
                  >
                    Squat
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseType("pushup")}
                    className={`rounded-xl font-medium py-2 px-4 transition-colors ${
                      exerciseType === "pushup"
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400/80"
                        : "border border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/80"
                    }`}
                  >
                    Şınav
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleStake}
                    disabled={isTxPending}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {stakeLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={
                      !rewardUnlocked || activeChallengeId === null || isTxPending
                    }
                    className="rounded-xl border border-slate-600 bg-slate-800/50 font-medium py-3 px-4 disabled:text-slate-500 disabled:cursor-not-allowed enabled:text-emerald-300 enabled:hover:bg-slate-700/80 enabled:border-emerald-700/50 transition-colors"
                  >
                    {claimLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
