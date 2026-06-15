import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--trust-blue)]/40 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--trust-blue)] text-white hover:bg-[var(--navy)] shadow-[var(--shadow-sm)]",
  gold: "bg-[var(--gold)] text-white hover:brightness-95 shadow-[var(--shadow-sm)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]",
  ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
  danger: "bg-[var(--loss)] text-white hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
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
