import { cn } from "@/lib/cn";

/**
 * Dashboard Pro brend belgisi.
 *
 * Analitika ruhidagi belgi: ko'tarilayotgan ustunlar (bar-chart) + oltin
 * o'sish chizig'i — moliyaviy ishonch (Navy + Gold) palitrasida.
 * Ramz ham analitika (ustunlar), ham o'sish (trend) ma'nosini bildiradi.
 */
export function LogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = "dp"; // gradient idlari uchun prefiks
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Dashboard Pro"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="40" x2="40" y2="0">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>

      {/* Fon — yumaloq kvadrat */}
      <rect width="40" height="40" rx="11" fill={`url(#${id}-bg)`} />

      {/* Analitika ustunlari (o'suvchi) */}
      <rect x="9" y="22" width="4.4" height="9" rx="1.6" fill="#FFFFFF" fillOpacity="0.55" />
      <rect x="17.8" y="17" width="4.4" height="14" rx="1.6" fill="#FFFFFF" fillOpacity="0.78" />
      <rect x="26.6" y="11" width="4.4" height="20" rx="1.6" fill={`url(#${id}-gold)`} />

      {/* O'sish chizig'i + nuqta */}
      <path
        d="M9 21.5 L19.8 16 L28.6 9.5"
        stroke="#EAB308"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="28.8" cy="9.4" r="2.4" fill="#EAB308" stroke="#0F172A" strokeWidth="1.2" />
    </svg>
  );
}

/** Belgi + so'z-belgi (yon panel/login uchun) */
export function LogoFull({
  size = 36,
  className,
  textClassName,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <div className="leading-tight">
        <div className={cn("font-semibold tracking-tight", textClassName)}>
          Dashboard <span className="text-[var(--gold)]">Pro</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          MFO Analytics
        </div>
      </div>
    </div>
  );
}
