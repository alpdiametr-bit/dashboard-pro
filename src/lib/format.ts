// Formatlash yordamchilari — pul, sana, foiz (o'zbek)

/** "60 153" ko'rinishidagi (bo'sh joy ajratgichli) yoki "60,00" sonni number ga */
export function parseNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return isFinite(raw) ? raw : 0;
  let s = String(raw).trim();
  if (!s || s === "-" || s === "#" || s.includes("#")) return 0;
  // barcha bo'sh joy turlarini (NBSP ham) olib tashlash
  s = s.replace(/[\s\u00A0\u202F]/g, "");
  // vergulni nuqtaga (kasr ajratgich)
  s = s.replace(/,/g, ".");
  // faqat raqam, nuqta, minus qoldirish
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "." || s === "-") return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Pul summasi — ming ajratgichli (1 234 567) */
export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : parseNumber(value);
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/** Kasr bilan (foiz/koeffitsent) */
export function formatDecimal(
  value: number | string | null | undefined,
  digits = 2,
): string {
  const n = typeof value === "number" ? value : parseNumber(value);
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** Qisqa: 1.2 mlrd / 134.3 mln / 60 ming */
export function formatCompact(
  value: number | string | null | undefined,
): string {
  const n = typeof value === "number" ? value : parseNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${formatDecimal(n / 1_000_000_000, 2)} mlrd`;
  if (abs >= 1_000_000) return `${formatDecimal(n / 1_000_000, 1)} mln`;
  if (abs >= 1_000) return `${formatDecimal(n / 1_000, 0)} ming`;
  return formatMoney(n);
}

/** dd.mm.yyyy yoki Excel serial sanani Date ga */
export function parseExcelDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();
  // dd.mm.yyyy
  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    const yr = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    const date = new Date(yr, parseInt(mo) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 0 && num < 80000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date;
}

/** Date -> "08.06.2026" */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
