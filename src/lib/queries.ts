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
export async function dashboardStats() {
  const [companyCount, reportCount, pendingCount, confirmedReports] =
    await Promise.all([
      prisma.company.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.report.findMany({
        where: { status: "CONFIRMED" },
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
    totalAssets,
    totalLiabilities,
    totalCapital,
    totalProfit,
    latestReports: [...latestByCompany.values()],
  };
}
