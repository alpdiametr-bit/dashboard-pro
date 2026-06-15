import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseWorkbook } from "@/lib/excel";
import { parseExcelDate } from "@/lib/format";
import { detectBalanceSection } from "@/lib/constants";
import { audit } from "@/lib/audit";

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
  const selectedCompanyId = Number(form.get("companyId")) || null;

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

  // Firma: agar dropdownda tanlangan bo'lsa — o'sha firma (filial) ishlatiladi.
  // Aks holda fayldagi (CommonData) nom bo'yicha aniqlanadi/yaratiladi.
  let company;
  let companyName: string;

  if (selectedCompanyId) {
    const found = await prisma.company.findUnique({
      where: { id: selectedCompanyId },
    });
    if (!found) {
      return NextResponse.json(
        { error: "Tanlangan firma topilmadi" },
        { status: 404 },
      );
    }
    company = found;
    companyName = found.name;
    // Region bo'sh bo'lsa — fayldan to'ldiramiz
    if (!found.region && parsed.company.region) {
      await prisma.company.update({
        where: { id: found.id },
        data: { region: parsed.company.region },
      });
    }
  } else {
    companyName =
      parsed.company.name?.trim() || String(form.get("companyName") || "").trim();
    if (!companyName) {
      return NextResponse.json(
        { error: "Firma nomi aniqlanmadi (CommonData bo'sh). Firmani ro'yxatdan tanlang." },
        { status: 422 },
      );
    }
    company = await prisma.company.upsert({
      where: { name: companyName },
      update: { region: parsed.company.region ?? undefined },
      create: { name: companyName, region: parsed.company.region },
    });
  }

  // Hisobot sanasi: foydalanuvchi kiritgani ustun, bo'lmasa fayldan.
  // parseExcelDate/parseWorkbook endi UTC yarim tun qaytaradi. Qo'shimcha
  // himoya sifatida UTC getter bilan qайта normallashtirib, `@db.Date` ga
  // saqlash, qidiruv, deleteMany va unique konstreynt bir xil kun ishlatadi.
  const rawDate =
    parseExcelDate(dateStr) || parsed.meta.reportDate || new Date();
  const reportDate = new Date(
    Date.UTC(
      rawDate.getUTCFullYear(),
      rawDate.getUTCMonth(),
      rawDate.getUTCDate(),
    ),
  );
  // Kun oralig'i — @db.Date ustunda aniq tenglik (vaqt/timezone) nomuvofiqligini
  // chetlab o'tish uchun qidiruv/o'chirishni [kun_boshi, keyingi_kun) oralig'ida
  // bajaramiz. Shunda eski qator albatta topiladi va o'chiriladi.
  const dayStart = reportDate;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const force = String(form.get("force") || "") === "true";

  // Shu firma + sana uchun avvalgi hisobot bormi? (fayl nomi/sana bir xil holat)
  const existing = await prisma.report.findFirst({
    where: { companyId: company.id, reportDate: { gte: dayStart, lt: dayEnd } },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      status: true,
      createdAt: true,
    },
  });

  // Mavjud bo'lsa va foydalanuvchi tasdiqlamagan bo'lsa — KONFLIKT qaytaramiz.
  // Jimgina o'chirmaymiz: avval modalda qat'iy so'raladi.
  if (existing && !force) {
    return NextResponse.json(
      {
        conflict: true,
        existing: {
          id: existing.id,
          fileName: existing.fileName,
          fileSize: existing.fileSize,
          status: existing.status,
          createdAt: existing.createdAt.toISOString(),
          reportDate: reportDate.toISOString(),
          company: companyName,
        },
        newFileName: file.name,
      },
      { status: 409 },
    );
  }

  // Tasdiqlangan bo'lsa — eski hisobotni o'chirib, auditga QAYSI fayl ekanini yozamiz.
  // MUHIM: delete xatosini YUTMAYMIZ — aks holda quyidagi create unique
  // konstreyntga uriladi (Report_companyId_reportDate_key). deleteMany
  // idempotent: yo'q bo'lsa ham xato bermaydi, kaskad (sheets/loans...) tugaydi.
  if (existing && force) {
    await prisma.report.deleteMany({
      where: { companyId: company.id, reportDate: { gte: dayStart, lt: dayEnd } },
    });
    await audit({
      action: "DELETE",
      adminId: session.adminId,
      login: session.login,
      adminName: session.name,
      reportId: existing.id,
      companyName,
      message: `Almashtirildi — eski hisobot o'chirildi: ${existing.fileName}`,
      meta: {
        oldFileName: existing.fileName,
        oldFileSize: existing.fileSize,
        replacedWith: file.name,
        reportDate: reportDate.toISOString(),
        reason: "duplicate-replace",
      },
      req,
    });
  }

  // Hisobot (PENDING). Xavfsizlik to'ri: aniq tenglik o'rniga kun oralig'i bilan
  // har qanday eski qatorni (vaqt/timezone farqi bo'lsa ham) tozalab, qayta
  // yaratamiz — unique konstreyntga (firma+sana) urilmaslik uchun.
  const reportData = {
    companyId: company.id,
    reportDate,
    reportYear: parsed.meta.year,
    reportMonth: parsed.meta.month,
    reportDay: parsed.meta.day,
    status: "PENDING" as const,
    isConsolidated,
    fileName: file.name,
    fileSize: buffer.length,
    uploadedById: session.adminId,
  };

  let report;
  try {
    report = await prisma.report.create({ data: reportData });
  } catch {
    // Unique konstreynt (bir xil firma+sana) — eskisini kun oralig'i bo'yicha
    // tozalab qayta yaratamiz
    await prisma.report.deleteMany({
      where: { companyId: company.id, reportDate: { gte: dayStart, lt: dayEnd } },
    });
    report = await prisma.report.create({ data: reportData });
  }

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
          section: b.section ?? detectBalanceSection(b.label),
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
    await audit({
      action: "UPLOAD",
      success: false,
      adminId: session.adminId,
      login: session.login,
      adminName: session.name,
      companyName,
      message: "Saqlashda xatolik: " + (e as Error).message,
      meta: { fileName: file.name },
      req,
    });
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

  await audit({
    action: "UPLOAD",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    reportId: report.id,
    companyName,
    message: `Hisobot yuklandi: ${file.name}`,
    meta: {
      fileName: file.name,
      fileSize: buffer.length,
      reportDate: reportDate.toISOString(),
      sheets: parsed.sheets.length,
      loans: parsed.loans.length,
      ledger: parsed.ledger.length,
      isConsolidated,
    },
    req,
  });

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
