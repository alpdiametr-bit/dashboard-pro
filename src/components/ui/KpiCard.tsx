import { Card } from "./Card";
import { cn } from "@/lib/cn";

type Trend = "up" | "down" | "neutral";

export function KpiCard({
  label,
  value,
  hint,
  trend = "neutral",
  trendValue,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: Trend;
  trendValue?: string;
  icon?: React.ReactNode;
  tone?: "profit" | "loss" | "warning" | "info";
}) {
  const trendColor =
    trend === "up"
      ? "text-[var(--profit)]"
      : trend === "down"
        ? "text-[var(--loss)]"
        : "text-[var(--text-muted)]";

  const toneBar =
    tone === "profit"
      ? "before:bg-[var(--profit)]"
      : tone === "loss"
        ? "before:bg-[var(--loss)]"
        : tone === "warning"
          ? "before:bg-[var(--warning)]"
          : "before:bg-[var(--trust-blue)]";

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
        toneBar,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--text-muted)] truncate">
            {label}
          </p>
          <p className="mt-2 text-[26px] leading-tight font-semibold tnum text-[var(--text)]">
            {value}
          </p>
        </div>
        {icon && (
          <div className="shrink-0 grid place-items-center h-10 w-10 rounded-[10px] bg-[var(--surface-2)] text-[var(--trust-blue)]">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px]">
        {trendValue && (
          <span className={cn("font-medium tnum", trendColor)}>{trendValue}</span>
        )}
        {hint && <span className="text-[var(--text-muted)] truncate">{hint}</span>}
      </div>
    </Card>
  );
}
