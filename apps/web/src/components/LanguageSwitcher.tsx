"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  const btn = (code: Locale, label: string) => (
    <button
      key={code}
      type="button"
      onClick={() => setLocale(code)}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
        locale === code
          ? "bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50"
          : "text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
      }`}
      aria-pressed={locale === code}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`flex items-center gap-0.5 rounded-xl border border-slate-700/60 bg-slate-900/60 p-0.5 backdrop-blur-sm ${className}`}
      role="group"
      aria-label="Language"
    >
      {btn("tr", t("langTr"))}
      {btn("en", t("langEn"))}
    </div>
  );
}
