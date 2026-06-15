import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";
import { num } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { LOAN_TYPE, SUBJECT_TYPE, COLLATERAL_TYPE } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

function safeName(name: string, used: Set<string>): string {
  let n = name.replace(/[\\/?*[\]:]/g, "_").slice(0, 28);
  let base = n;
  let i = 1;
  while (used.has(n)) n = `${base.slice(0, 25)}_${i++}`;
  used.add(n);
  return n;
}

function download(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const reportId = Number(id);
  const type = req.nextUrl.searchParams.get("type") ?? "all";
  if (!Number.isFinite(reportId))
    return NextResponse.json({ error: "Noto'g'ri id" }, { status: 400 });

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { company: true },
  });
  if (!report)
    return NextResponse.json({ error: "Hisobot topilmadi" }, { status: 404 });

  const datePart = formatDate(report.reportDate).replace(/\./g, "-");
  const namePart = report.company.name.replace(/[^\p{L}\d]+/gu, "_").slice(0, 30);

  // ── To'liq paket: barcha xom varaqlar ──
  if (type === "all") {
    const sheets = await prisma.reportSheet.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    const wb = XLSX.utils.book_new();
    const used = new Set<string>();
    for (const s of sheets) {
      const grid = (s.data as unknown as string[][]) ?? [];
      const ws = XLSX.utils.aoa_to_sheet(grid.length ? grid : [[""]]);
      XLSX.utils.book_append_sheet(wb, ws, safeName(s.name, used));
    }
    return download(wb, `${namePart}_${datePart}_toliq.xlsx`);
  }

  // ── Kredit portfeli ──
  if (type === "loans") {
    const loans = await prisma.loanItem.findMany({
      where: { reportId },
      orderBy: { rowNo: "asc" },
    });
    const header = [
      "№", "Ҳ/в", "Ҳудуд", "Туман", "Қарздор", "ЖШШИР", "Субъект тури",
      "Алоқадорлик", "Сумма", "Қолдиқ", "Захира", "Фоиз", "Йил.фоиз %",
      "Берилган", "Қайтариш", "Кредит тури", "Таъминот", "Таъминот қиймати",
      "Муддати ўтган", "1-30", "31-90", "91-180", "181+", "Ўтган фоиз",
    ];
    const data = loans.map((l) => [
      l.rowNo, l.account, l.regionCode, l.districtCode, l.borrowerName, l.pinfl,
      SUBJECT_TYPE[l.subjectType ?? 0] ?? "", l.related,
      num(l.amount), num(l.balance), num(l.reserve), num(l.accruedInterest),
      l.rate ? num(l.rate) : "", formatDate(l.issuedAt), formatDate(l.dueAt),
      LOAN_TYPE[l.loanType ?? 0] ?? "", COLLATERAL_TYPE[l.collateralType ?? -1] ?? "",
      num(l.collateralValue), num(l.overduePrincipal),
      num(l.overdue1_30), num(l.overdue31_90), num(l.overdue91_180),
      num(l.overdue181), num(l.overdueInterest),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kredit portfeli");
    return download(wb, `${namePart}_${datePart}_kredit.xlsx`);
  }

  // ── Konsolidatsiya ──
  if (type === "ledger") {
    const acc = await prisma.ledgerAccount.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    const header = [
      "Ҳисобварақ", "Номи", "Бошланғич Дебет", "Бошланғич Кредit",
      "Оборот Дебет", "Оборот Кредит", "Охирги Дебет", "Охирги Кредит",
    ];
    const data = acc.map((a) => [
      a.accountNo, a.name, num(a.openDebit), num(a.openCredit),
      num(a.turnoverDebit), num(a.turnoverCredit), num(a.closeDebit), num(a.closeCredit),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Konsolidatsiya");
    return download(wb, `${namePart}_${datePart}_schotlar.xlsx`);
  }

  // ── Balans / Foyda ──
  if (type === "balance" || type === "income") {
    const lines =
      type === "balance"
        ? await prisma.balanceLine.findMany({ where: { reportId }, orderBy: { orderIdx: "asc" } })
        : await prisma.incomeLine.findMany({ where: { reportId }, orderBy: { orderIdx: "asc" } });
    const data = [
      ["Код", "Кўрсаткич", "Қиймат (минг сўм)"],
      ...lines.map((l) => [l.code ?? "", l.label, num(l.value)]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "balance" ? "Balans" : "Foyda-zarar");
    return download(wb, `${namePart}_${datePart}_${type}.xlsx`);
  }

  return NextResponse.json({ error: "Noto'g'ri tur" }, { status: 400 });
}
