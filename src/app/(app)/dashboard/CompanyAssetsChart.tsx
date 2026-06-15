"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { CompanyWave } from "@/components/charts/Charts";
import { useT } from "@/components/I18nProvider";
import { Calendar, Calendar1, CalendarTick } from "iconsax-reactjs";

type Period = "daily" | "monthly" | "yearly";
type Point = Record<string, number | string>;

const UZ_MONTHS = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

/**
 * Firmalar bo'yicha aktivlar — to'lqin grafigi.
 * Davr bo'yicha guruhlash: kunlik / oylik / yillik (aktiv balans bo'lgani uchun
 * har davrda firmaning eng oxirgi qiymati olinadi).
 */
export function CompanyAssetsChart({
  series,
}: {
  series: { points: Point[]; firms: string[] };
}) {
  const [period, setPeriod] = useState<Period>("daily");
  const t = useT();

  const points = useMemo(
    () => aggregate(series.points, series.firms, period),
    [series.points, series.firms, period],
  );

  const options: { key: Period; label: string; icon: React.ReactNode }[] = [
    { key: "daily", label: t("period.daily"), icon: <Calendar size={15} /> },
    { key: "monthly", label: t("period.monthly"), icon: <Calendar1 size={15} /> },
    { key: "yearly", label: t("period.yearly"), icon: <CalendarTick size={15} /> },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex items-center gap-1 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)]/60 p-1">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setPeriod(o.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[9px] text-[12px] font-medium transition-all duration-200",
                period === o.key
                  ? "bg-gradient-to-b from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {o.icon}
              <span className="hidden sm:inline">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      <CompanyWave points={points} firms={series.firms} />
    </div>
  );
}

/**
 * Kunlik nuqtalarni davr bo'yicha guruhlash. Aktiv — balans (oxirgi qiymat),
 * shuning uchun har davrda firmaning eng so'nggi mavjud qiymati olinadi.
 */
function aggregate(points: Point[], firms: string[], period: Period): Point[] {
  if (period === "daily") return points;

  const keyOf = (iso: string) =>
    period === "monthly" ? iso.slice(0, 7) : iso.slice(0, 4);

  const labelOf = (iso: string) => {
    if (period === "monthly") {
      const [y, m] = iso.split("-");
      return `${UZ_MONTHS[Number(m) - 1]} ${y.slice(2)}`;
    }
    return iso.slice(0, 4);
  };

  // points sana bo'yicha o'sish tartibida — guruh ichida oxirgi qiymat g'olib
  const groups = new Map<string, Point>();
  for (const p of points) {
    const iso = String(p.date ?? "");
    if (!iso) continue;
    const k = keyOf(iso);
    if (!groups.has(k)) groups.set(k, { date: iso, label: labelOf(iso) });
    const g = groups.get(k)!;
    g.date = iso;
    for (const f of firms) {
      if (typeof p[f] === "number") g[f] = p[f];
    }
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, v]) => v);
}
