// Konstantalar — sheet nomlari, enum kodlari va inson o'qiydigan yorliqlar

/** Asosiy sheet nomlari (krill) — parserda aniqlash uchun */
export const SHEET = {
  COMMON: "CommonData",
  CONSOLIDATED: "Консолидирован",
  BALANCE: "Баланс",
  INCOME: "Молиявий_натижалар",
  LOANS: "Кредит портфели",
  BORROWED: "жалб этилган",
  NORMS: "Нормативлар",
} as const;

/** Qarzdor subyekt turi */
export const SUBJECT_TYPE: Record<number, string> = {
  1: "Yuridik shaxs",
  2: "YATT",
  3: "O'zini band qilgan",
  4: "Jismoniy shaxs",
};

/** Kredit turi */
export const LOAN_TYPE: Record<number, string> = {
  1: "Iste'mol",
  2: "Mikrokredit",
  3: "Mikroqarz",
  4: "Lizing",
};

/** Ta'minot turi */
export const COLLATERAL_TYPE: Record<number, string> = {
  0: "Ta'minlanmagan",
  1: "Ko'chmas mulk",
  2: "Transport",
  3: "Qimmatliklar",
  4: "Boshqalar",
};

/**
 * Balans bo'limini MATN orqali aniqlash.
 *
 * Eski (xato) usul kod oralig'iga tayangan edi: 10–120 AKTIV, 210–280 ...
 * Bu shablon o'zgarsa yoki kodlar siljisa buziladi.
 *
 * To'g'ri usul: balans varag'idagi bo'lim sarlavhalari (АКТИВЛАР /
 * МАЖБУРИЯТЛАР / КАПИТАЛ) — bular Excelda SARIQ rang bilan belgilangan
 * kodsiz qatorlar. Shu sarlavha matni bo'yicha joriy bo'limni aniqlaymiz.
 *
 * @param text  qator matni (sarlavha bo'lishi mumkin)
 * @returns AKTIV | MAJBURIYAT | KAPITAL — agar matn bo'lim sarlavhasi bo'lsa, aks holda null
 */
export function detectBalanceSection(text: string | null): string | null {
  if (!text) return null;
  const u = text.toUpperCase();
  // Tartib muhim: "МАЖБУРИЯТЛАР ва КАПИТАЛ" ikkalasini ham o'z ichiga oladi —
  // uni majburiyat bo'limining boshlanishi deb qabul qilamiz.
  if (u.includes("АКТИВ")) return "AKTIV";
  if (u.includes("МАЖБУРИЯТ")) return "MAJBURIYAT";
  if (u.includes("КАПИТАЛ")) return "KAPITAL";
  return null;
}

/**
 * Eskича — endi faqat zaxira (fallback) sifatida ishlatiladi.
 * @deprecated matn orqali aniqlash (detectBalanceSection) afzal.
 */
export function balanceSection(code: string | null): string | null {
  if (!code) return null;
  const n = parseInt(code);
  if (isNaN(n)) return null;
  if (n >= 10 && n <= 120) return "AKTIV";
  if (n >= 210 && n <= 280) return "MAJBURIYAT";
  if (n >= 310 && n <= 370) return "KAPITAL";
  return null;
}

export const PAGE_SIZES = [25, 50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;

/** O'zbekiston hududlari (14 ta) — firma qo'shishda dropdown uchun */
export const UZ_REGIONS = [
  "Qoraqalpog'iston Respublikasi",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
  "Toshkent viloyati",
  "Toshkent shahri",
] as const;

/** Hisobot davri filtri uchun oraliqlar */
export const PERIOD_FILTERS = [
  { key: "all", label: "Barchasi" },
  { key: "daily", label: "Kunlik (so'nggi)" },
  { key: "thisMonth", label: "Bu oy" },
  { key: "lastMonth", label: "O'tgan oy" },
  { key: "last6", label: "Oxirgi 6 oy" },
  { key: "last12", label: "Oxirgi 12 oy" },
  { key: "thisYear", label: "Shu yil" },
] as const;

export type PeriodKey = (typeof PERIOD_FILTERS)[number]["key"];

/** Period kalitidan sana oralig'ini (from/to) hisoblaydi */
export function periodRange(key: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "thisMonth":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59) };
    case "lastMonth":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59) };
    case "last6":
      return { from: new Date(y, m - 5, 1), to: now };
    case "last12":
      return { from: new Date(y, m - 11, 1), to: now };
    case "thisYear":
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59) };
    default:
      return { from: null, to: null };
  }
}

/** O'zbek oylari (CommonData "Отчетный месяц" -> raqam) */
export const UZ_MONTHS: Record<string, number> = {
  янв: 1, фев: 2, мар: 3, апр: 4, май: 5, июн: 6,
  июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
  yanvar: 1, fevral: 2, mart: 3, aprel: 4, may: 5, iyun: 6,
  iyul: 7, avgust: 8, sentyabr: 9, oktyabr: 10, noyabr: 11, dekabr: 12,
};

/** Hujjat fayl turini kengaytma/mime bo'yicha aniqlash */
export function detectFileKind(fileName: string, mime?: string | null): string {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext))
    return "image";
  if (m.includes("spreadsheet") || ["xls", "xlsx", "xlsm"].includes(ext)) return "excel";
  if (ext === "csv" || m === "text/csv") return "csv";
  if (ext === "pdf" || m === "application/pdf") return "pdf";
  if (["doc", "docx"].includes(ext) || m.includes("word")) return "word";
  return "other";
}

/** Hujjat yuklash uchun ruxsat etilgan kengaytmalar */
export const DOC_ALLOWED_EXT = [
  "png", "jpg", "jpeg", "webp", "gif", "svg", "bmp",
  "xls", "xlsx", "xlsm", "csv",
  "pdf", "doc", "docx", "txt",
];

export const DOC_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
