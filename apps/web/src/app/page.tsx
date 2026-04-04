"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const SquatTracker = dynamic(
  () =>
    import("@/components/SquatTracker").then((m) => ({
      default: m.SquatTracker,
    })),
  { ssr: false, loading: () => <p className="text-slate-400 text-sm">Yükleniyor…</p> },
);

function truncatePublicKey(base58: string): string {
  if (base58.length <= 8) return base58;
  return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
}

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [isChallengeActive, setIsChallengeActive] = useState(false);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);

  const handleChallengeComplete = useCallback(() => {
    window.alert("Tebrikler! Görevi tamamladın.");
    setIsChallengeActive(false);
    setRewardUnlocked(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12">
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
              <SquatTracker onChallengeComplete={handleChallengeComplete} />
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsChallengeActive(true)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  Challenge&apos;a Katıl (0.1 SOL Stake)
                </button>
                <button
                  type="button"
                  disabled={!rewardUnlocked}
                  className="rounded-xl border border-slate-600 bg-slate-800/50 font-medium py-3 px-4 disabled:text-slate-500 disabled:cursor-not-allowed enabled:text-emerald-300 enabled:hover:bg-slate-700/80 enabled:border-emerald-700/50 transition-colors"
                >
                  Ödülünü Çek (Önce görevi tamamla)
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
