"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

/**
 * Analitika uslubidagi splash (yuklash) ekrani.
 * Ilova ochilganda bir marta ko'rsatiladi, so'ng o'chib (fade) yo'qoladi.
 * Sessiya davomida qayta chiqmasligi uchun sessionStorage'da belgilanadi.
 */
export function Splash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Splash to'liq sahifa yuklanganda bir marta ko'rinadi (layout faqat
    // shu paytda qayta o'rnatiladi). Belgilangan vaqtdan so'ng so'nadi.
    const hold = setTimeout(() => setLeaving(true), 1150);
    const done = setTimeout(() => setVisible(false), 1650);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, []);

  if (!visible) return null;

  const bars = [0.45, 0.7, 0.5, 0.95, 0.6, 0.85, 0.55, 0.75];

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #16285f 0%, #0f172a 45%, #070d1c 100%)",
        animation: leaving ? "dp-splash-out 0.55s ease forwards" : undefined,
      }}
      aria-hidden="true"
    >
      {/* nozik grid teksturasi */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(60% 60% at 50% 45%, #000 30%, transparent 75%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        {/* Brend belgisi — halo + aylanuvchi halqa */}
        <div className="relative grid place-items-center">
          <div
            className="absolute h-32 w-32 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(234,179,8,0.35), transparent 65%)",
              animation: "dp-halo 2.4s ease-in-out infinite",
            }}
          />
          <div
            className="absolute h-24 w-24 rounded-full border border-transparent"
            style={{
              borderTopColor: "rgba(234,179,8,0.8)",
              borderRightColor: "rgba(47,83,196,0.5)",
              animation: "dp-ring-spin 2.6s linear infinite",
            }}
          />
          <div style={{ animation: "dp-pop 0.7s cubic-bezier(.2,.7,.2,1) both" }}>
            <LogoMark size={72} />
          </div>
        </div>

        {/* Analitika ustunlari */}
        <div className="flex items-end gap-1.5 h-12">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-2 rounded-full origin-bottom"
              style={{
                height: `${h * 100}%`,
                background:
                  i % 3 === 0
                    ? "linear-gradient(180deg,#facc15,#ca8a04)"
                    : "rgba(255,255,255,0.65)",
                animation: `dp-bar-rise 1.2s ${i * 0.08}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Brend matni */}
        <div
          className="text-center"
          style={{ animation: "dp-fade-up 0.6s 0.18s both" }}
        >
          <div className="text-white text-[22px] font-semibold tracking-tight">
            Dashboard <span className="text-[var(--gold-soft)]">Pro</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 mt-1.5">
            MFO Analytics
          </div>
        </div>

        {/* Yuklash chizig'i */}
        <div className="w-52 h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full w-1/2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg,transparent,#facc15,#eab308,transparent)",
              animation: "dp-track 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
