"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LOAN_TYPE } from "@/lib/constants";

export function LoanFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={params.get("loanType") ?? ""}
        onChange={(e) => setParam("loanType", e.target.value)}
        className="h-9 px-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text)] cursor-pointer"
      >
        <option value="">Barcha turlar</option>
        {Object.entries(LOAN_TYPE).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select
        value={params.get("overdue") ?? ""}
        onChange={(e) => setParam("overdue", e.target.value)}
        className="h-9 px-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text)] cursor-pointer"
      >
        <option value="">Barchasi</option>
        <option value="1">Muddati o&apos;tgan</option>
      </select>
    </div>
  );
}
