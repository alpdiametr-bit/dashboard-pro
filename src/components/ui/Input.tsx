import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)]",
        "placeholder:text-[var(--text-muted)] transition-colors",
        "focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30 focus:border-[var(--trust-blue)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-[13px] font-medium text-[var(--text-muted)] mb-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] cursor-pointer",
        "focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30 focus:border-[var(--trust-blue)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
