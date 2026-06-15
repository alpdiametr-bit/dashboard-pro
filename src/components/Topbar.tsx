"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutCurve } from "iconsax-reactjs";

function titleFromPath(path: string): string {
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/firmalar")) return "Firmalar";
  if (path.startsWith("/yuklash")) return "Hisobot yuklash";
  return "Dashboard Pro";
}

export function Topbar({ adminName }: { adminName: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const title = titleFromPath(pathname);

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
    <header className="sticky top-0 z-20 h-14 flex items-center justify-between gap-4 px-5 bg-[var(--surface)]/80 backdrop-blur border-b border-[var(--border)]">
      <h1 className="text-[15px] font-semibold text-[var(--text)] truncate">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <div className="grid place-items-center h-9 w-9 rounded-full bg-[var(--trust-blue)] text-white text-[12px] font-semibold">
            {initials}
          </div>
          <span className="hidden sm:block text-sm text-[var(--text)]">
            {adminName ?? "Admin"}
          </span>
        </div>
        <button
          onClick={logout}
          disabled={loading}
          className="grid place-items-center h-9 w-9 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--loss)]/10 hover:text-[var(--loss)] transition-colors"
          aria-label="Chiqish"
          title="Chiqish"
        >
          <LogoutCurve size={18} />
        </button>
      </div>
    </header>
  );
}
