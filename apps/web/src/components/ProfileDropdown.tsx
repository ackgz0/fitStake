"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CompletedChallengeRecord } from "@/lib/fitstakeStorage";

type ProfileDropdownProps = {
  completedChallenges: CompletedChallengeRecord[];
  totalCompleted: number;
  trophyPoints: number;
};

export function ProfileDropdown({
  completedChallenges,
  totalCompleted,
  trophyPoints,
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 shadow-[0_0_20px_-4px_rgba(34,211,238,0.35)] backdrop-blur-md transition hover:border-cyan-400/50 hover:bg-slate-800/90"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="text-cyan-300">Profil</span>
        <svg
          className={`h-4 w-4 text-cyan-400/80 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
          role="dialog"
          aria-label="Tamamlanan challenge geçmişi"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Geçmiş başarılar
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-300">
            <span>
              🏆 <span className="font-bold text-amber-300">{trophyPoints}</span>
            </span>
            <span>
              Tamamlanan:{" "}
              <span className="font-bold text-cyan-300">{totalCompleted}</span>
            </span>
          </div>
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
            {completedChallenges.length === 0 ? (
              <li className="rounded-lg bg-slate-800/50 px-3 py-2 text-slate-500">
                Henüz kayıtlı challenge yok.
              </li>
            ) : (
              [...completedChallenges]
                .reverse()
                .map((c, i) => (
                  <li
                    key={`${c.completedAt}-${i}`}
                    className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2"
                  >
                    <span className="font-medium text-emerald-300/90">
                      {c.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {new Date(c.completedAt).toLocaleString()}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
