import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseWorkbook } from "@/lib/excel";
import { parseExcelDate } from "@/lib/format";
import { balanceSection } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Excel fayl tanlanmagan" }, { status: 400 });
  }

  const dateStr = String(form.get("reportDate") || "");
  const isConsolidated = String(form.get("isConsolidated") || "") === "true";

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseWorkbook(buffer);
  } catch {
    return NextResponse.json(
      { error: "Faylni o'qib bo'lmadi. .xls/.xlsx formatga ishonch hosil qiling." },
      { status: 422 },
    );
  }

  // Firma nomi: fayldan (CommonData) ustun, bo'lmasa formdan
  const companyName =
    parsed.company.name?.trim() || String(form.get("companyName") || "").trim();
  if (!companyName) {
    return NextResponse.json(
      { error: "Firma nomi aniqlanmadi (CommonData bo'sh)" },
      { status: 422 },
    );
  }

  // Hisobot sanasi: foydalanuvchi kiritgani ustun, bo'lmasa fayldan
  const reportDate =
    parseExcelDate(dateStr) || parsed.meta.reportDate || new Date();

  // Firma upsert
  const company = await prisma.company.upsert({
    where: { name: companyName },
    update: { region: parsed.company.region ?? undefined },
    create: { name: companyName, region: parsed.company.region },
  });

  // Shu firma + sana uchun avvalgi hisobot bo'lsa — almashtirish
  await prisma.report.deleteMany({
    where: { companyId: company.id, reportDate },
  });

  // Hisobot (PENDING)
  const report = await prisma.report.create({
    data: {
      companyId: company.id,
      reportDate,
      reportYear: parsed.meta.year,
      reportMonth: parsed.meta.month,
      reportDay: parsed.meta.day,
      status: "PENDING",
      isConsolidated,
      fileName: file.name,
      fileSize: buffer.length,
      uploadedById: session.adminId,
    },
  });

  try {
    // Xom sheetlar (har biri — data yo'qolmasin)
    for (const s of parsed.sheets) {
      await prisma.reportSheet.create({
        data: {
          reportId: report.id,
          name: s.name,
          orderIdx: s.orderIdx,
          title: s.title,
          rowCount: s.rowCount,
          colCount: s.colCount,
          data: s.data,
        },
      });
    }

    // Balans
    if (parsed.balance.length)
      await prisma.balanceLine.createMany({
        data: parsed.balance.map((b) => ({
          reportId: report.id,
          code: b.code,
          label: b.label,
          value: b.value,
          section: b.section ?? balanceSection(b.code),
          orderIdx: b.orderIdx,
        })),
      });

    // Moliyaviy natijalar
    if (parsed.income.length)
      await prisma.incomeLine.createMany({
        data: parsed.income.map((i) => ({
          reportId: report.id,
          code: i.code,
          label: i.label,
          value: i.value,
          section: i.section,
          orderIdx: i.orderIdx,
        })),
      });

    // Konsolidatsiya
    if (parsed.ledger.length)
      for (const c of chunk(parsed.ledger, 1000))
        await prisma.ledgerAccount.createMany({
          data: c.map((l) => ({ reportId: report.id, ...l })),
        });

    // Kredit portfeli (katta — bo'laklab)
    if (parsed.loans.length)
      for (const c of chunk(parsed.loans, 1000))
        await prisma.loanItem.createMany({
          data: c.map((l) => ({ reportId: report.id, ...l })),
        });

    // Jalb etilgan mablag'lar
    if (parsed.borrowed.length)
      await prisma.borrowedFund.createMany({
        data: parsed.borrowed.map((b) => ({ reportId: report.id, ...b })),
      });

    // Normativlar
    if (parsed.norms.length)
      await prisma.norm.createMany({
        data: parsed.norms.map((n) => ({ reportId: report.id, ...n })),
      });
  } catch (e) {
    // Xato bo'lsa — yarim yozilgan hisobotni o'chirish
    await prisma.report.delete({ where: { id: report.id } }).catch(() => {});
    return NextResponse.json(
      { error: "Ma'lumotni saqlashda xatolik: " + (e as Error).message },
      { status: 500 },
    );
  }

  // Tasdiqlash uchun umumiy info
  const assets = parsed.balance.find((b) => b.code === "120")?.value ?? 0;
  const liabilities = parsed.balance.find((b) => b.code === "280")?.value ?? 0;
  const capital = parsed.balance.find((b) => b.code === "360")?.value ?? 0;
  const profit = parsed.income.find((i) => i.code === "1200")?.value ?? 0;

  return NextResponse.json({
    reportId: report.id,
    summary: {
      company: companyName,
      region: parsed.company.region,
      reportDate: reportDate.toISOString(),
      sheets: parsed.sheets.length,
      loans: parsed.loans.length,
      ledger: parsed.ledger.length,
      balanceLines: parsed.balance.length,
      borrowed: parsed.borrowed.length,
      norms: parsed.norms.length,
      assets,
      liabilities,
      capital,
      profit,
    },
  });
}
