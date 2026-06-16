import { prisma } from "./prisma";
import { num } from "./queries";

// ─────────────────────────────────────────────────────────────────────────
// Ogohlantirishlar (signallar) — kunlar oralig'ida KATTA o'zgarishlarni aniqlash.
// Har firma uchun ketma-ket (sana bo'yicha) CONFIRMED hisobotlar solishtiriladi.
// Asosiy yig'indilar (aktiv, kapital, kredit, sof foyda, muddati o'tgan)
// belgilangan foizdan (default 5%) ko'proq o'zgargan bo'lsa — signal beriladi.
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_ALERT_THRESHOLD = 5; // %

/** Kuzatiladigan ko'rsatkichlar */
export type AlertMetricKey =
  | "assets"
  | "capital"
  | "loans"
  | "netProfit"
  | "overdue";

export const ALERT_METRICS: {
  key: AlertMetricKey;
  label: string;
  /** o'sish yaxshimi (true) yoki yomonmi (false: masalan muddati o'tgan o'sishi) */
  goodWhenUp: boolean;
}[] = [
  { key: "assets", label: "Jami aktivlar", goodWhenUp: true },
  { key: "capital", label: "Kapital", goodWhenUp: true },
  { key: "loans", label: "Kredit portfeli", goodWhenUp: true },
  { key: "netProfit", label: "Sof foyda", goodWhenUp: true },
  { key: "overdue", label: "Muddati o'tgan qarz", goodWhenUp: false },
];

export type AlertSeverity = "high" | "medium";

export type Alert = {
  id: string; // companyId-date-metric
  companyId: number;
  companyName: string;
  region: string | null;
  metric: AlertMetricKey;
  metricLabel: string;
  date: string; // ISO — joriy hisobot sanasi
  prevDate: string; // ISO — oldingi hisobot sanasi
  prevValue: number;
  currValue: number;
  diff: number; // currValue - prevValue
  pct: number; // foizli o'zgarish (ishorali)
  direction: "up" | "down";
  /** o'zgarish yaxshimi (ko'k/yashil) yoki yomonmi (qizil) */
  positive: boolean;
  severity: AlertSeverity;
};

export type AlertsResult = {
  threshold: number;
  alerts: Alert[];
  scannedReports: number;
  scannedCompanies: number;
  generatedAt: string;
};

/** Balans/income qatorlaridan kod bo'yicha qiymat */
function byCode(
  lines: { code: string | null; value: unknown }[],
  code: string,
): number {
  const l = lines.find((x) => x.code === code);
  return l ? num(l.value as number) : 0;
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

/**
 * Barcha firmalar bo'yicha kunlik katta o'zgarishlarni hisoblaydi.
 * @param threshold foizli ostona (masalan 5 = 5%)
 */
export async function getAlerts(
  threshold = DEFAULT_ALERT_THRESHOLD,
): Promise<AlertsResult> {
  const th = Math.max(0.1, threshold);

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, region: true },
    orderBy: { name: "asc" },
  });

  const reports = await prisma.report.findMany({
    where: { status: "CONFIRMED" },
    orderBy: [{ companyId: "asc" }, { reportDate: "asc" }],
    select: {
      id: true,
      companyId: true,
      reportDate: true,
      balanceLines: { select: { code: true, value: true } },
      incomeLines: { select: { code: true, value: true } },
    },
  });

  // Kredit portfeli (muddati o'tgan asosiy qarz) — har report uchun jami
  const loanAgg = reports.length
    ? await prisma.loanItem.groupBy({
        by: ["reportId"],
        where: { reportId: { in: reports.map((r) => r.id) } },
        _sum: { overduePrincipal: true },
      })
    : [];
  const overdueByReport = new Map(
    loanAgg.map((a) => [a.reportId, num(a._sum.overduePrincipal ?? 0)]),
  );

  const companyMeta = new Map(companies.map((c) => [c.id, c]));

  // report -> ko'rsatkichlar
  type Snap = {
    reportId: number;
    companyId: number;
    date: Date;
    assets: number;
    capital: number;
    loans: number;
    netProfit: number;
    overdue: number;
  };
  const snaps: Snap[] = reports.map((r) => ({
    reportId: r.id,
    companyId: r.companyId,
    date: r.reportDate,
    assets: byCode(r.balanceLines, "120"),
    capital: byCode(r.balanceLines, "360"),
    loans: byCode(r.balanceLines, "50"),
    netProfit: byCode(r.incomeLines, "1200"),
    overdue: overdueByReport.get(r.id) ?? 0,
  }));

  // Firma bo'yicha guruhlash (sana o'sish tartibida)
  const byCompany = new Map<number, Snap[]>();
  for (const s of snaps) {
    const arr = byCompany.get(s.companyId);
    if (arr) arr.push(s);
    else byCompany.set(s.companyId, [s]);
  }

  const alerts: Alert[] = [];

  for (const [companyId, list] of byCompany) {
    if (list.length < 2) continue;
    const meta = companyMeta.get(companyId);
    if (!meta) continue;

    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const curr = list[i];

      for (const m of ALERT_METRICS) {
        const prevValue = prev[m.key];
        const currValue = curr[m.key];
        // ikkalasi ham 0 bo'lsa — o'zgarish yo'q
        if (prevValue === 0 && currValue === 0) continue;
        const p = pctChange(currValue, prevValue);
        if (Math.abs(p) < th) continue;

        const direction: "up" | "down" = p >= 0 ? "up" : "down";
        // yaxshi/yomon: o'sish yaxshimi yo'qmi shu metrikaga bog'liq
        const positive = direction === "up" ? m.goodWhenUp : !m.goodWhenUp;
        const severity: AlertSeverity =
          Math.abs(p) >= th * 2 ? "high" : "medium";

        alerts.push({
          id: `${companyId}-${curr.date.toISOString().slice(0, 10)}-${m.key}`,
          companyId,
          companyName: meta.name,
          region: meta.region,
          metric: m.key,
          metricLabel: m.label,
          date: curr.date.toISOString(),
          prevDate: prev.date.toISOString(),
          prevValue,
          currValue,
          diff: currValue - prevValue,
          pct: p,
          direction,
          positive,
          severity,
        });
      }
    }
  }

  // Eng yangi va eng katta o'zgarishlar tepada
  alerts.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return Math.abs(b.pct) - Math.abs(a.pct);
  });

  return {
    threshold: th,
    alerts,
    scannedReports: reports.length,
    scannedCompanies: byCompany.size,
    generatedAt: new Date().toISOString(),
  };
}
