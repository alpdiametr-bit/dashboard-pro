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

/** dd.mm.yyyy yoki Excel serial sanani Date ga (UTC yarim tun — TZ-safe) */
export function parseExcelDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();
  // dd.mm.yyyy
  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    const date = new Date(Date.UTC(yr, parseInt(mo) - 1, parseInt(d)));
    return isNaN(date.getTime()) ? null : date;
  }
  // Excel serial number (UTC epoch asosida)
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
  // @db.Date qiymatlari UTC yarim tunda saqlanadi — UTC getter ishlatamiz
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const UZ_WEEKDAYS = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

const UZ_MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

/** Hafta kuni — "Payshanba" (UTC — @db.Date uchun) */
export function weekday(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return UZ_WEEKDAYS[date.getUTCDay()];
}

/** "8-iyun, 2026" ko'rinishi (UTC — @db.Date uchun) */
export function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return `${date.getUTCDate()}-${UZ_MONTH_NAMES[date.getUTCMonth()].toLowerCase()}, ${date.getUTCFullYear()}`;
}

/** Date -> "08.06.2026 14:30" (createdAt timestamp — mahalliy vaqt) */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

/** Nisbiy vaqt — "5 daqiqa oldin", "2 soat oldin", "kecha" */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "hozir";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "kecha";
  if (days < 30) return `${days} kun oldin`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} oy oldin`;
  return `${Math.floor(months / 12)} yil oldin`;
}
