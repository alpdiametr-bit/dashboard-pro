import { cn } from "@/lib/cn";

export function Table({
  className,
  children,
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-[13px]", className)}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-[var(--text-muted)]">
      {children}
    </thead>
  );
}

export function Th({
  className,
  children,
  align = "left",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 font-semibold text-[12px] uppercase tracking-wide border-b border-[var(--border)] whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Tr({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border)] hover:bg-[var(--surface-2)]/60 transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({
  className,
  children,
  align = "left",
  mono = false,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2 text-[var(--text)] align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "tnum",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
