"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useT } from "@/components/I18nProvider";
import { LogoutCurve } from "iconsax-reactjs";

function titleKeyFromPath(path: string): string {
  if (path.startsWith("/dashboard")) return "nav.dashboard";
  if (path.startsWith("/firmalar")) return "nav.firms";
  if (path.startsWith("/yuklash")) return "nav.upload";
  if (path.startsWith("/loglar")) return "nav.audit";
  return "nav.dashboard";
}

export function Topbar({ adminName }: { adminName: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const title = t(titleKeyFromPath(pathname));

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = (adminName || "A")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-4 px-5 glass border-b border-[var(--border)]">
      <div className="flex items-center gap-3 min-w-0">
        <MobileNav />
        <div className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)]" />
        <div className="leading-tight min-w-0">
          <h1 className="text-[16px] font-semibold tracking-tight text-[var(--text)] truncate">
            {title}
          </h1>
          <p className="hidden sm:block text-[11px] text-[var(--text-muted)]">
            {t("top.subtitle")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="hidden sm:block h-7 w-px bg-[var(--border)]" />
        <div className="flex items-center gap-2.5 rounded-full bg-[var(--surface-2)]/60 pl-1 pr-3 py-1 ring-1 ring-inset ring-[var(--border)]">
          <div className="grid place-items-center h-8 w-8 rounded-full bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white text-[12px] font-semibold ring-1 ring-white/15">
            {initials}
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-[13px] font-medium text-[var(--text)]">
              {adminName ?? "Admin"}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {t("top.admin")}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loading}
          className="grid place-items-center h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--loss)]/10 hover:text-[var(--loss)] hover:border-[var(--loss)]/30 transition-colors"
          aria-label={t("top.logout")}
          title={t("top.logout")}
        >
          <LogoutCurve size={18} />
        </button>
      </div>
    </header>
  );
}
