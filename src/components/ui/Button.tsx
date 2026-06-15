import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium rounded-[12px] transition-all duration-200 cursor-pointer select-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-gradient-to-b from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/10 hover:shadow-[var(--shadow-blue)] hover:-translate-y-px",
  gold: "text-white bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/15 hover:shadow-[var(--shadow-gold)] hover:-translate-y-px",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]",
  ghost:
    "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
  danger:
    "text-white bg-gradient-to-b from-[var(--loss-bright,#ef4444)] to-[var(--loss)] shadow-[var(--shadow-sm)] ring-1 ring-inset ring-white/10 hover:-translate-y-px",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
