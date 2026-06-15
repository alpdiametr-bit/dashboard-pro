import { Card } from "./Card";
import { cn } from "@/lib/cn";
import { ArrowUp, ArrowDown } from "iconsax-reactjs";

type Trend = "up" | "down" | "neutral";
type Tone = "profit" | "loss" | "warning" | "info";

const toneStyles: Record<
  Tone,
  { chip: string; glow: string; bar: string }
> = {
  profit: {
    chip: "from-[var(--profit)] to-[var(--profit-bright,#22c55e)]",
    glow: "rgba(22,163,74,0.22)",
    bar: "var(--profit)",
  },
  loss: {
    chip: "from-[var(--loss)] to-[var(--loss-bright,#ef4444)]",
    glow: "rgba(225,29,72,0.22)",
    bar: "var(--loss)",
  },
  warning: {
    chip: "from-[var(--gold-soft)] to-[var(--gold)]",
    glow: "rgba(202,138,4,0.22)",
    bar: "var(--gold)",
  },
  info: {
    chip: "from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)]",
    glow: "rgba(30,58,138,0.22)",
    bar: "var(--trust-blue)",
  },
};

// Dekorativ mini sparkline (default shakl)
const DEFAULT_SPARK = [0.4, 0.55, 0.45, 0.7, 0.6, 0.82, 0.75, 1];

export function KpiCard({
  label,
  value,
  hint,
  trend = "neutral",
  trendValue,
  icon,
  tone = "info",
  spark,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: Trend;
  trendValue?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  spark?: number[];
}) {
  const t = toneStyles[tone];
  const bars = spark && spark.length ? spark : DEFAULT_SPARK;
  const trendColor =
    trend === "up"
      ? "text-[var(--profit)]"
      : trend === "down"
        ? "text-[var(--loss)]"
        : "text-[var(--text-muted)]";

  return (
    <Card className="lift sheen group relative overflow-hidden p-5">
      {/* tone yorug'ligi (yuqori o'ngda) */}
      <div
        className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: t.glow }}
      />

      {/* yuqori qator: ikon + trend */}
      <div className="relative flex items-start justify-between gap-3">
        {icon && (
          <div
            className={cn(
              "shrink-0 grid place-items-center h-11 w-11 rounded-[14px] text-white bg-gradient-to-br shadow-[var(--shadow-sm)] ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3",
              t.chip,
            )}
          >
            {icon}
          </div>
        )}
        {trendValue ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold tnum ring-1 ring-inset",
              trend === "up"
                ? "bg-[var(--profit)]/12 ring-[var(--profit)]/20"
                : trend === "down"
                  ? "bg-[var(--loss)]/12 ring-[var(--loss)]/20"
                  : "bg-[var(--surface-2)] ring-[var(--border)]",
              trendColor,
            )}
          >
            {trend === "up" && <ArrowUp size={12} />}
            {trend === "down" && <ArrowDown size={12} />}
            {trendValue}
          </span>
        ) : (
          // dekorativ mini sparkline
          <div className="flex items-end gap-[3px] h-9 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
            {bars.map((h, i) => (
              <span
                key={i}
                className="w-[4px] rounded-full"
                style={{
                  height: `${Math.max(0.18, h) * 100}%`,
                  background: t.bar,
                  opacity: 0.35 + (i / bars.length) * 0.65,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* qiymat + label */}
      <div className="relative mt-4">
        <p className="text-[28px] leading-none font-bold tracking-tight tnum text-[var(--text)]">
          {value}
        </p>
        <p className="mt-2 text-[12.5px] font-medium text-[var(--text-muted)] truncate">
          {label}
          {hint && (
            <span className="text-[var(--text-soft)]"> · {hint}</span>
          )}
        </p>
      </div>
    </Card>
  );
}

