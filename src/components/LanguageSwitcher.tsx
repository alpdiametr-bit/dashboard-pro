"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useLang, useT } from "@/components/I18nProvider";
import { ArrowDown2, TickCircle } from "iconsax-reactjs";

type Lang = { code: string; label: string; short: string; flag: React.ReactNode };

// Bayroqlar — ixcham SVG (tashqi rasm/yuklamasiz)
const FlagUZ = (
  <svg viewBox="0 0 24 16" className="h-3.5 w-5 rounded-[2px]" aria-hidden>
    <rect width="24" height="16" rx="1.5" fill="#1EB53A" />
    <rect width="24" height="11" rx="1.5" fill="#fff" />
    <rect width="24" height="5.4" rx="1.5" fill="#0099B5" />
    <rect y="5" width="24" height="0.6" fill="#CE1126" />
    <rect y="10.4" width="24" height="0.6" fill="#CE1126" />
    <circle cx="4.2" cy="2.8" r="1.6" fill="#fff" />
    <circle cx="4.9" cy="2.8" r="1.6" fill="#0099B5" />
  </svg>
);
const FlagRU = (
  <svg viewBox="0 0 24 16" className="h-3.5 w-5 rounded-[2px]" aria-hidden>
    <rect width="24" height="16" rx="1.5" fill="#fff" />
    <rect y="5.33" width="24" height="5.33" fill="#0039A6" />
    <rect y="10.66" width="24" height="5.34" fill="#D52B1E" />
  </svg>
);
const FlagEN = (
  <svg viewBox="0 0 24 16" className="h-3.5 w-5 rounded-[2px]" aria-hidden>
    <rect width="24" height="16" rx="1.5" fill="#012169" />
    <path d="M0 0L24 16M24 0L0 16" stroke="#fff" strokeWidth="3" />
    <path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.5" />
    <path d="M12 0V16M0 8H24" stroke="#fff" strokeWidth="4" />
    <path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth="2" />
  </svg>
);

const LANGS: Lang[] = [
  { code: "uz", label: "O'zbekcha", short: "UZ", flag: FlagUZ },
  { code: "ru", label: "Русский", short: "RU", flag: FlagRU },
  { code: "en", label: "English", short: "EN", flag: FlagEN },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(code: string) {
    if (code === lang) {
      setOpen(false);
      return;
    }
    try {
      // 1 yil amal qiladigan cookie — server ham shu tilni o'qiydi
      document.cookie = `dp_lang=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      localStorage.setItem("dp_lang", code);
      document.documentElement.lang = code;
    } catch {}
    setOpen(false);
    // Server komponentlar yangi tilda render bo'lishi uchun to'liq qayta yuklash
    window.location.reload();
  }

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("top.lang")}
        className={cn(
          "flex items-center gap-1.5 h-9 px-2.5 rounded-[10px] border bg-[var(--surface)] cursor-pointer transition-colors",
          open
            ? "border-[var(--trust-blue)] ring-3 ring-[var(--ring)]"
            : "border-[var(--border)] hover:bg-[var(--surface-2)]",
        )}
      >
        {current.flag}
        <span className="text-[12px] font-semibold text-[var(--text)]">
          {current.short}
        </span>
        <ArrowDown2
          size={13}
          className={cn(
            "text-[var(--text-muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-[180px] rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-lg)] animate-[dropdown_120ms_ease-out]">
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-left cursor-pointer transition-colors",
                  active
                    ? "bg-[var(--trust-blue)]/10"
                    : "hover:bg-[var(--surface-2)]",
                )}
              >
                {l.flag}
                <span
                  className={cn(
                    "flex-1 text-[13px]",
                    active
                      ? "text-[var(--trust-blue)] font-medium"
                      : "text-[var(--text)]",
                  )}
                >
                  {l.label}
                </span>
                {active && (
                  <TickCircle
                    size={16}
                    variant="Bold"
                    className="text-[var(--trust-blue)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
