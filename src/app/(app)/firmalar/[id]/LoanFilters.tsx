"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import { LOAN_TYPE } from "@/lib/constants";
import { Category, Danger } from "iconsax-reactjs";

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
      <Dropdown
        size="sm"
        className="w-44"
        icon={<Category size={16} variant="Bold" />}
        placeholder="Barcha turlar"
        options={[
          { value: "", label: "Barcha turlar" },
          ...Object.entries(LOAN_TYPE).map(([k, v]) => ({ value: k, label: v })),
        ]}
        value={params.get("loanType") ?? ""}
        onChange={(v) => setParam("loanType", v)}
      />
      <Dropdown
        size="sm"
        className="w-40"
        icon={<Danger size={16} variant="Bold" />}
        placeholder="Barchasi"
        options={[
          { value: "", label: "Barchasi" },
          { value: "1", label: "Muddati o'tgan" },
        ]}
        value={params.get("overdue") ?? ""}
        onChange={(v) => setParam("overdue", v)}
      />
    </div>
  );
}
