import * as XLSX from "xlsx";
import { parseNumber, parseExcelDate, formatDate } from "./format";
import { SHEET, balanceSection, UZ_MONTHS } from "./constants";

// ───────── Tiplar ─────────

export type ParsedSheet = {
  name: string;
  orderIdx: number;
  title: string | null;
  rowCount: number;
  colCount: number;
  data: string[][]; // to'liq grid (hech narsa yo'qolmaydi)
};

export type ParsedBalance = {
  code: string | null;
  label: string;
  value: number;
  section: string | null;
  orderIdx: number;
};

export type ParsedIncome = {
  code: string | null;
  label: string;
  value: number;
  section: string | null;
  orderIdx: number;
};

export type ParsedLedger = {
  accountNo: string;
  name: string;
  openDebit: number;
  openCredit: number;
  turnoverDebit: number;
  turnoverCredit: number;
  closeDebit: number;
  closeCredit: number;
  orderIdx: number;
};

export type ParsedLoan = {
  rowNo: number | null;
  account: string | null;
  regionCode: string | null;
  districtCode: string | null;
  borrowerName: string;
  pinfl: string | null;
  subjectType: number | null;
  related: string | null;
  groupNo: string | null;
  amount: number;
  balance: number;
  reserve: number;
  accruedInterest: number;
  rate: number | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  loanType: number | null;
  collateralType: number | null;
  collateralValue: number;
  overduePrincipal: number;
  overdue1_30: number;
  overdue31_90: number;
  overdue91_180: number;
  overdue181: number;
  overdueInterest: number;
};

export type ParsedBorrowed = {
  rowNo: number | null;
  creditorName: string;
  amount: number;
  balance: number;
  rate: number | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  raw: string[];
  orderIdx: number;
};

export type ParsedNorm = {
  code: string | null;
  indicator: string;
  norm: string | null;
  actual: string | null;
  orderIdx: number;
};

export type ParsedWorkbook = {
  company: { name: string; region: string | null; inn: string | null };
  meta: {
    year: number | null;
    month: string | null;
    day: number | null;
    reportDate: Date | null;
  };
  sheets: ParsedSheet[];
  balance: ParsedBalance[];
  income: ParsedIncome[];
  ledger: ParsedLedger[];
  loans: ParsedLoan[];
  borrowed: ParsedBorrowed[];
  norms: ParsedNorm[];
};

// ───────── Yordamchilar ─────────

function cellToStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return formatDate(v);
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : String(v);
  }
  return String(v).trim();
}

function rowsOf(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  }) as unknown[][];
}

function firstInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const m = String(v).match(/-?\d+/);
  return m ? parseInt(m[0]) : null;
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((c) => c === null || c === undefined || String(c).trim() === "");
}

/** Qatordagi oxirgi son qiymatini topish (balans/foyda-zarar uchun) */
function lastNumber(row: unknown[]): number {
  for (let i = row.length - 1; i >= 2; i--) {
    const c = row[i];
    if (c === null || c === undefined || String(c).trim() === "") continue;
    const s = String(c).replace(/[\s\u00A0]/g, "");
    if (/^-?[\d.,]+$/.test(s)) return parseNumber(c);
  }
  return 0;
}

// ───────── Asosiy parser ─────────

export function parseWorkbook(buffer: Buffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const result: ParsedWorkbook = {
    company: { name: "", region: null, inn: null },
    meta: { year: null, month: null, day: null, reportDate: null },
    sheets: [],
    balance: [],
    income: [],
    ledger: [],
    loans: [],
    borrowed: [],
    norms: [],
  };

  wb.SheetNames.forEach((name, orderIdx) => {
    const ws = wb.Sheets[name];
    if (!ws) return;
    const rows = rowsOf(ws);

    // 1) Xom grid (har bir sheet uchun — data yo'qolmaydi)
    const grid: string[][] = rows.map((r) => r.map(cellToStr));
    const colCount = grid.reduce((m, r) => Math.max(m, r.length), 0);
    const title = findTitle(grid);
    result.sheets.push({
      name,
      orderIdx,
      title,
      rowCount: grid.length,
      colCount,
      data: grid,
    });

    // 2) Strukturali ajratish
    const norm = name.trim().toLowerCase();
    if (norm === SHEET.COMMON.toLowerCase()) {
      parseCommon(rows, result);
    } else if (norm.includes("консолидир")) {
      result.ledger = parseLedger(rows);
    } else if (norm === SHEET.BALANCE.toLowerCase() || norm.includes("баланс")) {
      result.balance = parseBalance(rows);
    } else if (norm.includes("молиявий") || norm.includes("натижа")) {
      result.income = parseIncome(rows);
    } else if (norm.includes("кредит портфел")) {
      result.loans = parseLoans(rows);
    } else if (norm.includes("жалб")) {
      result.borrowed = parseBorrowed(rows);
    } else if (norm.includes("норматив")) {
      result.norms = parseNorms(rows);
    }
  });

  return result;
}

// Sarlavhani topish (birinchi ma'noli matn qatori)
function findTitle(grid: string[][]): string | null {
  for (const row of grid.slice(0, 8)) {
    const text = row.find((c) => c && c.length > 10 && !/^\d/.test(c));
    if (text && !text.includes("ИЛОВА") && !text.includes("Ўзгартириш")) {
      return text;
    }
  }
  return null;
}

// ───────── CommonData ─────────

function parseCommon(rows: unknown[][], result: ParsedWorkbook) {
  for (const row of rows) {
    const key = cellToStr(row[0]).toLowerCase();
    const val = cellToStr(row[1]);
    if (!key) continue;
    if (key.includes("имя организации") || key.includes("ташкилот"))
      result.company.name = val;
    else if (key.includes("регион") || key.includes("ҳудуд"))
      result.company.region = val || null;
    else if (key.includes("отчетный год") || key.includes("ҳисобот йил"))
      result.meta.year = firstInt(val);
    else if (key.includes("отчетный месяц") || key.includes("ой"))
      result.meta.month = val || null;
    else if (key.includes("отчетное число") || key.includes("кун"))
      result.meta.day = firstInt(val);
  }

  // hisobot sanasini yig'ish
  const { year, month, day } = result.meta;
  if (year && day != null) {
    const mKey = (month || "").trim().toLowerCase().slice(0, 3);
    const mNum = UZ_MONTHS[mKey] ?? UZ_MONTHS[(month || "").trim().toLowerCase()];
    if (mNum) result.meta.reportDate = new Date(year, mNum - 1, day);
  }
}

// ───────── Balans ─────────

function parseBalance(rows: unknown[][]): ParsedBalance[] {
  const out: ParsedBalance[] = [];
  let started = false;
  let idx = 0;
  for (const row of rows) {
    const c0 = cellToStr(row[0]);
    const c1 = cellToStr(row[1]);
    if (!started) {
      if (c0.toUpperCase().includes("КОД")) started = true;
      continue;
    }
    if (isEmptyRow(row)) continue;
    if (c0.includes("имзо") || c1.includes("имзо") || c1.includes("Ф.И.Ш"))
      break;
    const code = /^\d+$/.test(c0) ? c0 : null;
    const label = c1 || c0;
    if (!label) continue;
    out.push({
      code,
      label,
      value: lastNumber(row),
      section: balanceSection(code),
      orderIdx: idx++,
    });
  }
  return out;
}

// ───────── Moliyaviy natijalar ─────────

function parseIncome(rows: unknown[][]): ParsedIncome[] {
  const out: ParsedIncome[] = [];
  let started = false;
  let idx = 0;
  let section: string | null = null;
  for (const row of rows) {
    const c0 = cellToStr(row[0]);
    const c1 = cellToStr(row[1]);
    if (!started) {
      if (c0.toUpperCase().includes("КОД")) started = true;
      continue;
    }
    if (isEmptyRow(row)) continue;
    if (c1.includes("имзо") || c1.includes("Ф.И.Ш") || c0.includes("Изоҳ")) break;
    const label = c1 || c0;
    const upper = label.toUpperCase();
    if (upper.includes("ФОИЗЛИ ДАРОМАД")) section = "FOIZLI_DAROMAD";
    else if (upper.includes("ФОИЗЛИ ХАРАЖАТ")) section = "FOIZLI_HARAJAT";
    else if (upper.includes("ФОИЗСИЗ ДАРОМАД")) section = "FOIZSIZ_DAROMAD";
    else if (upper.includes("ФОИЗСИЗ ХАРАЖАТ")) section = "FOIZSIZ_HARAJAT";
    else if (upper.includes("ОПЕРАЦИОН ХАРАЖАТ")) section = "OPERATSION";
    else if (upper.includes("СОФ ФОЙДА")) section = "FOYDA";
    const code = /^\d+$/.test(c0) ? c0 : null;
    if (!label) continue;
    out.push({ code, label, value: lastNumber(row), section, orderIdx: idx++ });
  }
  return out;
}

// ───────── Konsolidatsiya / oborotka ─────────

function parseLedger(rows: unknown[][]): ParsedLedger[] {
  const out: ParsedLedger[] = [];
  let started = false;
  let idx = 0;
  for (const row of rows) {
    const c0 = cellToStr(row[0]);
    const c1 = cellToStr(row[1]);
    if (!started) {
      if (c0.includes("Ҳисобварақ") || c0.toLowerCase().includes("рақам"))
        started = true;
      continue;
    }
    // hisobvaraq raqami — raqamli kod (masalan 10000, 10101)
    if (!/^\d{3,}$/.test(c0)) continue;
    if (!c1) continue;
    out.push({
      accountNo: c0,
      name: c1,
      openDebit: parseNumber(row[2]),
      openCredit: parseNumber(row[3]),
      turnoverDebit: parseNumber(row[4]),
      turnoverCredit: parseNumber(row[5]),
      closeDebit: parseNumber(row[6]),
      closeCredit: parseNumber(row[7]),
      orderIdx: idx++,
    });
  }
  return out;
}

// ───────── Kredit portfeli ─────────

function parseLoans(rows: unknown[][]): ParsedLoan[] {
  const out: ParsedLoan[] = [];
  for (const row of rows) {
    const no = firstInt(row[0]);
    const borrower = cellToStr(row[4]);
    // data qatori: 0-ustun butun son, qarzdor nomi mavjud
    if (no === null) continue;
    if (!borrower || borrower.length < 3) continue;
    // sarlavha/ustun raqami qatorini o'tkazib yuborish (1|2|3...)
    if (cellToStr(row[1]) === "2" && cellToStr(row[2]) === "3") continue;
    out.push({
      rowNo: no,
      account: cellToStr(row[1]) || null,
      regionCode: cellToStr(row[2]) || null,
      districtCode: cellToStr(row[3]) || null,
      borrowerName: borrower,
      pinfl: cellToStr(row[5]) || null,
      subjectType: firstInt(row[6]),
      related: cellToStr(row[7]) || null,
      groupNo: cellToStr(row[8]) || null,
      amount: parseNumber(row[9]),
      balance: parseNumber(row[10]),
      reserve: parseNumber(row[11]),
      accruedInterest: parseNumber(row[12]),
      rate: row[13] != null && cellToStr(row[13]) !== "" ? parseNumber(row[13]) : null,
      issuedAt: parseExcelDate(row[14]),
      dueAt: parseExcelDate(row[15]),
      loanType: firstInt(row[16]),
      collateralType: firstInt(row[17]),
      collateralValue: parseNumber(row[21]),
      overduePrincipal: parseNumber(row[22]),
      overdue1_30: parseNumber(row[23]),
      overdue31_90: parseNumber(row[24]),
      overdue91_180: parseNumber(row[25]),
      overdue181: parseNumber(row[26]),
      overdueInterest: parseNumber(row[27]),
    });
  }
  return out;
}

// ───────── Jalb etilgan mablag'lar ─────────

function parseBorrowed(rows: unknown[][]): ParsedBorrowed[] {
  const out: ParsedBorrowed[] = [];
  let idx = 0;
  for (const row of rows) {
    if (isEmptyRow(row)) continue;
    const raw = row.map(cellToStr);
    // kreditor nomi: birinchi uzun matnli (raqam bo'lmagan) hujayra
    const nameCell = raw.find(
      (c, i) => i > 0 && c.length > 4 && !/^[\d\s.,%-]+$/.test(c),
    );
    const no = firstInt(row[0]);
    // faqat ma'noli (raqamli ko'rsatkichli) qatorlarni struktura sifatida
    const nums = raw.filter((c) => /^\d[\d\s.,]*$/.test(c.trim()));
    if (!nameCell || nameCell.toUpperCase().includes("ИЛОВА")) continue;
    if (nameCell.includes("номи") || nameCell.includes("Ф.И.Ш")) continue;
    out.push({
      rowNo: no,
      creditorName: nameCell,
      amount: nums[0] ? parseNumber(nums[0]) : 0,
      balance: nums[1] ? parseNumber(nums[1]) : 0,
      rate: null,
      issuedAt: null,
      dueAt: null,
      raw,
      orderIdx: idx++,
    });
  }
  return out;
}

// ───────── Normativlar ─────────

function parseNorms(rows: unknown[][]): ParsedNorm[] {
  const out: ParsedNorm[] = [];
  let idx = 0;
  for (const row of rows) {
    const c0 = cellToStr(row[0]);
    const c1 = cellToStr(row[1]);
    if (!/^\d+\.\d+$/.test(c0)) continue; // 1.1, 2.1, 3.1 ...
    if (!c1) continue;
    const rest = row.slice(2).map(cellToStr).filter((c) => c !== "");
    const normCell =
      rest.find((c) => /(мин|макс|min|max)/i.test(c)) ?? null;
    const actual =
      rest
        .filter((c) => c !== normCell)
        .find((c) => /^-?[\d.,]+$/.test(c.replace(/\s/g, ""))) ?? null;
    out.push({
      code: c0,
      indicator: c1,
      norm: normCell,
      actual,
      orderIdx: idx++,
    });
  }
  return out;
}
