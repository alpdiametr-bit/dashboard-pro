"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useT } from "@/components/I18nProvider";
import {
  Element3,
  Building,
  DocumentUpload,
  Clipboard,
  ShieldTick,
  ArrowLeft2,
  NotificationBing,
  Magicpen,
} from "iconsax-reactjs";
import { LogoMark } from "@/components/Logo";

const nav = [
  { href: "/dashboard", key: "nav.dashboard", icon: Element3 },
  { href: "/firmalar", key: "nav.firms", icon: Building },
  { href: "/signallar", key: "nav.alerts", icon: NotificationBing },
  { href: "/ai", key: "nav.ai", icon: Magicpen },
  { href: "/yuklash", key: "nav.upload", icon: DocumentUpload },
  { href: "/loglar", key: "nav.audit", icon: Clipboard },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem("dp_sidebar") === "1");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("dp_sidebar", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30 text-white bg-[var(--navy)]",
        mounted
          ? "transition-[width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
          : "",
        collapsed ? "w-[78px]" : "w-64",
      )}
    >
      {/* navy gradient + nozik yon yorug'lik — alohida overflow-hidden qatlam,
          shunda toggle tugmasi (chetdan tashqariga chiqadigan) kesilmaydi */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,#13203b 0%,#0f172a 55%,#0a1226 100%)",
          }}
        />
        <div
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "rgba(47,83,196,0.35)" }}
        />
        <div className="absolute right-0 top-0 h-full w-px bg-white/8" />
      </div>

      {/* Header */}
      <div
        className={cn(
          "relative flex items-center h-16 border-b border-white/8",
          collapsed ? "justify-center px-0" : "gap-2.5 px-5",
        )}
      >
        <LogoMark size={collapsed ? 34 : 36} />
        {!collapsed && (
          <div className="leading-tight overflow-hidden whitespace-nowrap">
            <div className="font-semibold tracking-tight text-[16px]">
              Dashboard <span className="text-[var(--gold-soft)]">Pro</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">
              {t("chrome.brandSub")}
            </div>
          </div>
        )}
      </div>

      {/* Toggle tugmasi (chetda suzib turadi) */}
      <button
        onClick={toggle}
        aria-label={collapsed ? t("chrome.open") : t("chrome.fold")}
        title={collapsed ? t("chrome.expand") : t("chrome.collapse")}
        className="absolute right-0 top-[58px] z-40 translate-x-1/2 grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)] shadow-[var(--shadow-md)] cursor-pointer transition-all duration-200 hover:text-[var(--trust-blue)] hover:ring-[var(--trust-blue)]/40"
      >
        <ArrowLeft2
          size={15}
          className={cn(
            "transition-transform duration-300",
            collapsed && "rotate-180",
          )}
        />
      </button>

      {/* Navigatsiya */}
      <nav className="relative flex-1 p-3 space-y-1">
        {!collapsed ? (
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
            {t("chrome.menu")}
          </p>
        ) : (
          <div className="h-3" />
        )}
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const label = t(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center h-11 rounded-[12px] text-sm transition-all duration-200",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                active
                  ? "bg-white/[0.1] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {/* faol holatda oltin indikator */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] transition-opacity duration-200",
                  active
                    ? "opacity-100 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                    : "opacity-0",
                )}
              />
              <span
                className={cn(
                  "grid place-items-center h-8 w-8 shrink-0 rounded-[10px] transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/55 group-hover:text-white",
                )}
              >
                <Icon size={19} variant={active ? "Bold" : "Outline"} />
              </span>
              {!collapsed && (
                <span className="overflow-hidden whitespace-nowrap">
                  {label}
                </span>
              )}

              {/* Collapsed holatda hover tooltip */}
              {collapsed && (
                <span className="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-[8px] bg-[var(--navy-deep)] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-[var(--shadow-lg)] ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-3 border-t border-white/8">
        <div
          className={cn(
            "flex items-center rounded-[12px] bg-white/[0.04] ring-1 ring-inset ring-white/5",
            collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2.5",
          )}
          title={collapsed ? t("chrome.secured") : undefined}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--gold-soft)] to-[var(--gold)] text-[var(--navy)]">
            <ShieldTick size={16} variant="Bold" />
          </span>
          {!collapsed && (
            <div className="leading-tight overflow-hidden whitespace-nowrap">
              <div className="text-[12px] text-white/80 font-medium">
                {t("chrome.secured")}
              </div>
              <div className="text-[10px] text-white/35">{t("chrome.securedSub")}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
