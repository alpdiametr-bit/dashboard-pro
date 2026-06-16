import { prisma } from "./prisma";

// ─────────────────────────────────────────────────────────────────────────
// AI yordamchi — XAVFSIZ SO'ROV SXEMASI.
// MUHIM: AI ga HECH QANDAY moliyaviy DATA berilmaydi. Faqat:
//   1) Prisma model sxemasi (qaysi jadval, qaysi ustun bor)
//   2) Katalog (firma nomlari/id, mavjud hisobot sanalari)
// AI shu asosda STRUKTURALI so'rov rejasini (QuerySpec) qaytaradi.
// Server uni shu yerdagi WHITELIST bo'yicha tekshirib, o'qish (read-only)
// so'rovini bajaradi. eval/raw SQL YO'Q — faqat ruxsat etilgan maydonlar.
// ─────────────────────────────────────────────────────────────────────────

export type FieldType = "int" | "decimal" | "string" | "date" | "bool";

type ModelDef = {
  /** Prisma delegate nomi (camelCase) */
  delegate: string;
  /** Ruxsat etilgan maydonlar va turlari */
  fields: Record<string, FieldType>;
  /** Ruxsat etilgan relation filtrlar: localKey -> bog'liq model nomi */
  relations?: Record<string, string>;
  /** O'zbekcha izoh (prompt uchun) */
  note: string;
};

export const MODELS: Record<string, ModelDef> = {
  company: {
    delegate: "company",
    note: "Firmalar (MFO tashkilotlari)",
    fields: {
      id: "int",
      name: "string",
      region: "string",
      inn: "string",
      isPinned: "bool",
      createdAt: "date",
    },
  },
  report: {
    delegate: "report",
    note: "Hisobotlar — har firma har sanaga bitta (kunlik snapshot)",
    fields: {
      id: "int",
      companyId: "int",
      reportDate: "date",
      reportYear: "int",
      reportMonth: "string",
      reportDay: "int",
      status: "string", // PENDING | CONFIRMED
      isConsolidated: "bool",
      isPinned: "bool",
      fileName: "string",
      createdAt: "date",
      confirmedAt: "date",
    },
    relations: { company: "company" },
  },
  balanceLine: {
    delegate: "balanceLine",
    note: "Balans qatorlari (4-ilova). Muhim kodlar: 120=jami aktiv, 280=jami majburiyat, 360=jami kapital, 50=kreditlar, 51=zaxira, 52=sof kredit, 10=kassa, 210=jalb etilgan",
    fields: {
      id: "int",
      reportId: "int",
      code: "string",
      label: "string",
      value: "decimal",
      section: "string", // AKTIV | MAJBURIYAT | KAPITAL
      orderIdx: "int",
    },
    relations: { report: "report" },
  },
  incomeLine: {
    delegate: "incomeLine",
    note: "Moliyaviy natijalar (5-ilova). Muhim kodlar: 180=foizli daromad, 270=foizli harajat, 310=sof foizli daromad, 600=operatsion foyda, 1200=sof foyda",
    fields: {
      id: "int",
      reportId: "int",
      code: "string",
      label: "string",
      value: "decimal",
      section: "string",
      orderIdx: "int",
    },
    relations: { report: "report" },
  },
  loanItem: {
    delegate: "loanItem",
    note: "Kredit portfeli (7-ilova) — har bir qarzdor alohida qator. balance=qoldiq, overduePrincipal=muddati o'tgan asosiy qarz",
    fields: {
      id: "int",
      reportId: "int",
      borrowerName: "string",
      pinfl: "string",
      regionCode: "string",
      districtCode: "string",
      subjectType: "int",
      amount: "decimal",
      balance: "decimal",
      reserve: "decimal",
      accruedInterest: "decimal",
      rate: "decimal",
      issuedAt: "date",
      dueAt: "date",
      loanType: "int",
      collateralType: "int",
      collateralValue: "decimal",
      overduePrincipal: "decimal",
      overdue1_30: "decimal",
      overdue31_90: "decimal",
      overdue91_180: "decimal",
      overdue181: "decimal",
      overdueInterest: "decimal",
    },
    relations: { report: "report" },
  },
  ledgerAccount: {
    delegate: "ledgerAccount",
    note: "Konsolidatsiya/oborotka (3-ilova) — hisobvaraqlar bo'yicha debet/kredit oborot",
    fields: {
      id: "int",
      reportId: "int",
      accountNo: "string",
      name: "string",
      openDebit: "decimal",
      openCredit: "decimal",
      turnoverDebit: "decimal",
      turnoverCredit: "decimal",
      closeDebit: "decimal",
      closeCredit: "decimal",
      orderIdx: "int",
    },
    relations: { report: "report" },
  },
  borrowedFund: {
    delegate: "borrowedFund",
    note: "Jalb etilgan mablag'lar (10-ilova) — kreditorlar (banklar)",
    fields: {
      id: "int",
      reportId: "int",
      creditorName: "string",
      amount: "decimal",
      balance: "decimal",
      rate: "decimal",
      issuedAt: "date",
      dueAt: "date",
      orderIdx: "int",
    },
    relations: { report: "report" },
  },
  norm: {
    delegate: "norm",
    note: "Prudensial normativlar (12-ilova)",
    fields: {
      id: "int",
      reportId: "int",
      code: "string",
      indicator: "string",
      norm: "string",
      actual: "string",
      orderIdx: "int",
    },
    relations: { report: "report" },
  },
};

/** Ustun sarlavhalari (UI jadval uchun) — o'zbekcha */
export const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  name: "Nomi",
  region: "Hudud",
  inn: "STIR",
  companyId: "Firma",
  reportDate: "Sana",
  reportYear: "Yil",
  reportMonth: "Oy",
  reportDay: "Kun",
  status: "Holat",
  isConsolidated: "Konsolidatsiya",
  isPinned: "Qadalgan",
  fileName: "Fayl",
  createdAt: "Yaratilgan",
  confirmedAt: "Tasdiqlangan",
  code: "Kod",
  label: "Ko'rsatkich",
  value: "Qiymat",
  section: "Bo'lim",
  accountNo: "Hisobvaraq",
  openDebit: "Boshl. debet",
  openCredit: "Boshl. kredit",
  turnoverDebit: "Oborot debet",
  turnoverCredit: "Oborot kredit",
  closeDebit: "Oxirgi debet",
  closeCredit: "Oxirgi kredit",
  borrowerName: "Qarzdor",
  pinfl: "JSHSHIR/STIR",
  amount: "Summa",
  balance: "Qoldiq",
  reserve: "Zaxira",
  accruedInterest: "Hisoblangan foiz",
  rate: "Foiz stavka",
  issuedAt: "Berilgan",
  dueAt: "Qaytarish",
  loanType: "Kredit turi",
  subjectType: "Subyekt turi",
  collateralType: "Taminot turi",
  collateralValue: "Taminot qiymati",
  overduePrincipal: "Muddati o'tgan",
  overdue1_30: "1-30 kun",
  overdue31_90: "31-90 kun",
  overdue91_180: "91-180 kun",
  overdue181: "181+ kun",
  overdueInterest: "Muddati o'tgan foiz",
  creditorName: "Kreditor",
  indicator: "Normativ",
  norm: "Me'yor",
  actual: "Amalda",
  orderIdx: "Tartib",
  count: "Soni",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/**
 * Har model uchun "boy" standart ustunlar (findMany select bo'sh yoki tor
 * bo'lganda ishlatiladi) — jadval to'liqroq va foydali chiqishi uchun.
 * report relation maydonlari (companyId, reportDate) ham kiritiladi.
 */
export const DEFAULT_SELECT: Record<string, string[]> = {
  company: ["id", "name", "region", "inn", "createdAt"],
  report: ["id", "companyId", "reportDate", "status", "isConsolidated", "fileName"],
  balanceLine: ["companyId", "reportDate", "code", "label", "section", "value"],
  incomeLine: ["companyId", "reportDate", "code", "label", "section", "value"],
  loanItem: [
    "companyId",
    "reportDate",
    "borrowerName",
    "pinfl",
    "amount",
    "balance",
    "reserve",
    "rate",
    "overduePrincipal",
    "dueAt",
  ],
  ledgerAccount: [
    "companyId",
    "reportDate",
    "accountNo",
    "name",
    "turnoverDebit",
    "turnoverCredit",
    "closeDebit",
    "closeCredit",
  ],
  borrowedFund: [
    "companyId",
    "reportDate",
    "creditorName",
    "amount",
    "balance",
    "rate",
    "dueAt",
  ],
  norm: ["companyId", "reportDate", "code", "indicator", "norm", "actual"],
};

/** Maydon raqamli (sum/avg uchun) ekanligini tekshiradi */
export function isNumericField(model: string, field: string): boolean {
  const t = MODELS[model]?.fields[field];
  return t === "decimal" || t === "int";
}

/** Modelga tegishli maydon turini qaytaradi */
export function fieldType(model: string, field: string): FieldType | null {
  return MODELS[model]?.fields[field] ?? null;
}

/** Prompt uchun sxema matni (faqat tuzilma — DATA emas) */
export function schemaText(): string {
  const lines: string[] = [];
  for (const [name, def] of Object.entries(MODELS)) {
    lines.push(`model ${name} — ${def.note}`);
    const fl = Object.entries(def.fields)
      .map(([f, t]) => `${f}:${t}`)
      .join(", ");
    lines.push(`  maydonlar: ${fl}`);
    if (def.relations)
      lines.push(`  relation filtrlar: ${Object.keys(def.relations).join(", ")}`);
  }
  return lines.join("\n");
}

export type Catalog = {
  companies: { id: number; name: string; region: string | null }[];
  dateRange: { min: string | null; max: string | null };
  reportDates: string[]; // distinct sanalar (ISO yyyy-mm-dd)
  totalReports: number;
};

/** Katalog — AI sana/firma nomini to'g'ri tanlashi uchun (DATA emas, faqat ro'yxat) */
export async function buildCatalog(): Promise<Catalog> {
  const [companies, reports] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true, region: true },
      orderBy: { name: "asc" },
    }),
    prisma.report.findMany({
      select: { reportDate: true },
      orderBy: { reportDate: "asc" },
    }),
  ]);

  const dateSet = new Set<string>();
  for (const r of reports) dateSet.add(r.reportDate.toISOString().slice(0, 10));
  const dates = [...dateSet];

  return {
    companies,
    dateRange: { min: dates[0] ?? null, max: dates[dates.length - 1] ?? null },
    reportDates: dates,
    totalReports: reports.length,
  };
}

export function catalogText(cat: Catalog): string {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const months = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
  ];
  const lines: string[] = [];
  lines.push(
    `BUGUNGI SANA: ${today} (${now.getUTCDate()}-${months[now.getUTCMonth()]} ${now.getUTCFullYear()}).`,
  );
  lines.push(
    `Joriy yil=${now.getUTCFullYear()}, joriy oy=${String(now.getUTCMonth() + 1).padStart(2, "0")} (${months[now.getUTCMonth()]}).`,
  );
  lines.push(
    `"Bu oy"=${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}, "bu yil"=${now.getUTCFullYear()}.`,
  );
  lines.push("");
  lines.push(`Firmalar (${cat.companies.length}):`);
  for (const c of cat.companies)
    lines.push(`  • id=${c.id} "${c.name}"${c.region ? ` [${c.region}]` : ""}`);
  lines.push(
    `Hisobot sanalari oralig'i: ${cat.dateRange.min ?? "—"} … ${cat.dateRange.max ?? "—"} (jami ${cat.totalReports} hisobot, ${cat.reportDates.length} xil sana)`,
  );
  lines.push(`Mavjud sanalar: ${cat.reportDates.join(", ") || "—"}`);
  lines.push(
    `MUHIM: foydalanuvchi sanani aytmasa, eng so'nggi mavjud sana (${cat.dateRange.max ?? "—"}) dan foydalan.`,
  );
  return lines.join("\n");
}
