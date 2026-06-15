"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  ArrowLeft2,
  ArrowRight2,
  Calendar,
  TickCircle,
  Clock,
  Star1,
} from "iconsax-reactjs";

type Rep = {
  id: number;
  date: string; // ISO
  status: string;
  isPinned: boolean;
};

const WD = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];
const MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
/** Dushanba = 0 bo'ladigan hafta kuni indeksi */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function ReportCalendar({
  reports,
  base,
  selectedId,
}: {
  reports: Rep[];
  base: string;
  selectedId: number;
}) {
  const router = useRouter();

  // "yyyy-mm-dd" -> report
  const byDay = useMemo(() => {
    const map = new Map<string, Rep>();
    for (const r of reports) {
      const d = new Date(r.date);
      map.set(dayKey(d.getFullYear(), d.getMonth(), d.getDate()), r);
    }
    return map;
  }, [reports]);

  // "yyyy-mm" -> hisobotlar soni (har oyda qancha data)
  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports) {
      const d = new Date(r.date);
      const k = monthKey(d.getFullYear(), d.getMonth());
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [reports]);

  // Yillar -> oylar (chap panel: har oyda qancha data)
  const yearGroups = useMemo(() => {
    const years = new Map<number, { m: number; count: number }[]>();
    for (const [k, count] of byMonth) {
      const [y, m] = k.split("-").map(Number);
      if (!years.has(y)) years.set(y, []);
      years.get(y)!.push({ m: m - 1, count });
    }
    return [...years.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, months]) => ({
        y,
        months: months.sort((a, b) => b.m - a.m),
        total: months.reduce((s, x) => s + x.count, 0),
      }));
  }, [byMonth]);

  const selectedDate = useMemo(() => {
    const sel = reports.find((r) => r.id === selectedId);
    return sel ? new Date(sel.date) : new Date();
  }, [reports, selectedId]);

  const [view, setView] = useState(() => ({
    y: selectedDate.getFullYear(),
    m: selectedDate.getMonth(),
  }));

  const today = new Date();
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());

  const monthGrid = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = mondayIndex(first);
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const cells: ({ day: number; key: string } | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ day: d, key: dayKey(view.y, view.m, d) });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const monthCount = byMonth.get(monthKey(view.y, view.m)) ?? 0;
  const totalReports = reports.length;

  function shift(delta: number) {
    setView((v) => {
      const idx = v.y * 12 + v.m + delta;
      return { y: Math.floor(idx / 12), m: ((idx % 12) + 12) % 12 };
    });
  }

  function open(r: Rep) {
    const sp = new URLSearchParams();
    sp.set("report", String(r.id));
    sp.set("tab", "umumiy");
    router.replace(`${base}?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-4">
      {/* CHAP: oylar bo'yicha (har oyda qancha data) */}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] overflow-hidden h-fit">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[var(--text)]">
            Oylar bo&apos;yicha
          </span>
          <span className="text-[11px] text-[var(--text-muted)] tnum">
            {totalReports} ta jami
          </span>
        </div>
        <div className="max-h-[440px] overflow-y-auto p-2 space-y-3">
          {yearGroups.map((g) => (
            <div key={g.y}>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[12px] font-bold text-[var(--text)] tnum">
                  {g.y}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] tnum">
                  {g.total} ta
                </span>
              </div>
              <div className="space-y-0.5">
                {g.months.map(({ m, count }) => {
                  const active = view.y === g.y && view.m === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setView({ y: g.y, m })}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[9px] cursor-pointer transition-colors",
                        active
                          ? "bg-[var(--trust-blue)]/10"
                          : "hover:bg-[var(--surface-2)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid place-items-center h-7 w-7 rounded-[8px] text-[11px] font-semibold shrink-0",
                          active
                            ? "bg-[var(--trust-blue)] text-white"
                            : "bg-[var(--surface-2)] text-[var(--text-muted)]",
                        )}
                      >
                        {MONTHS_SHORT[m]}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-left text-[13px]",
                          active
                            ? "text-[var(--trust-blue)] font-medium"
                            : "text-[var(--text)]",
                        )}
                      >
                        {MONTHS[m]}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="hidden sm:flex items-center gap-0.5">
                          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                "h-3.5 w-1 rounded-full",
                                active
                                  ? "bg-[var(--trust-blue)]"
                                  : "bg-[var(--trust-blue)]/40",
                              )}
                            />
                          ))}
                        </span>
                        <span
                          className={cn(
                            "min-w-[22px] text-center text-[11px] font-semibold tnum px-1.5 py-0.5 rounded-full",
                            active
                              ? "bg-[var(--trust-blue)] text-white"
                              : "bg-[var(--surface-2)] text-[var(--text-muted)]",
                          )}
                        >
                          {count}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {yearGroups.length === 0 && (
            <p className="text-center text-[13px] text-[var(--text-muted)] py-6">
              Hisobot yo&apos;q
            </p>
          )}
        </div>
      </div>

      {/* O'NG: tanlangan oy kunlik grid */}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] overflow-hidden h-fit">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface-2)]/60 to-transparent">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-9 w-9 rounded-[10px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)]">
              <Calendar size={18} variant="Bold" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--text)] leading-tight">
                {MONTHS[view.m]} {view.y}
              </h3>
              <p className="text-[12px] text-[var(--text-muted)]">
                {monthCount > 0 ? `${monthCount} ta hisobot` : "hisobot yo'q"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => shift(-1)}
              title="Oldingi oy"
              className="grid place-items-center h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
            >
              <ArrowLeft2 size={16} />
            </button>
            <button
              onClick={() => setView({ y: today.getFullYear(), m: today.getMonth() })}
              title="Joriy oyga"
              className="h-9 px-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] cursor-pointer transition-colors"
            >
              Bugun
            </button>
            <button
              onClick={() => shift(1)}
              title="Keyingi oy"
              className="grid place-items-center h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
            >
              <ArrowRight2 size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WD.map((w, i) => (
              <div
                key={w}
                className={cn(
                  "text-center text-[11px] font-semibold uppercase tracking-wide py-1",
                  i >= 5 ? "text-[var(--loss)]/70" : "text-[var(--text-muted)]",
                )}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthGrid.map((cell, i) => {
              if (!cell) return <div key={`e${i}`} />;
              const rep = byDay.get(cell.key);
              const isToday = cell.key === todayKey;
              const isSelected = rep?.id === selectedId;

              if (rep) {
                const confirmed = rep.status === "CONFIRMED";
                return (
                  <button
                    key={cell.key}
                    onClick={() => open(rep)}
                    title={`${cell.day}-${MONTHS[view.m]} · ${confirmed ? "Tasdiqlangan" : "Kutilmoqda"}`}
                    className={cn(
                      "relative aspect-square rounded-[10px] flex flex-col items-center justify-center gap-0.5 text-[13px] font-semibold cursor-pointer transition-all duration-150 border",
                      confirmed
                        ? "bg-[var(--profit)]/12 text-[var(--profit)] border-[var(--profit)]/25 hover:bg-[var(--profit)]/20"
                        : "bg-[var(--warning)]/12 text-[var(--warning)] border-[var(--warning)]/25 hover:bg-[var(--warning)]/20",
                      isSelected &&
                        "ring-2 ring-[var(--trust-blue)] ring-offset-1 ring-offset-[var(--surface)]",
                    )}
                  >
                    <span>{cell.day}</span>
                    {confirmed ? (
                      <TickCircle size={12} variant="Bold" />
                    ) : (
                      <Clock size={12} variant="Bold" />
                    )}
                    {rep.isPinned && (
                      <span className="absolute -top-1 -right-1 grid place-items-center h-4 w-4 rounded-full bg-[var(--gold)] text-white">
                        <Star1 size={9} variant="Bold" />
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <div
                  key={cell.key}
                  className={cn(
                    "aspect-square rounded-[10px] flex items-center justify-center text-[13px] text-[var(--text-muted)]/50",
                    isToday &&
                      "ring-1 ring-[var(--trust-blue)]/40 text-[var(--trust-blue)] font-medium",
                  )}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>

          {/* Izoh (legend) */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] bg-[var(--profit)]/25 border border-[var(--profit)]/40" />
              Tasdiqlangan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] bg-[var(--warning)]/25 border border-[var(--warning)]/40" />
              Kutilmoqda
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star1 size={12} className="text-[var(--gold)]" variant="Bold" /> Qadalgan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
