import { prisma } from "./prisma";
import { num } from "./queries";

// ─────────────────────────────────────────────────────────────────────────
// Chuqur analitika — firma bo'yicha vaqt qatori (time-series), moliyaviy
// koeffitsientlar, davrlararo o'zgarishlar (yangi/yo'qolgan/o'zgargan) va
// ma'lumot sifati (qaysi sanalarda bor/yo'q, bo'sh kunlar).
//
// MUHIM: hisobotlar kunlik snapshot. Har bir ko'rsatkich KOD bo'yicha
// olinadi (yacheyka siljisa ham kod bir xil qoladi). Kod topilmasa — 0.
// ─────────────────────────────────────────────────────────────────────────

/** Balans/income qatorlaridan kod bo'yicha qiymat (yacheyka emas, KOD bo'yicha) */
function byCode(
  lines: { code: string | null; value: unknown }[],
  code: string,
): number {
  const l = lines.find((x) => x.code === code);
  return l ? num(l.value as number) : 0;
}

export type TrendPoint = {
  reportId: number;
  date: string; // ISO
  label: string; // dd.mm
  // Xom ko'rsatkichlar (ming so'm)
  assets: number; // 120 jami aktivlar
  liabilities: number; // 280 jami majburiyatlar
  capital: number; // 360 jami kapital
  grossLoans: number; // 50 kreditlar brutto
  netLoans: number; // 52 kreditlar sof
  reserve: number; // 51 zaxira
  cash: number; // 10 kassa
  bankDeposits: number; // 20 banklardagi
  borrowedFunds: number; // 210 jalb etilgan kreditlar
  // Foyda-zarar
  interestIncome: number; // 180 jami foizli daromad
  interestExpense: number; // 270 jami foizli harajat
  netInterest: number; // 310 sof foizli daromad
  nonInterestIncome: number; // 470
  opex: number; // 780 operatsion harajatlar
  operatingProfit: number; // 600 operatsiongacha sof foyda
  taxProfit: number; // 1000 foyda solig'i
  netProfit: number; // 1200 sof foyda
  // Kredit portfeli (loanItem)
  loanCount: number;
  overduePrincipal: number;
  overdue1_30: number;
  overdue31_90: number;
  overdue91_180: number;
  overdue181: number;
  // Oborotka (ledger) — debet/kredit oborot va ularning farqi (raznitsa)
  turnoverDebit: number; // jami debet oborot
  turnoverCredit: number; // jami kredit oborot
  turnoverNet: number; // debet - kredit (raznitsa)
  // Koeffitsientlar (%)
  roa: number; // sof foyda / aktivlar
  roe: number; // sof foyda / kapital
  nim: number; // sof foizli daromad / aktivlar
  costIncome: number; // opex / operatsion daromad
  capitalAdequacy: number; // kapital / aktivlar (me'yor min 10%)
  npl: number; // muddati o'tgan asosiy qarz / brutto kreditlar
  reserveCoverage: number; // zaxira / muddati o'tgan
  liquidity: number; // (kassa+bank) / qisqa majburiyat (taxminiy)
  leverage: number; // majburiyat / kapital (marta)
};

export type DeltaRow = {
  code: string;
  label: string;
  section: string | null;
  prev: number;
  curr: number;
  diff: number;
  pct: number | null; // null = avval 0 edi
  status: "new" | "gone" | "up" | "down" | "same";
};

/** Oborotka qatori — hisobvaraq bo'yicha debet/kredit va farqi (raznitsa) */
export type LedgerTurnoverRow = {
  accountNo: string;
  name: string;
  debit: number; // turnoverDebit
  credit: number; // turnoverCredit
  diff: number; // debet - kredit (raznitsa)
};

/** Qarz oluvchi (ism-familiya) — kredit portfelidan */
export type TopBorrower = {
  name: string;
  pinfl: string | null;
  balance: number;
  amount: number;
  overdue: number;
  rate: number | null;
};

export type CompanyAnalytics = {
  company: { id: number; name: string; region: string | null };
  series: TrendPoint[];
  latest: TrendPoint | null;
  prev: TrendPoint | null;
  deltas: { balance: DeltaRow[]; income: DeltaRow[] };
  // Oborotka (oxirgi hisobot) — eng katta debet/kredit harakatli hisobvaraqlar
  ledger: {
    totalDebit: number;
    totalCredit: number;
    diff: number; // jami raznitsa
    topByTurnover: LedgerTurnoverRow[]; // eng faol (oborot) hisobvaraqlar
    topByDiff: LedgerTurnoverRow[]; // eng katta farq (raznitsa)
  };
  // Qarz oluvchilar (ism-familiya) — oxirgi hisobotdan
  borrowers: {
    total: number;
    overdueCount: number;
    top: TopBorrower[]; // qoldiq bo'yicha eng yiriklari
    topOverdue: TopBorrower[]; // muddati o'tgan bo'yicha
  };
  quality: {
    total: number;
    first: string | null;
    last: string | null;
    daysAgo: number | null; // oxirgi hisobotdan necha kun o'tdi
    spanDays: number;
    gaps: number;
    coverage: number; // %
    avgGapDays: number; // o'rtacha hisobotlar orasidagi kun
    missingDates: string[]; // oraliqdagi bo'sh kunlar (ilk 60 ta)
  };
};

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return (curr / prev) * 100;
}

function ratio(numr: number, denom: number): number {
  if (!denom) return 0;
  return (numr / denom) * 100;
}

export async function companyAnalytics(
  companyId: number,
): Promise<CompanyAnalytics | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, region: true },
  });
  if (!company) return null;

  const reports = await prisma.report.findMany({
    where: { companyId, status: "CONFIRMED" },
    orderBy: { reportDate: "asc" },
    select: {
      id: true,
      reportDate: true,
      balanceLines: { select: { code: true, value: true, label: true, section: true } },
      incomeLines: { select: { code: true, value: true, label: true, section: true } },
    },
  });

  // Kredit portfeli agregatlari (har report uchun)
  const loanAgg = await prisma.loanItem.groupBy({
    by: ["reportId"],
    where: { reportId: { in: reports.map((r) => r.id) } },
    _sum: {
      balance: true,
      reserve: true,
      overduePrincipal: true,
      overdue1_30: true,
      overdue31_90: true,
      overdue91_180: true,
      overdue181: true,
    },
    _count: { _all: true },
  });
  const loanByReport = new Map(loanAgg.map((a) => [a.reportId, a]));

  // Oborotka (ledger) debet/kredit oborot — har report uchun jami
  const ledgerAgg = await prisma.ledgerAccount.groupBy({
    by: ["reportId"],
    where: { reportId: { in: reports.map((r) => r.id) } },
    _sum: { turnoverDebit: true, turnoverCredit: true },
  });
  const ledgerByReport = new Map(ledgerAgg.map((a) => [a.reportId, a]));

  const series: TrendPoint[] = reports.map((r) => {
    const b = r.balanceLines;
    const i = r.incomeLines;
    const la = loanByReport.get(r.id);

    const assets = byCode(b, "120");
    const liabilities = byCode(b, "280");
    const capital = byCode(b, "360");
    const grossLoans = byCode(b, "50");
    const netLoans = byCode(b, "52");
    const reserve = byCode(b, "51");
    const cash = byCode(b, "10");
    const bankDeposits = byCode(b, "20");
    const borrowedFunds = byCode(b, "210");

    const interestIncome = byCode(i, "180");
    const interestExpense = byCode(i, "270");
    const netInterest = byCode(i, "310");
    const nonInterestIncome = byCode(i, "470");
    const opex = byCode(i, "780");
    const operatingProfit = byCode(i, "600");
    const taxProfit = byCode(i, "1000");
    const netProfit = byCode(i, "1200");

    const overduePrincipal = num(la?._sum.overduePrincipal ?? 0);
    const overdue1_30 = num(la?._sum.overdue1_30 ?? 0);
    const overdue31_90 = num(la?._sum.overdue31_90 ?? 0);
    const overdue91_180 = num(la?._sum.overdue91_180 ?? 0);
    const overdue181 = num(la?._sum.overdue181 ?? 0);
    const loanCount = la?._count._all ?? 0;

    const lg = ledgerByReport.get(r.id);
    const turnoverDebit = num(lg?._sum.turnoverDebit ?? 0);
    const turnoverCredit = num(lg?._sum.turnoverCredit ?? 0);

    const d = r.reportDate;
    const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

    return {
      reportId: r.id,
      date: d.toISOString(),
      label,
      assets,
      liabilities,
      capital,
      grossLoans,
      netLoans,
      reserve,
      cash,
      bankDeposits,
      borrowedFunds,
      interestIncome,
      interestExpense,
      netInterest,
      nonInterestIncome,
      opex,
      operatingProfit,
      taxProfit,
      netProfit,
      loanCount,
      overduePrincipal,
      overdue1_30,
      overdue31_90,
      overdue91_180,
      overdue181,
      turnoverDebit,
      turnoverCredit,
      turnoverNet: turnoverDebit - turnoverCredit,
      roa: ratio(netProfit, assets),
      roe: ratio(netProfit, capital),
      nim: ratio(netInterest, assets),
      costIncome: ratio(opex, operatingProfit + opex),
      capitalAdequacy: ratio(capital, assets),
      npl: ratio(overduePrincipal, grossLoans),
      reserveCoverage: overduePrincipal ? ratio(reserve, overduePrincipal) : 0,
      liquidity: liabilities ? ratio(cash + bankDeposits, borrowedFunds || liabilities) : 0,
      leverage: capital ? liabilities / capital : 0,
    };
  });

  const latest = series[series.length - 1] ?? null;
  const prev = series.length >= 2 ? series[series.length - 2] : null;

  // ── Davrlararo diff (oxirgi 2 hisobot) — yangi / yo'qolgan / o'zgargan ──
  const deltas = { balance: [] as DeltaRow[], income: [] as DeltaRow[] };
  if (latest && prev) {
    const lastRep = reports[reports.length - 1];
    const prevRep = reports[reports.length - 2];
    deltas.balance = diffLines(prevRep.balanceLines, lastRep.balanceLines);
    deltas.income = diffLines(prevRep.incomeLines, lastRep.incomeLines);
  }

  // ── Ma'lumot sifati / qamrov ──
  const quality = buildQuality(reports.map((r) => r.reportDate));

  // ── Oborotka (oxirgi hisobot) — eng faol va eng katta farqli hisobvaraqlar ──
  const latestReportId = reports[reports.length - 1]?.id;
  const ledger = {
    totalDebit: latest?.turnoverDebit ?? 0,
    totalCredit: latest?.turnoverCredit ?? 0,
    diff: latest?.turnoverNet ?? 0,
    topByTurnover: [] as LedgerTurnoverRow[],
    topByDiff: [] as LedgerTurnoverRow[],
  };
  const borrowers = {
    total: 0,
    overdueCount: 0,
    top: [] as TopBorrower[],
    topOverdue: [] as TopBorrower[],
  };

  if (latestReportId) {
    // Faqat oxirgi darajadagi (detal) hisobvaraqlar: 5 xonali kodlar,
    // bo'lim sarlavhalari (10000, 10100...) emas — ular ham keladi, lekin
    // oborotli bo'lganlarini olamiz.
    const accounts = await prisma.ledgerAccount.findMany({
      where: { reportId: latestReportId },
      select: {
        accountNo: true,
        name: true,
        turnoverDebit: true,
        turnoverCredit: true,
      },
    });
    const rows: LedgerTurnoverRow[] = accounts
      .map((a) => {
        const debit = num(a.turnoverDebit);
        const credit = num(a.turnoverCredit);
        return {
          accountNo: a.accountNo,
          name: a.name,
          debit,
          credit,
          diff: debit - credit,
        };
      })
      .filter((r) => r.debit !== 0 || r.credit !== 0);

    ledger.topByTurnover = [...rows]
      .sort((a, b) => b.debit + b.credit - (a.debit + a.credit))
      .slice(0, 12);
    ledger.topByDiff = [...rows]
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 12);

    // ── Qarz oluvchilar (ism-familiya) — oxirgi hisobotdan ──
    const loans = await prisma.loanItem.findMany({
      where: { reportId: latestReportId },
      select: {
        borrowerName: true,
        pinfl: true,
        balance: true,
        amount: true,
        overduePrincipal: true,
        rate: true,
      },
    });
    borrowers.total = loans.length;
    borrowers.overdueCount = loans.filter((l) => num(l.overduePrincipal) > 0).length;

    const mapped: TopBorrower[] = loans.map((l) => ({
      name: l.borrowerName,
      pinfl: l.pinfl,
      balance: num(l.balance),
      amount: num(l.amount),
      overdue: num(l.overduePrincipal),
      rate: l.rate != null ? num(l.rate) : null,
    }));
    borrowers.top = [...mapped]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 15);
    borrowers.topOverdue = mapped
      .filter((b) => b.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 15);
  }

  return { company, series, latest, prev, deltas, ledger, borrowers, quality };
}

function diffLines(
  prevLines: { code: string | null; value: unknown }[],
  currLines: { code: string | null; value: unknown }[],
): DeltaRow[] {
  type Line = { code: string | null; value: unknown; section?: unknown; label?: unknown };
  const prevMap = new Map<string, number>();
  for (const l of prevLines) if (l.code) prevMap.set(l.code, num(l.value as number));

  const out: DeltaRow[] = [];
  for (const l of currLines as Line[]) {
    if (!l.code) continue;
    const curr = num(l.value as number);
    const prevV = prevMap.get(l.code) ?? 0;
    if (curr === 0 && prevV === 0) continue; // ikkalasi ham bo'sh — e'tiborsiz
    const diff = curr - prevV;
    let status: DeltaRow["status"];
    if (prevV === 0 && curr !== 0) status = "new";
    else if (prevV !== 0 && curr === 0) status = "gone";
    else if (diff > 0) status = "up";
    else if (diff < 0) status = "down";
    else status = "same";
    out.push({
      code: l.code,
      label: String(l.label ?? ""),
      section: (l.section as string) ?? null,
      prev: prevV,
      curr,
      diff,
      pct: prevV === 0 ? null : pct(curr, prevV) - 100,
      status,
    });
  }
  // eng katta o'zgarish (absolyut) tepada
  out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return out;
}

function buildQuality(dates: Date[]) {
  const total = dates.length;
  if (total === 0)
    return {
      total: 0,
      first: null,
      last: null,
      daysAgo: null,
      spanDays: 0,
      gaps: 0,
      coverage: 0,
      avgGapDays: 0,
      missingDates: [],
    };

  const dayMs = 86400000;
  const norm = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const first = dates[0];
  const last = dates[total - 1];
  const spanDays = Math.round((norm(last) - norm(first)) / dayMs) + 1;
  const present = new Set(dates.map((d) => norm(d)));

  const missingDates: string[] = [];
  for (let t = norm(first); t <= norm(last); t += dayMs) {
    if (!present.has(t) && missingDates.length < 60) {
      const dd = new Date(t);
      missingDates.push(
        `${String(dd.getDate()).padStart(2, "0")}.${String(dd.getMonth() + 1).padStart(2, "0")}.${dd.getFullYear()}`,
      );
    }
  }

  const gaps = Math.max(0, spanDays - total);
  const coverage = spanDays > 0 ? Math.round((total / spanDays) * 100) : 100;
  const avgGapDays = total > 1 ? +((spanDays - 1) / (total - 1)).toFixed(1) : 0;
  const daysAgo = Math.round((norm(new Date()) - norm(last)) / dayMs);

  return {
    total,
    first: first.toISOString(),
    last: last.toISOString(),
    daysAgo,
    spanDays,
    gaps,
    coverage,
    avgGapDays,
    missingDates,
  };
}
