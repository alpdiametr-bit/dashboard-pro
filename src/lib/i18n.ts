// Soddalashtirilgan i18n — cookie (dp_lang) orqali server va klient mos ishlaydi.
// Lug'atni kerakli sahifalar bo'yicha kengaytirib borish mumkin.

export const LANGS = ["uz", "ru", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "uz";

export const LANG_META: Record<Lang, { label: string; short: string }> = {
  uz: { label: "O'zbekcha", short: "UZ" },
  ru: { label: "Русский", short: "RU" },
  en: { label: "English", short: "EN" },
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

type Dict = Record<string, string>;

const uz: Dict = {
  // Navigatsiya
  "nav.dashboard": "Dashboard",
  "nav.firms": "Firmalar",
  "nav.upload": "Hisobot yuklash",
  "nav.audit": "Audit jurnali",
  // Yon panel / mobil menyu
  "chrome.menu": "Menyu",
  "chrome.secured": "Himoyalangan tizim",
  "chrome.securedSub": "MFO hisobot · v1.0",
  "chrome.expand": "Ochish",
  "chrome.collapse": "Yig'ish",
  "chrome.open": "Panelni ochish",
  "chrome.fold": "Panelni yig'ish",
  "chrome.close": "Yopish",
  "chrome.brandSub": "MFO Analytics",
  // Topbar
  "top.subtitle": "MFO hisobot va analitika",
  "top.admin": "Administrator",
  "top.logout": "Chiqish",
  "top.lang": "Tilni almashtirish",
  // Dashboard
  "dash.assetsTitle": "Firmalar bo'yicha aktivlar",
  "dash.assetsBadge": "so'nggi hisobotlar",
  "dash.capitalTitle": "Kapital tuzilishi",
  "period.daily": "Kunlik",
  "period.monthly": "Oylik",
  "period.yearly": "Yillik",
};

const ru: Dict = {
  "nav.dashboard": "Дашборд",
  "nav.firms": "Компании",
  "nav.upload": "Загрузка отчёта",
  "nav.audit": "Журнал аудита",
  "chrome.menu": "Меню",
  "chrome.secured": "Защищённая система",
  "chrome.securedSub": "Отчёт МФО · v1.0",
  "chrome.expand": "Развернуть",
  "chrome.collapse": "Свернуть",
  "chrome.open": "Развернуть панель",
  "chrome.fold": "Свернуть панель",
  "chrome.close": "Закрыть",
  "chrome.brandSub": "MFO Analytics",
  "top.subtitle": "Отчётность и аналитика МФО",
  "top.admin": "Администратор",
  "top.logout": "Выйти",
  "top.lang": "Сменить язык",
  "dash.assetsTitle": "Активы по компаниям",
  "dash.assetsBadge": "последние отчёты",
  "dash.capitalTitle": "Структура капитала",
  "period.daily": "Дневной",
  "period.monthly": "Месячный",
  "period.yearly": "Годовой",
};

const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.firms": "Companies",
  "nav.upload": "Upload report",
  "nav.audit": "Audit log",
  "chrome.menu": "Menu",
  "chrome.secured": "Secured system",
  "chrome.securedSub": "MFI report · v1.0",
  "chrome.expand": "Expand",
  "chrome.collapse": "Collapse",
  "chrome.open": "Expand panel",
  "chrome.fold": "Collapse panel",
  "chrome.close": "Close",
  "chrome.brandSub": "MFO Analytics",
  "top.subtitle": "MFI reporting & analytics",
  "top.admin": "Administrator",
  "top.logout": "Log out",
  "top.lang": "Change language",
  "dash.assetsTitle": "Assets by company",
  "dash.assetsBadge": "latest reports",
  "dash.capitalTitle": "Capital structure",
  "period.daily": "Daily",
  "period.monthly": "Monthly",
  "period.yearly": "Yearly",
};

export const dictionaries: Record<Lang, Dict> = { uz, ru, en };

export function translate(lang: Lang, key: string): string {
  return dictionaries[lang]?.[key] ?? dictionaries.uz[key] ?? key;
}
