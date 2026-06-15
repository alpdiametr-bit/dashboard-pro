"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useT } from "@/components/I18nProvider";
import { LogoMark } from "@/components/Logo";
import {
  Element3,
  Building,
  DocumentUpload,
  Clipboard,
  ShieldTick,
  HamburgerMenu,
  CloseCircle,
} from "iconsax-reactjs";

const nav = [
  { href: "/dashboard", key: "nav.dashboard", icon: Element3 },
  { href: "/firmalar", key: "nav.firms", icon: Building },
  { href: "/yuklash", key: "nav.upload", icon: DocumentUpload },
  { href: "/loglar", key: "nav.audit", icon: Clipboard },
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);

  // Yo'l o'zgarganda drawerni yopish
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Drawer ochilganda body scroll'ni bloklash
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger tugmasi — faqat mobil/planshetda */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t("chrome.menu")}
        className="lg:hidden grid place-items-center h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <HamburgerMenu size={20} />
      </button>

      {/* Overlay + drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* fon */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[dp-fade_180ms_ease-out]"
            onClick={() => setOpen(false)}
          />
          {/* panel */}
          <aside className="absolute left-0 top-0 h-full w-[270px] flex flex-col text-white bg-[var(--navy)] shadow-2xl animate-[dp-slide-in_240ms_cubic-bezier(.2,.7,.2,1)]">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden
            >
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
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between h-16 px-4 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <LogoMark size={34} />
                <div className="leading-tight">
                  <div className="font-semibold tracking-tight text-[15px]">
                    Dashboard{" "}
                    <span className="text-[var(--gold-soft)]">Pro</span>
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                    {t("chrome.brandSub")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("chrome.close")}
                className="grid place-items-center h-8 w-8 rounded-[9px] text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            {/* Navigatsiya */}
            <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                {t("chrome.menu")}
              </p>
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 h-11 px-3 rounded-[12px] text-sm transition-all duration-200",
                      active
                        ? "bg-white/[0.1] text-white font-medium"
                        : "text-white/60 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span
                      className={cn(
                        "grid place-items-center h-8 w-8 rounded-[10px]",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/55 group-hover:text-white",
                      )}
                    >
                      <Icon size={19} variant={active ? "Bold" : "Outline"} />
                    </span>
                    {t(item.key)}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="relative p-3 border-t border-white/8">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] bg-white/[0.04] ring-1 ring-inset ring-white/5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--gold-soft)] to-[var(--gold)] text-[var(--navy)]">
                  <ShieldTick size={16} variant="Bold" />
                </span>
                <div className="leading-tight">
                  <div className="text-[12px] text-white/80 font-medium">
                    {t("chrome.secured")}
                  </div>
                  <div className="text-[10px] text-white/35">
                    {t("chrome.securedSub")}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
