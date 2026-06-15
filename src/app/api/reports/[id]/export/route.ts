import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import * as XLSX from "xlsx";
import { num } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { LOAN_TYPE, SUBJECT_TYPE, COLLATERAL_TYPE } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

type ExportCtx = {
  req: NextRequest;
  adminId: number;
  login: string;
  adminName: string | null;
  reportId: number;
  companyName: string;
  type: string;
};

function safeName(name: string, used: Set<string>): string {
  let n = name.replace(/[\\/?*[\]:]/g, "_").slice(0, 28);
  const base = n;
  let i = 1;
  while (used.has(n)) n = `${base.slice(0, 25)}_${i++}`;
  used.add(n);
  return n;
}

async function download(
  wb: XLSX.WorkBook,
  filename: string,
  ctx: ExportCtx,
) {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  await audit({
    action: "EXPORT",
    adminId: ctx.adminId,
    login: ctx.login,
    adminName: ctx.adminName,
    reportId: ctx.reportId,
    companyName: ctx.companyName,
    message: `Eksport: ${ctx.type}`,
    meta: { type: ctx.type, fileName: filename, sheets: wb.SheetNames.length },
    req: ctx.req,
  });
  // ASCII fallback + RFC 5987 (filename*) — kirill nomli fayllar uchun
  const asciiName = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
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

  const ctx: ExportCtx = {
    req,
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    reportId,
    companyName: report.company.name,
    type,
  };

  // ── To'liq paket: barcha xom varaqlar ──
  if (type === "all") {
    // DIQQAT: orderBy ni DB da QILMAYMIZ — sheet.data katta JSON, MySQL uni
    // saralashda "Out of sort memory" (1038) beradi. JS da saralaymiz.
    const sheets = await prisma.reportSheet.findMany({
      where: { reportId },
    });
    sheets.sort((a, b) => a.orderIdx - b.orderIdx);
    const wb = XLSX.utils.book_new();
    const used = new Set<string>();

    if (sheets.length > 0) {
      for (const s of sheets) {
        const grid = (s.data as unknown as string[][]) ?? [];
        const ws = XLSX.utils.aoa_to_sheet(grid.length ? grid : [[""]]);
        XLSX.utils.book_append_sheet(wb, ws, safeName(s.name, used));
      }
    } else {
      // Xom varaqlar yo'q bo'lsa — strukturali jadvallardan yig'amiz
      const [balance, income, ledger, loans] = await Promise.all([
        prisma.balanceLine.findMany({ where: { reportId }, orderBy: { orderIdx: "asc" } }),
        prisma.incomeLine.findMany({ where: { reportId }, orderBy: { orderIdx: "asc" } }),
        prisma.ledgerAccount.findMany({ where: { reportId }, orderBy: { orderIdx: "asc" } }),
        prisma.loanItem.findMany({ where: { reportId }, orderBy: { rowNo: "asc" } }),
      ]);
      if (balance.length) {
        const ws = XLSX.utils.aoa_to_sheet([
          ["Код", "Кўрсаткич", "Қиймат"],
          ...balance.map((l) => [l.code ?? "", l.label, num(l.value)]),
        ]);
        XLSX.utils.book_append_sheet(wb, ws, safeName("Balans", used));
      }
      if (income.length) {
        const ws = XLSX.utils.aoa_to_sheet([
          ["Код", "Кўрсаткич", "Қиймат"],
          ...income.map((l) => [l.code ?? "", l.label, num(l.value)]),
        ]);
        XLSX.utils.book_append_sheet(wb, ws, safeName("Foyda-zarar", used));
      }
      if (ledger.length) {
        const ws = XLSX.utils.aoa_to_sheet([
          ["Ҳисобварақ", "Номи", "Бошл.Дебет", "Бошл.Кредит", "Об.Дебет", "Об.Кредит", "Охир.Дебет", "Охир.Кредит"],
          ...ledger.map((a) => [
            a.accountNo, a.name, num(a.openDebit), num(a.openCredit),
            num(a.turnoverDebit), num(a.turnoverCredit), num(a.closeDebit), num(a.closeCredit),
          ]),
        ]);
        XLSX.utils.book_append_sheet(wb, ws, safeName("Konsolidatsiya", used));
      }
      if (loans.length) {
        const ws = XLSX.utils.aoa_to_sheet([
          ["№", "Қарздор", "ЖШШИР", "Сумма", "Қолдиқ", "Муддати ўтган"],
          ...loans.map((l) => [
            l.rowNo, l.borrowerName, l.pinfl, num(l.amount), num(l.balance), num(l.overduePrincipal),
          ]),
        ]);
        XLSX.utils.book_append_sheet(wb, ws, safeName("Kredit portfeli", used));
      }
    }

    // Hech narsa bo'lmasa — bo'sh varaq (xatolik o'rniga)
    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([["Ma'lumot yo'q"]]),
        "Bo'sh",
      );
    }
    return download(wb, `${namePart}_${datePart}_toliq.xlsx`, ctx);
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
    return download(wb, `${namePart}_${datePart}_kredit.xlsx`, ctx);
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
    return download(wb, `${namePart}_${datePart}_schotlar.xlsx`, ctx);
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
    return download(wb, `${namePart}_${datePart}_${type}.xlsx`, ctx);
  }

  // ── Jalb etilgan mablag'lar ──
  if (type === "borrowed") {
    const funds = await prisma.borrowedFund.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    const header = [
      "№", "Кредитор", "Сумма", "Қолдиқ", "Йил.фоиз %", "Жалб этилган", "Қайтариш",
    ];
    const data = funds.map((f) => [
      f.rowNo,
      f.creditorName,
      num(f.amount),
      num(f.balance),
      f.rate ? num(f.rate) : "",
      formatDate(f.issuedAt),
      formatDate(f.dueAt),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jalb etilgan");
    return download(wb, `${namePart}_${datePart}_jalb.xlsx`, ctx);
  }

  // ── Normativlar ──
  if (type === "norms") {
    const norms = await prisma.norm.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    const data = [
      ["Код", "Кўрсаткич", "Меъёр", "Амалда"],
      ...norms.map((n) => [n.code ?? "", n.indicator, n.norm ?? "", n.actual ?? ""]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Normativlar");
    return download(wb, `${namePart}_${datePart}_normativ.xlsx`, ctx);
  }

  return NextResponse.json({ error: "Noto'g'ri tur" }, { status: 400 });
}
