import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full px-3.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] shadow-[var(--shadow-xs)]",
        "placeholder:text-[var(--text-soft)] transition-all duration-200",
        "focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-[var(--trust-blue)]",
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
        "block text-[13px] font-medium text-[var(--text)] mb-1.5",
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
        "h-10 px-3.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] cursor-pointer shadow-[var(--shadow-xs)]",
        "focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-[var(--trust-blue)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
