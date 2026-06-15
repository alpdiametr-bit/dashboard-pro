import * as XLSX from "xlsx";
import { parseNumber, parseExcelDate, formatDate } from "./format";
import { SHEET, detectBalanceSection, UZ_MONTHS } from "./constants";

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

/** Sheet nomini normallashtirish — fuzzy moslik uchun
 *  (registr, bo'sh joy, tinish belgilari olib tashlanadi) */
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\s._\-()№]/g, "")
    .trim();
}

/** Hujayrada raqamli qiymat bormi? (matn ham bo'lishi mumkin) */
function hasNumber(v: unknown): boolean {
  if (typeof v === "number") return isFinite(v);
  const s = String(v ?? "").replace(/[\s\u00A0\u202F]/g, "");
  return /^-?[\d.,]+$/.test(s) && /\d/.test(s);
}

/**
 * Jadval sarlavhasi (header) qatorini topadi va ustun indekslarini
 * matn patternlari bo'yicha aniqlaydi. Multi-row header'ni qo'llab-quvvatlaydi:
 * bir necha ketma-ket matn qatori ustun bo'yicha birlashtiriladi.
 *
 * @returns ustun -> indeks xaritasi yoki bo'sh (topilmasa)
 */
function detectColumns(
  rows: unknown[][],
  patterns: Record<string, RegExp>,
  opts: { scanRows?: number } = {},
): Record<string, number> {
  const scan = opts.scanRows ?? 20;
  const limit = Math.min(rows.length, scan);
  // har ustun uchun birlashtirilgan header matni (dastlabki qatorlar)
  const maxCols = rows
    .slice(0, limit)
    .reduce((m, r) => Math.max(m, r.length), 0);
  const colText: string[] = new Array(maxCols).fill("");
  for (let r = 0; r < limit; r++) {
    for (let c = 0; c < maxCols; c++) {
      const v = cellToStr(rows[r]?.[c]);
      if (v && !/^\d+$/.test(v.trim())) {
        colText[c] = (colText[c] + " " + v).trim();
      }
    }
  }

  const result: Record<string, number> = {};
  for (const [key, re] of Object.entries(patterns)) {
    for (let c = 0; c < maxCols; c++) {
      if (colText[c] && re.test(colText[c])) {
        result[key] = c;
        break;
      }
    }
  }
  return result;
}

/** Birinchi "data" qatori indeksini topadi (header tugagach) */
function findDataStart(
  rows: unknown[][],
  isDataRow: (row: unknown[]) => boolean,
  max = 30,
): number {
  for (let i = 0; i < Math.min(rows.length, max); i++) {
    if (isDataRow(rows[i])) return i;
  }
  return -1;
}


// ───────── Asosiy parser ─────────

export function parseWorkbook(buffer: Buffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellStyles: true, // sariq bo'lim sarlavhalarini aniqlash uchun
  });

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

    // 2) Strukturali ajratish — sheet nomini fuzzy aniqlash
    const nn = normName(name);
    if (nn === normName(SHEET.COMMON) || nn === "commondata") {
      parseCommon(rows, result);
    } else if (nn.includes("консолидир") || nn.includes("consolidat")) {
      result.ledger = parseLedger(rows);
    } else if (nn.includes("баланс") || nn.includes("balans")) {
      result.balance = parseBalance(ws);
    } else if (
      nn.includes("молиявий") ||
      nn.includes("натижа") ||
      nn.includes("moliyaviy") ||
      nn.includes("natija")
    ) {
      result.income = parseIncome(rows);
    } else if (
      nn.includes("кредитпортфел") ||
      nn.includes("kreditportfel") ||
      nn.includes("кредитпортфели")
    ) {
      result.loans = parseLoans(rows);
    } else if (nn.includes("жалб") || nn.includes("jalb")) {
      result.borrowed = parseBorrowed(rows);
    } else if (nn.includes("норматив") || nn.includes("normativ")) {
      result.norms = parseNorms(rows);
    }
  });

  // ───── Fallback'lar (turli fayllarga moslashish) ─────

  // CommonData bo'lmasa yoki firma nomi bo'sh bo'lsa — sheet sarlavhalaridan top
  if (!result.company.name) {
    result.company.name = guessCompanyName(result.sheets) ?? "";
  }
  // Hisobot sanasi aniqlanmasa — sheet sarlavhasidagi sanadan top
  if (!result.meta.reportDate) {
    result.meta.reportDate = guessReportDate(result.sheets);
  }

  return result;
}

/** Sheet sarlavhalaridan firma nomini taxmin qilish (CommonData bo'lmasa) */
function guessCompanyName(sheets: ParsedSheet[]): string | null {
  for (const sh of sheets) {
    for (const row of sh.data.slice(0, 6)) {
      for (const cell of row) {
        // "...MIKROMOLIYA TASHKILOTI..." yoki "...MCHJ..." yoki "...МЧЖ..."
        if (
          cell &&
          cell.length > 6 &&
          /(микромолия|mikromoliya|mchj|мчж|ооо|mfo)/i.test(cell) &&
          !cell.includes("ИЛОВА") &&
          !/низом/i.test(cell)
        ) {
          return cell.replace(/нинг\s*$/i, "").trim();
        }
      }
    }
  }
  return null;
}

/** Sheet sarlavhalaridan hisobot sanasini taxmin qilish */
function guessReportDate(sheets: ParsedSheet[]): Date | null {
  for (const sh of sheets) {
    for (const row of sh.data.slice(0, 8)) {
      for (const cell of row) {
        if (!cell) continue;
        // "2026 йил "8" июн ҳолатига" ko'rinishi
        const m = cell.match(
          /(\d{4})\s*йил\D*?(\d{1,2})\D*?(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)/i,
        );
        if (m) {
          const y = parseInt(m[1]);
          const d = parseInt(m[2]);
          const mo = UZ_MONTHS[m[3].toLowerCase().slice(0, 3)];
          if (y && d && mo) return new Date(Date.UTC(y, mo - 1, d));
        }
        // dd.mm.yyyy
        const m2 = cell.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/);
        if (m2) {
          const dt = parseExcelDate(m2[0]);
          if (dt) return dt;
        }
      }
    }
  }
  return null;
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
    // qiymat 1-ustunda yoki keyingi to'ldirilgan ustunda bo'lishi mumkin
    let val = cellToStr(row[1]);
    if (!val) {
      for (let i = 2; i < row.length; i++) {
        const v = cellToStr(row[i]);
        if (v) {
          val = v;
          break;
        }
      }
    }
    if (!key) continue;
    if (
      key.includes("имя организации") ||
      key.includes("ташкилот") ||
      key.includes("tashkilot") ||
      key.includes("номи") ||
      key.includes("nomi") ||
      key.includes("firma") ||
      key.includes("company")
    )
      result.company.name = val || result.company.name;
    else if (
      key.includes("регион") ||
      key.includes("ҳудуд") ||
      key.includes("hudud") ||
      key.includes("viloyat") ||
      key.includes("region")
    )
      result.company.region = val || result.company.region;
    else if (key.includes("инн") || key.includes("стир") || key.includes("stir"))
      result.company.inn = val || result.company.inn;
    else if (
      key.includes("отчетный год") ||
      key.includes("ҳисобот йил") ||
      key.includes("йил") ||
      key.includes("yil") ||
      key.includes("год")
    )
      result.meta.year = result.meta.year ?? firstInt(val);
    else if (
      key.includes("отчетный месяц") ||
      key.includes("ой") ||
      key.includes("oy") ||
      key.includes("месяц")
    )
      result.meta.month = result.meta.month ?? (val || null);
    else if (
      key.includes("отчетное число") ||
      key.includes("кун") ||
      key.includes("kun") ||
      key.includes("число")
    )
      result.meta.day = result.meta.day ?? firstInt(val);
  }

  // hisobot sanasini yig'ish
  const { year, month, day } = result.meta;
  if (year && day != null) {
    const mKey = (month || "").trim().toLowerCase().slice(0, 3);
    const mNum =
      UZ_MONTHS[mKey] ??
      UZ_MONTHS[(month || "").trim().toLowerCase()] ??
      (month && /^\d+$/.test(month.trim()) ? parseInt(month) : undefined);
    if (mNum && mNum >= 1 && mNum <= 12)
      // UTC yarim tun — `@db.Date` ustunга saqlashda kun siljimaydi (TZ-safe)
      result.meta.reportDate = new Date(Date.UTC(year, mNum - 1, day));
  }
}

// ───────── Balans ─────────

/** Hujayra to'ldirish rangi sariq(roq)mi? (bo'lim sarlavhalari sariq belgilangan) */
function isYellowFill(cell: XLSX.CellObject | undefined): boolean {
  const s = (cell as unknown as { s?: { fgColor?: { rgb?: string }; patternType?: string } })?.s;
  const rgb = s?.fgColor?.rgb;
  if (!rgb || typeof rgb !== "string") return false;
  // ARGB yoki RGB hex bo'lishi mumkin (masalan "FFFF00", "FFFFFF00")
  const hex = rgb.length === 8 ? rgb.slice(2) : rgb;
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((v) => isNaN(v))) return false;
  // Sariq/oltin: qizil va yashil yuqori, ko'k past
  return r >= 180 && g >= 150 && b <= 140;
}

/**
 * Balans varag'ini bo'limlarga ajratish.
 *
 * Bo'lim (AKTIV/MAJBURIYAT/KAPITAL) MATN sarlavhalari orqali aniqlanadi
 * (АКТИВЛАР, МАЖБУРИЯТЛАР, КАПИТАЛ — Excelda sariq rang bilan belgilangan).
 * Qo'shimcha signal sifatida hujayra sariq rangda bo'lsa ham sarlavha deb
 * qaraladi. Kod oralig'iga (10–120 ...) tayanmaymiz — bu mo'rt edi.
 */
function parseBalance(ws: XLSX.WorkSheet): ParsedBalance[] {
  const out: ParsedBalance[] = [];
  const ref = ws["!ref"];
  if (!ref) return out;
  const range = XLSX.utils.decode_range(ref);

  // "КОД" sarlavhasi bormi? Yo'q bo'lsa — birinchi kodli qatordan boshlaymiz.
  let codeHeaderExists = false;
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 40); r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: range.s.c })] as
      | XLSX.CellObject
      | undefined;
    if (cell && cellToStr(cell.v).toUpperCase().includes("КОД")) {
      codeHeaderExists = true;
      break;
    }
  }

  let started = false;
  let idx = 0;
  let section: string | null = null;

  for (let r = range.s.r; r <= range.e.r; r++) {
    // qatordagi hujayralarni o'qish (qiymat + rang)
    const rowVals: unknown[] = [];
    let rowYellow = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as
        | XLSX.CellObject
        | undefined;
      rowVals[c] = cell ? (cell.v ?? null) : null;
      if (cell && isYellowFill(cell)) rowYellow = true;
    }

    const c0 = cellToStr(rowVals[0]);
    const c1 = cellToStr(rowVals[1]);

    if (!started) {
      if (codeHeaderExists) {
        if (c0.toUpperCase().includes("КОД")) started = true;
        continue;
      }
      // fallback: kod (raqam) + matn label bo'lgan birinchi qator,
      // yoki bo'lim sarlavhasi (АКТИВЛАР...)
      if (
        (/^\d{1,4}$/.test(c0) && c1) ||
        detectBalanceSection(c1 || c0)
      ) {
        started = true;
        // qayta ishlash uchun pastga tushamiz
      } else {
        continue;
      }
    }
    if (isEmptyRow(rowVals)) continue;
    if (c0.includes("имзо") || c1.includes("имзо") || c1.includes("Ф.И.Ш"))
      break;

    const code = /^\d+$/.test(c0) ? c0 : null;
    const label = c1 || c0;
    if (!label) continue;

    // Bo'lim sarlavhasi? (kodsiz qator ВА matn/sariq bo'lim nomi)
    const headerSection = detectBalanceSection(label);
    if (!code && (headerSection || rowYellow)) {
      if (headerSection) section = headerSection;
      // sariq sarlavha — lekin qiymat qatori bo'lsa quyida yoziladi
      continue;
    }

    out.push({
      code,
      label,
      value: lastNumber(rowVals),
      section,
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

  // "КОД" sarlavhasi yo'q bo'lsa — birinchi (kod + matn + son) qatoridan boshlash
  const codeHeaderExists = rows.some((r) =>
    cellToStr(r[0]).toUpperCase().includes("КОД"),
  );

  for (const row of rows) {
    const c0 = cellToStr(row[0]);
    const c1 = cellToStr(row[1]);
    if (!started) {
      if (codeHeaderExists) {
        if (c0.toUpperCase().includes("КОД")) started = true;
        continue;
      }
      // fallback: kod (3+ raqam) + matn label bo'lgan birinchi qator
      if (/^\d{2,}$/.test(c0) && (c1 || cellToStr(row[2]))) {
        started = true;
        // bu qatorni qayta ishlash uchun pastga tushamiz
      } else {
        continue;
      }
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

  // Header topilsa boshlang'ich qatorni belgilash; topilmasa birinchi
  // hisobvaraq raqamli qatordan boshlaymiz (moslashuvchan).
  for (const row of rows) {
    const c0 = cellToStr(row[0]);
    const c1 = cellToStr(row[1]);

    if (!started) {
      // header signali: "Ҳисобварақ" / "рақам" / "счет"
      if (
        /ҳисобварақ|рақам|hisobvaraq|счет|account/i.test(c0) ||
        /ҳисобварақ\s*номи|номи|name/i.test(c1)
      ) {
        started = true;
        continue;
      }
      // header bo'lmasa ham — to'g'ridan-to'g'ri data qatori bo'lsa boshlash
      if (/^\d{3,}$/.test(c0) && c1 && !hasNumber(c1)) {
        started = true;
        // bu qatorni o'tkazib yubormaymiz — pastda qayta ishlanadi
      } else {
        continue;
      }
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

/** Kredit portfeli ustunlarini header matnidan aniqlash (fallback: standart indeks) */
function detectLoanColumns(rows: unknown[][]): Record<string, number> {
  return detectColumns(
    rows,
    {
      account: /ҳ\/в|h\/v|ҳисобварақ/i,
      regionCode: /ҳудуд\s*код|hudud/i,
      districtCode: /туман|шаҳар\s*код|tuman/i,
      borrowerName: /қарздорнинг\s*тўлиқ\s*номи|қарздор.*ном|qarzdor.*nom/i,
      pinfl: /стир|жшшир|stir|jshshir|пинфл/i,
      subjectType: /субъект\s*тури|subyekt/i,
      related: /алоқадорлик|aloqador/i,
      groupNo: /гуруҳи\s*рақами|guruh/i,
      amount: /кредит.*суммаси|суммаси|summa/i,
      balance: /кредит.*қолдиғи|қолдиғи|qoldiq/i,
      reserve: /захира|zaxira/i,
      accruedInterest: /ҳисобланган.*фоиз|тўлаш\s*муддати\s*етиб\s*келмаган/i,
      rate: /йиллик\s*фоиз|фоиз\s*ставка|foiz\s*stavka/i,
      issuedAt: /кредит.*берилган\s*сана|берилган\s*сана|berilgan\s*sana/i,
      dueAt: /кредит.*қайтариш\s*сана|қайтариш\s*сана|qaytarish\s*sana/i,
      loanType: /кредит\s*тури|kredit\s*tur/i,
      collateralType: /таъминот\s*тури|taminot\s*tur/i,
      collateralValue: /таъминотнинг\s*қиймати|таъминот.*қиймат/i,
      overduePrincipal: /муддати\s*ўтган\s*асосий|muddati.*asosiy/i,
      overdueInterest: /муддати\s*ўтган\s*ҳисобланган\s*фоиз|муддати.*фоиз/i,
    },
    { scanRows: 12 },
  );
}

function parseLoans(rows: unknown[][]): ParsedLoan[] {
  const out: ParsedLoan[] = [];

  // Ustunlarni header'dan aniqlash (topilmasa standart indeksga qaytamiz)
  const col = detectLoanColumns(rows);
  const has = (k: string) => typeof col[k] === "number";
  // Standart shablon indekslari (fallback)
  const C = {
    account: has("account") ? col.account : 1,
    regionCode: has("regionCode") ? col.regionCode : 2,
    districtCode: has("districtCode") ? col.districtCode : 3,
    borrowerName: has("borrowerName") ? col.borrowerName : 4,
    pinfl: has("pinfl") ? col.pinfl : 5,
    subjectType: has("subjectType") ? col.subjectType : 6,
    related: has("related") ? col.related : 7,
    groupNo: has("groupNo") ? col.groupNo : 8,
    amount: has("amount") ? col.amount : 9,
    balance: has("balance") ? col.balance : 10,
    reserve: has("reserve") ? col.reserve : 11,
    accruedInterest: has("accruedInterest") ? col.accruedInterest : 12,
    rate: has("rate") ? col.rate : 13,
    issuedAt: has("issuedAt") ? col.issuedAt : 14,
    dueAt: has("dueAt") ? col.dueAt : 15,
    loanType: has("loanType") ? col.loanType : 16,
    collateralType: has("collateralType") ? col.collateralType : 17,
    collateralValue: has("collateralValue") ? col.collateralValue : 21,
    overduePrincipal: has("overduePrincipal") ? col.overduePrincipal : 22,
    overdueInterest: has("overdueInterest") ? col.overdueInterest : 27,
  };
  // Aging (1-30 ... 181+) — muddati o'tgan asosiy qarzdan keyingi 4 ustun
  const agingBase = C.overduePrincipal + 1;

  for (const row of rows) {
    const no = firstInt(row[0]);
    const borrower = cellToStr(row[C.borrowerName]);
    // data qatori: 0-ustun butun son, qarzdor nomi mavjud
    if (no === null) continue;
    if (!borrower || borrower.length < 3) continue;
    // ustun raqami qatorini o'tkazib yuborish (1|2|3...)
    if (cellToStr(row[1]) === "2" && cellToStr(row[2]) === "3") continue;
    // sarlavha qatorini o'tkazib yuborish (qarzdor nomi o'rnida "номи" matni)
    if (
      /^[№\d]+$/.test(borrower) ||
      (/қарздор|номи/i.test(borrower) && borrower.length < 12)
    )
      continue;
    out.push({
      rowNo: no,
      account: cellToStr(row[C.account]) || null,
      regionCode: cellToStr(row[C.regionCode]) || null,
      districtCode: cellToStr(row[C.districtCode]) || null,
      borrowerName: borrower,
      pinfl: cellToStr(row[C.pinfl]) || null,
      subjectType: firstInt(row[C.subjectType]),
      related: cellToStr(row[C.related]) || null,
      groupNo: cellToStr(row[C.groupNo]) || null,
      amount: parseNumber(row[C.amount]),
      balance: parseNumber(row[C.balance]),
      reserve: parseNumber(row[C.reserve]),
      accruedInterest: parseNumber(row[C.accruedInterest]),
      rate:
        row[C.rate] != null && cellToStr(row[C.rate]) !== ""
          ? parseNumber(row[C.rate])
          : null,
      issuedAt: parseExcelDate(row[C.issuedAt]),
      dueAt: parseExcelDate(row[C.dueAt]),
      loanType: firstInt(row[C.loanType]),
      collateralType: firstInt(row[C.collateralType]),
      collateralValue: parseNumber(row[C.collateralValue]),
      overduePrincipal: parseNumber(row[C.overduePrincipal]),
      overdue1_30: parseNumber(row[agingBase]),
      overdue31_90: parseNumber(row[agingBase + 1]),
      overdue91_180: parseNumber(row[agingBase + 2]),
      overdue181: parseNumber(row[agingBase + 3]),
      overdueInterest: parseNumber(row[C.overdueInterest]),
    });
  }
  return out;
}

// ───────── Jalb etilgan mablag'lar ─────────

function parseBorrowed(rows: unknown[][]): ParsedBorrowed[] {
  const out: ParsedBorrowed[] = [];
  let idx = 0;

  // Ustunlarni header'dan aniqlash (fallback: standart 10-ilova indekslari)
  const col = detectColumns(
    rows,
    {
      account: /баланс\s*ҳисобварағи|ҳисобварағи/i,
      creditorName: /кредиторнинг\s*тўлиқ\s*номи|кредитор.*ном/i,
      pinfl: /стир|жшшир/i,
      amount: /жалб\s*этилган\s*маблағ\s*миқдори|маблағ\s*миқдори/i,
      balance: /жалб\s*этилган\s*маблағ\s*қолдиғи|маблағ\s*қолдиғи/i,
      rate: /йиллик\s*фоиз\s*ставка|фоиз\s*ставка/i,
      issuedAt: /маблағ\s*жалб\s*этилган\s*сана|жалб\s*этилган\s*сана/i,
      dueAt: /маблағни\s*қайтариш\s*сана|қайтариш\s*сана/i,
    },
    { scanRows: 12 },
  );
  const has = (k: string) => typeof col[k] === "number";
  const C = {
    account: has("account") ? col.account : 1,
    creditorName: has("creditorName") ? col.creditorName : 2,
    pinfl: has("pinfl") ? col.pinfl : 3,
    amount: has("amount") ? col.amount : 4,
    balance: has("balance") ? col.balance : 5,
    rate: has("rate") ? col.rate : 7,
    issuedAt: has("issuedAt") ? col.issuedAt : 8,
    dueAt: has("dueAt") ? col.dueAt : 9,
  };

  // Sarlavha/izoh matnlari (kreditor sifatida olinmasligi kerak)
  const NOISE =
    /ўзгартириш|киритилмасин|низом|илова|маълумот|кредитор|тўлиқ\s*номи|ф\.и\.ш|жами|итого|ташкилот|тўғрисида|ҳолатига/i;

  for (const row of rows) {
    const no = firstInt(row[0]);
    const name = cellToStr(row[C.creditorName]).trim();
    // data qatori: 0-ustun raqam + kreditor nomi (ma'noli matn)
    if (no === null) continue;
    if (!name || name.length < 3) continue;
    if (NOISE.test(name)) continue;
    if (/^[\d\s.,%-]+$/.test(name)) continue; // faqat raqam — kreditor emas
    // ustun raqami qatori (1|2|3...)
    if (cellToStr(row[1]) === "2" && cellToStr(row[2]) === "3") continue;

    out.push({
      rowNo: no,
      creditorName: name,
      amount: parseNumber(row[C.amount]),
      balance: parseNumber(row[C.balance]),
      rate:
        row[C.rate] != null && cellToStr(row[C.rate]) !== ""
          ? parseNumber(row[C.rate])
          : null,
      issuedAt: parseExcelDate(row[C.issuedAt]),
      dueAt: parseExcelDate(row[C.dueAt]),
      raw: row.map(cellToStr),
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
