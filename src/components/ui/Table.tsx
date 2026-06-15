import { cn } from "@/lib/cn";

export function Table({
  className,
  children,
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-[12px]">
      <table
        className={cn(
          "w-full border-collapse text-[13px] [&_tbody_tr:last-child]:border-0",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--surface-2)]/95 backdrop-blur text-[var(--text-muted)] shadow-[0_1px_0_var(--border)]">
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
        "px-3.5 py-3 font-semibold text-[11.5px] uppercase tracking-[0.04em] border-b border-[var(--border)] whitespace-nowrap",
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
        "border-b border-[var(--border)] odd:bg-transparent even:bg-[var(--surface-2)]/35 hover:bg-[var(--trust-blue)]/[0.06] transition-colors",
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
        "px-3.5 py-2.5 text-[var(--text)] align-middle",
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
