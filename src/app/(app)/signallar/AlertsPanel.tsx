"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatCompact, formatMoney, weekday } from "@/lib/format";
import type { Alert, AlertsResult, AlertMetricKey } from "@/lib/alerts";
import {
  NotificationBing,
  ArrowUp,
  ArrowDown,
  Buildings2,
  Refresh2,
  Danger,
  TickCircle,
  Chart21,
  Wallet3,
  MoneyRecive,
  EmptyWallet,
  Coin1,
} from "iconsax-reactjs";

const METRIC_ICON: Record<AlertMetricKey, typeof Chart21> = {
  assets: Chart21,
  capital: Coin1,
  loans: Wallet3,
  netProfit: MoneyRecive,
  overdue: EmptyWallet,
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
    d.getUTCMonth() + 1,
  ).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

export function AlertsPanel({ initial }: { initial: AlertsResult }) {
  const [threshold, setThreshold] = useState(initial.threshold);
  const [data, setData] = useState<AlertsResult>(initial);
  const [loading, setLoading] = useState(false);
  const [metricFilter, setMetricFilter] = useState<AlertMetricKey | "all">(
    "all",
  );
  const [onlyNegative, setOnlyNegative] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ostona o'zgarganda (debounce bilan) server'dan qayta hisoblash
  useEffect(() => {
    if (threshold === data.threshold) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      let active = true;
      setLoading(true);
      (async () => {
        try {
          const res = await fetch(`/api/alerts?threshold=${threshold}`, {
            cache: "no-store",
          });
          const json = (await res.json()) as AlertsResult;
          if (active) setData(json);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const filtered = useMemo(() => {
    return data.alerts.filter((a) => {
      if (metricFilter !== "all" && a.metric !== metricFilter) return false;
      if (onlyNegative && a.positive) return false;
      return true;
    });
  }, [data.alerts, metricFilter, onlyNegative]);

  const stats = useMemo(() => {
    const high = data.alerts.filter((a) => a.severity === "high").length;
    const negative = data.alerts.filter((a) => !a.positive).length;
    const companies = new Set(data.alerts.map((a) => a.companyId)).size;
    return { total: data.alerts.length, high, negative, companies };
  }, [data.alerts]);

  const metricCounts = useMemo(() => {
    const m = new Map<AlertMetricKey, number>();
    for (const a of data.alerts) m.set(a.metric, (m.get(a.metric) ?? 0) + 1);
    return m;
  }, [data.alerts]);

  return (
    <div className="space-y-5">
      {/* KPI lar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<NotificationBing size={18} variant="Bold" />}
          tone="info"
          label="Jami signallar"
          value={String(stats.total)}
        />
        <StatTile
          icon={<Danger size={18} variant="Bold" />}
          tone="loss"
          label="Yuqori darajali"
          value={String(stats.high)}
        />
        <StatTile
          icon={<ArrowDown size={18} variant="Bold" />}
          tone="warning"
          label="Salbiy o'zgarish"
          value={String(stats.negative)}
        />
        <StatTile
          icon={<Buildings2 size={18} variant="Bold" />}
          tone="neutral"
          label="Firmalar"
          value={String(stats.companies)}
        />
      </div>

      {/* Boshqaruv paneli — ostona slider + filtrlar */}
      <Card className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Slider */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-[13px] font-medium text-[var(--text)]">
                Sezgirlik ostonasi
              </label>
              <span className="inline-flex items-center gap-2">
                <span className="rounded-[8px] bg-[var(--trust-blue)]/10 px-2.5 py-1 text-[13px] font-semibold text-[var(--trust-blue)]">
                  {threshold.toFixed(1)}%
                </span>
                {loading && (
                  <Refresh2
                    size={15}
                    className="animate-spin text-[var(--text-muted)]"
                  />
                )}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={0.5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="dp-range w-full"
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-[var(--text-muted)]">
              <span>1%</span>
              <span>{"Kunlik o'zgarish shu foizdan oshsa — signal"}</span>
              <span>50%</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[3, 5, 10, 20].map((p) => (
                <button
                  key={p}
                  onClick={() => setThreshold(p)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset transition-colors",
                    threshold === p
                      ? "bg-[var(--trust-blue)] text-white ring-[var(--trust-blue)]"
                      : "bg-[var(--surface-2)] text-[var(--text-muted)] ring-[var(--border)] hover:text-[var(--text)]",
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Salbiy toggle */}
          <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5">
            <input
              type="checkbox"
              checked={onlyNegative}
              onChange={(e) => setOnlyNegative(e.target.checked)}
              className="dp-check"
            />
            <span className="text-[13px] font-medium text-[var(--text)]">
              Faqat salbiy (xavfli)
            </span>
          </label>
        </div>

        {/* Metrika filtri */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-4">
          <FilterChip
            active={metricFilter === "all"}
            onClick={() => setMetricFilter("all")}
            label="Barchasi"
            count={data.alerts.length}
          />
          {(
            [
              ["assets", "Aktivlar"],
              ["capital", "Kapital"],
              ["loans", "Kreditlar"],
              ["netProfit", "Sof foyda"],
              ["overdue", "Muddati o'tgan"],
            ] as [AlertMetricKey, string][]
          ).map(([key, label]) => (
            <FilterChip
              key={key}
              active={metricFilter === key}
              onClick={() => setMetricFilter(key)}
              label={label}
              count={metricCounts.get(key) ?? 0}
            />
          ))}
        </div>
      </Card>

      {/* Signallar ro'yxati */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--profit)]/10 text-[var(--profit)]">
            <TickCircle size={28} variant="Bold" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-[var(--text)]">
              {"Signal yo'q"}
            </p>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {threshold.toFixed(1)}%{" ostonasidan oshgan kunlik o'zgarish topilmadi."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "info" | "loss" | "warning" | "neutral";
}) {
  const toneCls: Record<string, string> = {
    info: "bg-[var(--trust-blue)]/10 text-[var(--trust-blue)]",
    loss: "bg-[var(--loss)]/10 text-[var(--loss)]",
    warning: "bg-[var(--gold)]/12 text-[var(--gold)]",
    neutral: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={cn("grid h-10 w-10 place-items-center rounded-[12px]", toneCls[tone])}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[20px] font-semibold leading-none text-[var(--text)]">
          {value}
        </div>
        <div className="mt-1 truncate text-[12px] text-[var(--text-muted)]">
          {label}
        </div>
      </div>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-inset transition-colors",
        active
          ? "bg-[var(--trust-blue)] text-white ring-[var(--trust-blue)]"
          : "bg-[var(--surface)] text-[var(--text-muted)] ring-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[11px]",
          active ? "bg-white/20" : "bg-[var(--surface-2)]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function AlertRow({ alert: a }: { alert: Alert }) {
  const Icon = METRIC_ICON[a.metric];
  const up = a.direction === "up";
  const toneVar = a.positive ? "--profit" : "--loss";
  return (
    <Card className="lift flex items-center gap-3.5 p-4">
      {/* Metrika ikon */}
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-[12px]",
          `bg-[var(${toneVar})]/10 text-[var(${toneVar})]`,
        )}
      >
        <Icon size={20} variant="Bold" />
      </span>

      {/* Asosiy matn */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[14px] font-semibold text-[var(--text)]">
            {a.companyName}
          </span>
          <Badge tone={a.positive ? "profit" : "loss"}>{a.metricLabel}</Badge>
          {a.severity === "high" && (
            <Badge tone="warning">
              <Danger size={12} variant="Bold" /> Yuqori
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--text-muted)]">
          <span>
            {fmtDate(a.prevDate)} → <strong className="text-[var(--text)]">{fmtDate(a.date)}</strong>
          </span>
          <span className="text-[var(--border-strong,#cbd5e1)]">·</span>
          <span>{weekday(a.date)}</span>
          <span className="text-[var(--border-strong,#cbd5e1)]">·</span>
          <span>
            {formatCompact(a.prevValue)} → {formatCompact(a.currValue)}
          </span>
        </div>
      </div>

      {/* O'zgarish foizi */}
      <div className="shrink-0 text-right">
        <div
          className={cn(
            "inline-flex items-center gap-1 text-[16px] font-bold",
            `text-[var(${toneVar})]`,
          )}
        >
          {up ? <ArrowUp size={16} variant="Bold" /> : <ArrowDown size={16} variant="Bold" />}
          {Math.abs(a.pct).toFixed(1)}%
        </div>
        <div className={cn("mt-0.5 text-[11.5px] font-medium", `text-[var(${toneVar})]`)}>
          {a.diff >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(a.diff))}
        </div>
      </div>
    </Card>
  );
}
