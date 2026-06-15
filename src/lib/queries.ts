import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/** Prisma Decimal | null -> number */
export function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return Number(v);
}

/** Har firma uchun eng so'nggi (sana bo'yicha) hisobotni qaytaradi */
export async function latestReportPerCompany() {
  const companies = await prisma.company.findMany({
    include: {
      reports: {
        orderBy: { reportDate: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
  return companies;
}

/** Balans qatorlaridan kod bo'yicha qiymat */
export function balanceValue(
  lines: { code: string | null; value: Prisma.Decimal | number }[],
  code: string,
): number {
  const line = lines.find((l) => l.code === code);
  return line ? num(line.value) : 0;
}

/** Umumiy dashboard statistikasi (so'nggi hisobotlar bo'yicha) */
export async function dashboardStats(filters?: {
  companyId?: number;
  from?: Date;
  to?: Date;
}) {
  const reportWhere: Prisma.ReportWhereInput = { status: "CONFIRMED" };
  if (filters?.companyId) reportWhere.companyId = filters.companyId;
  if (filters?.from || filters?.to) {
    reportWhere.reportDate = {};
    if (filters.from) reportWhere.reportDate.gte = filters.from;
    if (filters.to) reportWhere.reportDate.lte = filters.to;
  }

  const companyCountWhere: Prisma.CompanyWhereInput = filters?.companyId
    ? { id: filters.companyId }
    : {};

  const [companyCount, reportCount, pendingCount, confirmedReports] =
    await Promise.all([
      prisma.company.count({ where: companyCountWhere }),
      prisma.report.count({
        where: filters?.companyId ? { companyId: filters.companyId } : {},
      }),
      prisma.report.count({
        where: {
          status: "PENDING",
          ...(filters?.companyId ? { companyId: filters.companyId } : {}),
        },
      }),
      prisma.report.findMany({
        where: reportWhere,
        orderBy: { reportDate: "desc" },
        include: {
          company: true,
          balanceLines: { select: { code: true, value: true } },
          incomeLines: { select: { code: true, value: true } },
          _count: { select: { loanItems: true } },
        },
      }),
    ]);

  // Har firma uchun faqat eng so'nggi confirmed hisobot
  const latestByCompany = new Map<number, (typeof confirmedReports)[number]>();
  for (const r of confirmedReports) {
    if (!latestByCompany.has(r.companyId)) latestByCompany.set(r.companyId, r);
  }

  let totalAssets = 0;
  let totalCapital = 0;
  let totalProfit = 0;
  let totalLiabilities = 0;

  for (const r of latestByCompany.values()) {
    totalAssets += balanceValue(r.balanceLines, "120");
    totalLiabilities += balanceValue(r.balanceLines, "280");
    totalCapital += balanceValue(r.balanceLines, "360");
    const profit = r.incomeLines.find((l) => l.code === "1200");
    totalProfit += profit ? num(profit.value) : 0;
  }

  return {
    companyCount,
    reportCount,
    pendingCount,
    activeCompanies: latestByCompany.size,
    totalAssets,
    totalLiabilities,
    totalCapital,
    totalProfit,
    latestReports: [...latestByCompany.values()],
  };
}

/**
 * Firmalar bo'yicha aktivlar dinamikasi (to'lqin grafigi uchun).
 * Har bir hisobot sanasi — X o'qi nuqtasi, har bir firma — alohida chiziq.
 * Qaytadi: { points: [{ date, label, [firmaNomi]: summa }], firms: [...] }
 */
export async function companyAssetsSeries(filters?: {
  companyId?: number;
  from?: Date;
  to?: Date;
}) {
  const where: Prisma.ReportWhereInput = { status: "CONFIRMED" };
  if (filters?.companyId) where.companyId = filters.companyId;
  if (filters?.from || filters?.to) {
    where.reportDate = {};
    if (filters.from) where.reportDate.gte = filters.from;
    if (filters.to) where.reportDate.lte = filters.to;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { reportDate: "asc" },
    include: {
      company: { select: { id: true, name: true } },
      balanceLines: { select: { code: true, value: true } },
    },
  });

  // Firma nomlarini qisqartirish
  const shortName = (name: string) =>
    name.replace(/MIKROMOLIYA TASHKILOTI|MCHJ|"/gi, "").trim().slice(0, 16) ||
    name.slice(0, 16);

  // firma id -> qisqa nom
  const firmMap = new Map<number, string>();
  // sana (yyyy-mm-dd) -> { label, [firm]: value }
  const byDate = new Map<string, Record<string, number | string>>();

  for (const r of reports) {
    const fid = r.company.id;
    const fname = shortName(r.company.name);
    firmMap.set(fid, fname);

    const key = r.reportDate.toISOString().slice(0, 10);
    const d = r.reportDate;
    const label = `${String(d.getDate()).padStart(2, "0")}.${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}`;

    if (!byDate.has(key)) byDate.set(key, { date: key, label });
    const assets = balanceValue(r.balanceLines, "120");
    byDate.get(key)![fname] = assets;
  }

  const firms = [...firmMap.values()];
  const points = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, v]) => v);

  return { points, firms };
}

