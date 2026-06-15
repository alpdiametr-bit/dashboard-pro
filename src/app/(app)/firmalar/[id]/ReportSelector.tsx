"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ReportSelector({
  reports,
  current,
}: {
  reports: { id: number; label: string; status: string }[];
  current: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(id: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("report", id);
    sp.delete("page");
    sp.delete("q");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] cursor-pointer focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30"
    >
      {reports.map((r) => (
        <option key={r.id} value={r.id}>
          {r.label}
          {r.status === "PENDING" ? " (kutilmoqda)" : ""}
        </option>
      ))}
    </select>
  );
}
