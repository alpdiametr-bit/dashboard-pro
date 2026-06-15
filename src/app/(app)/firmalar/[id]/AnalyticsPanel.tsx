"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendLine, TrendArea, Sparkline } from "@/components/charts/Charts";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import type {
  CompanyAnalytics,
  TrendPoint,
  DeltaRow,
  LedgerTurnoverRow,
  TopBorrower,
} from "@/lib/analytics";
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  Warning2,
  TickCircle,
  Activity,
  Chart,
  ArrangeHorizontal,
  InfoCircle,
  ArrowSwapHorizontal,
  Profile2User,
  Personalcard,
} from "iconsax-reactjs";

// ───────── Granularity (kunlik / oylik / choraklik) ─────────
type Gran = "daily" | "monthly" | "quarterly";
const GRANS: { key: Gran; label: string }[] = [
  { key: "daily", label: "Kunlik" },
  { key: "monthly", label: "Oylik" },
  { key: "quarterly", label: "Choraklik" },
];

function aggregate(series: TrendPoint[], gran: Gran): TrendPoint[] {
  if (gran === "daily" || series.length === 0) return series;
  // Har davr (oy/chorak) uchun oxirgi nuqtani olamiz (snapshot mantiqi)
  const bucket = new Map<string, TrendPoint>();
  for (const p of series) {
    const d = new Date(p.date);
    const key =
      gran === "monthly"
        ? `${d.getFullYear()}-${d.getMonth()}`
        : `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}`;
    bucket.set(key, p); // asc tartib → oxirgisi qoladi
  }
  return [...bucket.values()].map((p) => {
    const d = new Date(p.date);
    const label =
      gran === "monthly"
        ? `${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
        : `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    return { ...p, label };
  });
}

// ───────── Metrika tanlash (hero grafik) ─────────
type MetricKey = keyof TrendPoint;
const METRICS: { key: MetricKey; label: string; color: string; percent?: boolean }[] = [
  { key: "assets", label: "Jami aktivlar", color: "#1e3a8a" },
  { key: "netLoans", label: "Kredit portfeli (sof)", color: "#0ea5e9" },
  { key: "capital", label: "Jami kapital", color: "#16a34a" },
  { key: "netProfit", label: "Sof foyda", color: "#ca8a04" },
  { key: "liabilities", label: "Majburiyatlar", color: "#e11d48" },
  { key: "borrowedFunds", label: "Jalb etilgan mablag'", color: "#7c3aed" },
  { key: "overduePrincipal", label: "Muddati o'tgan qarz", color: "#dc2626" },
  { key: "interestIncome", label: "Foizli daromad", color: "#0891b2" },
];

export function AnalyticsPanel({ data }: { data: CompanyAnalytics }) {
  const [gran, setGran] = useState<Gran>("daily");
  const [metric, setMetric] = useState<MetricKey>("assets");

  const series = useMemo(() => aggregate(data.series, gran), [data.series, gran]);
  const { latest, prev, deltas, quality, ledger, borrowers } = data;

  const activeMetric = METRICS.find((m) => m.key === metric)!;

  if (!latest) {
    return (
      <Card className="p-8 text-center text-[var(--text-muted)]">
        <Activity size={32} className="mx-auto mb-2 opacity-50" />
        Analitika uchun tasdiqlangan hisobot yo&apos;q.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Ma'lumot sifati / yangilanish ── */}
      <DataQuality quality={quality} />

      {/* ── Koeffitsient kartalari (sparkline + delta) ── */}
      <div>
        <SectionTitle icon={<Activity size={16} />} title="Moliyaviy koeffitsientlar" hint="oxirgi hisobot · trend bilan" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <RatioCard
            label="ROA" hint="Aktivlar rentabelligi" value={latest.roa} prev={prev?.roa}
            series={series} dataKey="roa" color="#1e3a8a" goodHigh suffix="%"
          />
          <RatioCard
            label="ROE" hint="Kapital rentabelligi" value={latest.roe} prev={prev?.roe}
            series={series} dataKey="roe" color="#16a34a" goodHigh suffix="%"
          />
          <RatioCard
            label="NIM" hint="Sof foizli marja" value={latest.nim} prev={prev?.nim}
            series={series} dataKey="nim" color="#0ea5e9" goodHigh suffix="%"
          />
          <RatioCard
            label="Cost / Income" hint="Xarajat samaradorligi" value={latest.costIncome} prev={prev?.costIncome}
            series={series} dataKey="costIncome" color="#ca8a04" suffix="%"
          />
          <RatioCard
            label="Kapital yetarliligi" hint="me'yor: min 10%" value={latest.capitalAdequacy} prev={prev?.capitalAdequacy}
            series={series} dataKey="capitalAdequacy" color="#7c3aed" goodHigh suffix="%"
            norm={{ min: 10 }}
          />
          <RatioCard
            label="NPL" hint="Muddati o'tgan ulushi" value={latest.npl} prev={prev?.npl}
            series={series} dataKey="npl" color="#e11d48" suffix="%"
          />
          <RatioCard
            label="Zaxira qoplami" hint="Zaxira / muddati o'tgan" value={latest.reserveCoverage} prev={prev?.reserveCoverage}
            series={series} dataKey="reserveCoverage" color="#0891b2" goodHigh suffix="%"
          />
          <RatioCard
            label="Leverage" hint="Majburiyat / kapital" value={latest.leverage} prev={prev?.leverage}
            series={series} dataKey="leverage" color="#dc2626" suffix="×" decimals={2}
          />
        </div>
      </div>

      {/* ── Hero trend (metrika tanlanadi) ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Chart size={18} /> Dinamika — {activeMetric.label}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {GRANS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGran(g.key)}
                className={cn(
                  "h-8 px-3 rounded-[8px] text-[12px] font-medium cursor-pointer transition-colors",
                  gran === g.key
                    ? "bg-[var(--trust-blue)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {METRICS.map((m) => (
              <button
                key={m.key as string}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[12px] font-medium cursor-pointer transition-all border",
                  metric === m.key
                    ? "text-white border-transparent"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]",
                )}
                style={metric === m.key ? { background: m.color } : undefined}
              >
                {m.label}
              </button>
            ))}
          </div>
          <TrendArea
            data={series as unknown as Record<string, number | string>[]}
            dataKey={metric as string}
            color={activeMetric.color}
            height={300}
          />
        </CardBody>
      </Card>

      {/* ── Balans tarkibi trend (aktiv/majburiyat/kapital) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Balans tuzilmasi dinamikasi</CardTitle>
          </CardHeader>
          <CardBody>
            <TrendLine
              data={series as unknown as Record<string, number | string>[]}
              series={[
                { key: "assets", label: "Aktivlar", color: "#1e3a8a", money: true },
                { key: "liabilities", label: "Majburiyatlar", color: "#e11d48", money: true },
                { key: "capital", label: "Kapital", color: "#16a34a", money: true },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daromad va foyda dinamikasi</CardTitle>
          </CardHeader>
          <CardBody>
            <TrendLine
              data={series as unknown as Record<string, number | string>[]}
              series={[
                { key: "interestIncome", label: "Foizli daromad", color: "#0891b2", money: true },
                { key: "interestExpense", label: "Foizli harajat", color: "#f59e0b", money: true },
                { key: "netProfit", label: "Sof foyda", color: "#16a34a", money: true },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                Kapital yetarliligi
                <Badge tone={latest.capitalAdequacy >= 10 ? "profit" : "loss"}>
                  {latest.capitalAdequacy.toFixed(1)}%
                </Badge>
              </span>
            </CardTitle>
            <span className="text-[12px] text-[var(--text-muted)]">me&apos;yor: 10%</span>
          </CardHeader>
          <CardBody>
            <TrendLine
              data={series as unknown as Record<string, number | string>[]}
              series={[{ key: "capitalAdequacy", label: "Kapital yetarliligi", color: "#7c3aed", money: false }]}
              percent
              refLine={{ y: 10, label: "min 10%", color: "var(--loss)" }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sifatsiz kreditlar (NPL) va zaxira</CardTitle>
          </CardHeader>
          <CardBody>
            <TrendLine
              data={series as unknown as Record<string, number | string>[]}
              series={[
                { key: "npl", label: "NPL %", color: "#e11d48", money: false },
              ]}
              percent
            />
          </CardBody>
        </Card>
      </div>

      {/* ── Debet / Kredit oborot (raznitsa) — eng muhimi ── */}
      <LedgerSection ledger={ledger} series={series} />

      {/* ── Qarz oluvchilar (ism-familiya) ── */}
      <BorrowersSection borrowers={borrowers} />

      {/* ── Davrlararo o'zgarish (yangi / yo'qolgan / o'zgargan) ── */}
      {prev ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DeltaCard title="Balans o'zgarishlari" rows={deltas.balance} />
          <DeltaCard title="Foyda-zarar o'zgarishlari" rows={deltas.income} />
        </div>
      ) : (
        <Card className="p-5 text-center text-[13px] text-[var(--text-muted)]">
          <InfoCircle size={20} className="mx-auto mb-1.5 opacity-60" />
          Davrlararo taqqoslash uchun kamida 2 ta hisobot kerak. Hozir{" "}
          {quality.total} ta hisobot bor — keyingi hisobot kelganda o&apos;zgarishlar
          (yangi / yo&apos;qolgan / o&apos;sgan) shu yerda ko&apos;rinadi.
        </Card>
      )}
    </div>
  );
}

// ───────────────────── Ichki komponentlar ─────────────────────

function fmtSigned(n: number): string {
  const s = formatCompact(Math.abs(n));
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

// ── Debet/Kredit oborot (raznitsa) ──
function LedgerSection({
  ledger,
  series,
}: {
  ledger: CompanyAnalytics["ledger"];
  series: TrendPoint[];
}) {
  const [mode, setMode] = useState<"turnover" | "diff">("diff");
  const rows = mode === "diff" ? ledger.topByDiff : ledger.topByTurnover;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(mode === "diff" ? r.diff : r.debit + r.credit)));

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<ArrangeHorizontal size={16} />}
        title="Debet / Kredit oboroti va farqi (raznitsa)"
        hint="oxirgi hisobot · oborotka (3-ilova)"
      />

      {/* Jami debet/kredit/raznitsa kartalari */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <SummaryTile
          label="Jami DEBET oborot"
          value={formatCompact(ledger.totalDebit)}
          tone="info"
          icon={<ArrowDown size={20} />}
        />
        <SummaryTile
          label="Jami KREDIT oborot"
          value={formatCompact(ledger.totalCredit)}
          tone="warning"
          icon={<ArrowUp size={20} />}
        />
        <SummaryTile
          label="Farqi (raznitsa)"
          value={fmtSigned(ledger.diff)}
          tone={ledger.diff >= 0 ? "profit" : "loss"}
          icon={<ArrowSwapHorizontal size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Debet vs Kredit oborot dinamikasi */}
        <Card>
          <CardHeader>
            <CardTitle>Debet va Kredit oborot dinamikasi</CardTitle>
          </CardHeader>
          <CardBody>
            <TrendLine
              data={series as unknown as Record<string, number | string>[]}
              series={[
                { key: "turnoverDebit", label: "Debet oborot", color: "#1e3a8a", money: true },
                { key: "turnoverCredit", label: "Kredit oborot", color: "#ca8a04", money: true },
                { key: "turnoverNet", label: "Farqi (raznitsa)", color: "#16a34a", money: true },
              ]}
            />
          </CardBody>
        </Card>

        {/* Eng muhim hisobvaraqlar (oborot yoki raznitsa bo'yicha) */}
        <Card>
          <CardHeader>
            <CardTitle>Eng muhim hisobvaraqlar</CardTitle>
            <div className="flex items-center gap-1.5">
              {(["diff", "turnover"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-8 px-2.5 rounded-[8px] text-[12px] font-medium cursor-pointer transition-colors",
                    mode === m
                      ? "bg-[var(--trust-blue)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                >
                  {m === "diff" ? "Raznitsa" : "Oborot"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {rows.length === 0 ? (
              <p className="text-center text-[13px] text-[var(--text-muted)] py-8">
                Oborotka ma&apos;lumoti yo&apos;q
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <LedgerRow key={r.accountNo} row={r} mode={mode} maxAbs={maxAbs} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function LedgerRow({
  row,
  mode,
  maxAbs,
}: {
  row: LedgerTurnoverRow;
  mode: "turnover" | "diff";
  maxAbs: number;
}) {
  const metric = mode === "diff" ? row.diff : row.debit + row.credit;
  const widthPct = Math.min(100, (Math.abs(metric) / maxAbs) * 100);
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-[11px] tnum text-[var(--text-muted)] w-12 shrink-0">
          {row.accountNo}
        </span>
        <span className="flex-1 min-w-0 text-[12px] text-[var(--text)] truncate" title={row.name}>
          {row.name}
        </span>
        <span
          className={cn(
            "text-[12px] font-semibold tnum whitespace-nowrap",
            mode === "diff"
              ? row.diff >= 0
                ? "text-[var(--profit)]"
                : "text-[var(--loss)]"
              : "text-[var(--text)]",
          )}
        >
          {mode === "diff" ? fmtSigned(row.diff) : formatCompact(row.debit + row.credit)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${widthPct}%`,
              background:
                mode === "diff"
                  ? row.diff >= 0
                    ? "var(--profit)"
                    : "var(--loss)"
                  : "var(--trust-blue)",
            }}
          />
        </div>
        <span className="text-[10px] tnum text-[var(--text-muted)] whitespace-nowrap">
          D {formatCompact(row.debit)} · K {formatCompact(row.credit)}
        </span>
      </div>
    </div>
  );
}

// ── Qarz oluvchilar (ism-familiya) ──
function BorrowersSection({
  borrowers,
}: {
  borrowers: CompanyAnalytics["borrowers"];
}) {
  const [tab, setTab] = useState<"top" | "overdue">("top");
  const rows = tab === "overdue" ? borrowers.topOverdue : borrowers.top;

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<Profile2User size={16} />}
        title="Qarz oluvchilar (ism-familiya)"
        hint={`${borrowers.total.toLocaleString("ru-RU")} ta qarzdor · kredit portfeli (7-ilova)`}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Personalcard size={18} />
              {tab === "overdue" ? "Muddati o'tgan qarzdorlar" : "Eng yirik qarzdorlar"}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab("top")}
              className={cn(
                "h-8 px-3 rounded-[8px] text-[12px] font-medium cursor-pointer transition-colors",
                tab === "top"
                  ? "bg-[var(--trust-blue)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              Yiriklari
            </button>
            <button
              onClick={() => setTab("overdue")}
              className={cn(
                "h-8 px-3 rounded-[8px] text-[12px] font-medium cursor-pointer transition-colors",
                tab === "overdue"
                  ? "bg-[var(--loss)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              Muddati o&apos;tgan ({borrowers.overdueCount})
            </button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <p className="text-center text-[13px] text-[var(--text-muted)] py-8">
              {tab === "overdue" ? "Muddati o'tgan qarzdor yo'q" : "Qarzdor topilmadi"}
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((b, idx) => (
                <BorrowerRow key={b.pinfl ?? idx} b={b} rank={idx + 1} showOverdue={tab === "overdue"} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function BorrowerRow({
  b,
  rank,
  showOverdue,
}: {
  b: TopBorrower;
  rank: number;
  showOverdue: boolean;
}) {
  const initials = b.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] text-[11px] font-bold shrink-0">
        {initials || rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text)] truncate" title={b.name}>
          {b.name}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] tnum">
          {b.pinfl ?? "—"}
          {b.rate != null ? ` · ${b.rate}%` : ""}
        </p>
      </div>
      <div className="text-right shrink-0">
        {showOverdue ? (
          <>
            <p className="text-[13px] font-semibold tnum text-[var(--loss)]">
              {formatCompact(b.overdue)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] tnum">
              qoldiq {formatCompact(b.balance)}
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold tnum text-[var(--text)]">
              {formatCompact(b.balance)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] tnum">
              summa {formatCompact(b.amount)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "info" | "profit" | "loss" | "warning";
  icon: React.ReactNode;
}) {
  const toneClass: Record<string, string> = {
    info: "bg-[var(--trust-blue)]/10 text-[var(--trust-blue)]",
    profit: "bg-[var(--profit)]/10 text-[var(--profit)]",
    loss: "bg-[var(--loss)]/10 text-[var(--loss)]",
    warning: "bg-[var(--warning)]/12 text-[var(--warning)]",
  };
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-xs)] flex items-center gap-3">
      <span className={cn("grid place-items-center h-10 w-10 rounded-[10px]", toneClass[tone])}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
        <p className="text-[18px] font-bold tnum text-[var(--text)] leading-tight">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]">
        <span className="text-[var(--trust-blue)]">{icon}</span> {title}
      </h3>
      {hint && <span className="text-[12px] text-[var(--text-muted)]">{hint}</span>}
    </div>
  );
}

function DataQuality({
  quality,
}: {
  quality: CompanyAnalytics["quality"];
}) {
  const daysAgo = quality.daysAgo;
  const fresh = daysAgo != null && daysAgo <= 2;

  const tone =
    quality.coverage >= 80 ? "profit" : quality.coverage >= 40 ? "warning" : "loss";

  return (
    <Card>
      <CardBody className="py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "grid place-items-center h-9 w-9 rounded-[10px]",
                fresh
                  ? "bg-[var(--profit)]/12 text-[var(--profit)]"
                  : "bg-[var(--warning)]/12 text-[var(--warning)]",
              )}
            >
              {fresh ? <TickCircle size={18} variant="Bold" /> : <Warning2 size={18} variant="Bold" />}
            </span>
            <div>
              <p className="text-[12px] text-[var(--text-muted)]">Oxirgi yangilanish</p>
              <p className="text-[14px] font-semibold text-[var(--text)]">
                {daysAgo === 0 ? "Bugun" : daysAgo === 1 ? "Kecha" : `${daysAgo} kun oldin`}
              </p>
            </div>
          </div>

          <Divider />
          <Stat label="Hisobotlar" value={String(quality.total)} />
          <Stat
            label="Qamrov"
            value={`${quality.coverage}%`}
            badge={<Badge tone={tone}>{quality.gaps} bo&apos;sh kun</Badge>}
          />
          <Stat
            label="O'rtacha oraliq"
            value={quality.avgGapDays ? `${quality.avgGapDays} kun` : "—"}
          />

          {quality.missingDates.length > 0 && (
            <>
              <Divider />
              <div className="min-w-0">
                <p className="text-[12px] text-[var(--text-muted)] mb-1 inline-flex items-center gap-1">
                  <Calendar size={13} /> Hisobot kelmagan kunlar
                </p>
                <div className="flex flex-wrap gap-1 max-w-xl">
                  {quality.missingDates.slice(0, 10).map((d) => (
                    <span
                      key={d}
                      className="px-1.5 py-0.5 rounded-[6px] text-[11px] bg-[var(--loss)]/10 text-[var(--loss)] tnum"
                    >
                      {d}
                    </span>
                  ))}
                  {quality.missingDates.length > 10 && (
                    <span className="px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                      +{quality.missingDates.length - 10} ta
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Divider() {
  return <span className="hidden sm:block h-9 w-px bg-[var(--border)]" />;
}

function Stat({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <p className="text-[14px] font-semibold text-[var(--text)] inline-flex items-center gap-2">
        {value} {badge}
      </p>
    </div>
  );
}

function RatioCard({
  label,
  hint,
  value,
  prev,
  series,
  dataKey,
  color,
  goodHigh = false,
  suffix = "",
  decimals = 1,
  norm,
}: {
  label: string;
  hint: string;
  value: number;
  prev?: number;
  series: TrendPoint[];
  dataKey: string;
  color: string;
  goodHigh?: boolean;
  suffix?: string;
  decimals?: number;
  norm?: { min?: number; max?: number };
}) {
  const delta = prev != null ? value - prev : null;
  const up = (delta ?? 0) > 0;
  const breached =
    norm?.min != null ? value < norm.min : norm?.max != null ? value > norm.max : false;

  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-xs)] overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--text-muted)] truncate">{hint}</p>
          <p className="text-[15px] font-semibold text-[var(--text)] leading-tight mt-0.5">
            {label}
          </p>
        </div>
        {norm && (
          <span title="me'yor">
            {breached ? (
              <Warning2 size={15} className="text-[var(--loss)]" variant="Bold" />
            ) : (
              <TickCircle size={15} className="text-[var(--profit)]" variant="Bold" />
            )}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-1">
        <span
          className={cn(
            "text-[22px] font-bold tnum leading-none",
            breached ? "text-[var(--loss)]" : "text-[var(--text)]",
          )}
        >
          {value.toFixed(decimals)}
          <span className="text-[13px] font-semibold text-[var(--text-muted)] ml-0.5">{suffix}</span>
        </span>
        {delta != null && Math.abs(delta) >= 0.01 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold tnum",
              (goodHigh ? up : !up) ? "text-[var(--profit)]" : "text-[var(--loss)]",
            )}
          >
            {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(delta).toFixed(decimals)}
          </span>
        )}
      </div>

      <div className="mt-2 -mx-1">
        <Sparkline
          data={series as unknown as Record<string, number | string>[]}
          dataKey={dataKey}
          color={color}
        />
      </div>
    </div>
  );
}

const DELTA_META: Record<
  DeltaRow["status"],
  { label: string; tone: "profit" | "loss" | "warning" | "info" | "neutral" | "gold" }
> = {
  new: { label: "Yangi", tone: "gold" },
  gone: { label: "Yo'qoldi", tone: "loss" },
  up: { label: "O'sdi", tone: "profit" },
  down: { label: "Kamaydi", tone: "warning" },
  same: { label: "O'zgarmadi", tone: "neutral" },
};

function DeltaCard({ title, rows }: { title: string; rows: DeltaRow[] }) {
  const shown = rows.filter((r) => r.status !== "same").slice(0, 12);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <ArrangeHorizontal size={18} /> {title}
          </span>
        </CardTitle>
        <span className="text-[12px] text-[var(--text-muted)]">oxirgi 2 hisobot</span>
      </CardHeader>
      <CardBody className="p-0">
        {shown.length === 0 ? (
          <p className="text-center text-[13px] text-[var(--text-muted)] py-8">
            Sezilarli o&apos;zgarish yo&apos;q
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {shown.map((r) => (
              <div key={r.code} className="flex items-center gap-3 px-4 py-2.5">
                <Badge tone={DELTA_META[r.status].tone}>{DELTA_META[r.status].label}</Badge>
                <span className="flex-1 min-w-0 text-[13px] text-[var(--text)] truncate" title={r.label}>
                  {r.label}
                </span>
                <span className="text-[13px] tnum text-[var(--text-muted)] whitespace-nowrap">
                  {formatCompact(r.prev)} → <span className="font-semibold text-[var(--text)]">{formatCompact(r.curr)}</span>
                </span>
                <span
                  className={cn(
                    "text-[12px] font-semibold tnum w-16 text-right",
                    r.diff > 0 ? "text-[var(--profit)]" : r.diff < 0 ? "text-[var(--loss)]" : "text-[var(--text-muted)]",
                  )}
                >
                  {r.pct == null ? "yangi" : `${r.pct > 0 ? "+" : ""}${r.pct.toFixed(0)}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
