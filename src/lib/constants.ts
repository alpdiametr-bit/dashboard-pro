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

/** Balans bo'limlari (kod oralig'i) */
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

/** O'zbek oylari (CommonData "Отчетный месяц" -> raqam) */
export const UZ_MONTHS: Record<string, number> = {
  янв: 1, фев: 2, мар: 3, апр: 4, май: 5, июн: 6,
  июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
  yanvar: 1, fevral: 2, mart: 3, aprel: 4, may: 5, iyun: 6,
  iyul: 7, avgust: 8, sentyabr: 9, oktyabr: 10, noyabr: 11, dekabr: 12,
};
