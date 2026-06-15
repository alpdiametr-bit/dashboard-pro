"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
  Sector,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  ReferenceLine,
} from "recharts";
import { useState } from "react";
import { formatCompact, formatMoney } from "@/lib/format";

const COLORS = ["#1e3a8a", "#ca8a04", "#16a34a", "#0ea5e9", "#7c3aed", "#e11d48"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 13,
  boxShadow: "var(--shadow-lg)",
  padding: "8px 12px",
} as const;

export function CompanyBar({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (!data.length) return <Empty text="Taqqoslash uchun ma'lumot yo'q" />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 8, left: 8 }}>
        <defs>
          {COLORS.map((c, i) => (
            <linearGradient
              key={i}
              id={`bar-grad-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={c} stopOpacity={0.95} />
              <stop offset="100%" stopColor={c} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval={0}
          angle={-12}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
          formatter={(v: number) => [formatCompact(v), "Aktivlar"]}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={46}>
          {data.map((_, i) => (
            <Cell key={i} fill={`url(#bar-grad-${i % COLORS.length})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Firmalar bo'yicha aktivlar dinamikasi — to'lqinli (wave) vaqt qatori.
 * X o'qi — hisobot sanalari, har bir firma alohida to'lqin (area) chizig'i.
 * Summalar tooltipda ko'rinadi.
 */
export function CompanyWave({
  points,
  firms,
}: {
  points: Record<string, number | string>[];
  firms: string[];
}) {
  if (!points.length || !firms.length)
    return <Empty text="Taqqoslash uchun ma'lumot yo'q" />;

  // Bitta sana bo'lsa — chiziq ko'rinmaydi, shuni ogohlantiramiz emas, dot bilan
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={points}
        margin={{ top: 16, right: 16, bottom: 8, left: 6 }}
      >
        <defs>
          {firms.map((f, i) => {
            const c = COLORS[i % COLORS.length];
            return (
              <linearGradient
                key={f}
                id={`wave-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={c} stopOpacity={0.28} />
                <stop offset="70%" stopColor={c} stopOpacity={0.06} />
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          minTickGap={12}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{
            stroke: "var(--trust-blue)",
            strokeWidth: 1,
            strokeDasharray: "4 4",
          }}
          formatter={(v: number, name: string) => [formatMoney(v), name]}
          labelFormatter={(l) => `Sana: ${l}`}
          contentStyle={tooltipStyle}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
          iconType="circle"
          iconSize={9}
        />
        {firms.map((f, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <Area
              key={f}
              type="monotone"
              dataKey={f}
              name={f}
              stroke={c}
              strokeWidth={2.4}
              fill={`url(#wave-${i})`}
              connectNulls
              dot={{ r: 2.5, fill: "var(--surface)", stroke: c, strokeWidth: 2 }}
              activeDot={{
                r: 5,
                fill: c,
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={800}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

type SectorProps = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
};

function ActiveShape(props: unknown) {
  const p = props as SectorProps;
  return (
    <Sector
      cx={p.cx}
      cy={p.cy}
      innerRadius={p.innerRadius}
      outerRadius={p.outerRadius + 6}
      startAngle={p.startAngle}
      endAngle={p.endAngle}
      fill={p.fill}
      cornerRadius={6}
    />
  );
}

export function StructureDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const [active, setActive] = useState<number | undefined>(undefined);
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return <Empty text="Ma'lumot yo'q" />;
  const total = filtered.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={104}
            paddingAngle={3}
            cornerRadius={6}
            stroke="var(--surface)"
            strokeWidth={2}
            activeIndex={active}
            activeShape={ActiveShape}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
          >
            {filtered.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => formatCompact(v)}
            contentStyle={tooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* markaziy jami */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] grid place-items-center">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Jami
          </div>
          <div className="text-[18px] font-bold tnum text-[var(--text)]">
            {formatCompact(total)}
          </div>
        </div>
      </div>
      {/* legenda */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {filtered.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[12px]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-[var(--text-muted)]">{d.name}</span>
            <span className="font-semibold tnum text-[var(--text)]">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="h-[300px] grid place-items-center text-sm text-[var(--text-muted)]">
      {text}
    </div>
  );
}

// ─────────── Gorizontal reyting bars (top elementlar, kreditorlar) ───────────

export function HBars({
  data,
  height = 300,
  unitLabel = "Qiymat",
}: {
  data: { name: string; value: number }[];
  height?: number;
  unitLabel?: string;
}) {
  const filtered = data.filter((d) => d.value !== 0);
  if (!filtered.length) return <Empty text="Ma'lumot yo'q" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <defs>
          <linearGradient id="hbar-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="var(--border)"
        />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          width={150}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
          formatter={(v: number) => [formatCompact(v), unitLabel]}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26} fill="url(#hbar-grad)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────── Daromad / Harajat / Foyda bars ───────────

export function IncomeBars({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (!data.length) return <Empty text="Ma'lumot yo'q" />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval={0}
          height={40}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)", opacity: 0.5 }}
          formatter={(v: number) => [formatCompact(v), "Summa"]}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.value < 0
                  ? "#e11d48"
                  : i === data.length - 1
                    ? "#16a34a"
                    : COLORS[i % COLORS.length]
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────── Vaqt qatori (line/area) — kunlik trend ───────────

type SeriesDef = {
  key: string;
  label: string;
  color: string;
  money?: boolean; // true = ming so'm (compact), false = % / koeff
  dashed?: boolean; // uzuq-uzuq chiziq (ustma-ust tushganda farqlash uchun)
};

const AXIS = {
  tick: { fontSize: 11, fill: "var(--text-muted)" },
} as const;

/**
 * Ko'p qatorli chiziqli grafik (kunlik trend).
 * Bitta nuqta bo'lsa ham nuqta ko'rinadi (dot).
 */
export function TrendLine({
  data,
  series,
  height = 300,
  percent = false,
  refLine,
}: {
  data: Record<string, number | string>[];
  series: SeriesDef[];
  height?: number;
  percent?: boolean;
  refLine?: { y: number; label: string; color?: string };
}) {
  if (!data.length) return <Empty text="Trend uchun ma'lumot yo'q" />;
  const single = data.length === 1;
  const fmt = (v: number) => (percent ? `${v.toFixed(1)}%` : formatCompact(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 14, bottom: 6, left: 6 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`tl-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.5} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={AXIS.tick}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          minTickGap={16}
        />
        <YAxis
          tickFormatter={fmt}
          tick={AXIS.tick}
          tickLine={false}
          axisLine={false}
          width={54}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number, n: string) => {
            const s = series.find((x) => x.label === n);
            return [s?.money === false || percent ? `${Number(v).toFixed(2)}%` : formatMoney(v), n];
          }}
        />
        {series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconType="circle" />
        )}
        {refLine && (
          <ReferenceLine
            y={refLine.y}
            stroke={refLine.color ?? "var(--loss)"}
            strokeDasharray="5 4"
            label={{
              value: refLine.label,
              fontSize: 10,
              fill: refLine.color ?? "var(--loss)",
              position: "insideTopRight",
            }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={s.dashed ? 3 : 2.4}
            strokeDasharray={s.dashed ? "7 5" : undefined}
            dot={single ? { r: 4, fill: s.color } : { r: 2.5, fill: s.color }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** To'ldirilgan maydonli trend (bitta ko'rsatkich uchun, hero grafik) */
export function TrendArea({
  data,
  dataKey,
  color = "#1e3a8a",
  height = 300,
  percent = false,
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  color?: string;
  height?: number;
  percent?: boolean;
}) {
  if (!data.length) return <Empty text="Trend uchun ma'lumot yo'q" />;
  const single = data.length === 1;
  const fmt = (v: number) => (percent ? `${v.toFixed(1)}%` : formatCompact(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 14, bottom: 6, left: 6 }}>
        <defs>
          <linearGradient id={`ta-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={AXIS.tick}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          minTickGap={16}
        />
        <YAxis tickFormatter={fmt} tick={AXIS.tick} tickLine={false} axisLine={false} width={54} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [percent ? `${Number(v).toFixed(2)}%` : formatMoney(v), ""]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.4}
          fill={`url(#ta-${dataKey})`}
          dot={single ? { r: 4, fill: color } : false}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Mini sparkline (KPI karta ichida trend) */
export function Sparkline({
  data,
  dataKey,
  color = "#1e3a8a",
  height = 44,
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  color?: string;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div
        className="grid place-items-center text-[10px] text-[var(--text-muted)]"
        style={{ height }}
      >
        trend uchun kam
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sp-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#sp-${dataKey})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

