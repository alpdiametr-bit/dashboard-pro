"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Dropdown } from "@/components/ui/Dropdown";
import { PERIOD_FILTERS } from "@/lib/constants";
import { Calendar, Calendar1, CalendarTick } from "iconsax-reactjs";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

export function PeriodFilter({ years }: { years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const period = params.get("period") || "all";
  const month = params.get("month") || "";
  const year = params.get("year") || "";

  function setParam(updates: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Tezkor oraliq */}
      <Dropdown
        size="sm"
        className="w-44"
        icon={<CalendarTick size={16} />}
        options={PERIOD_FILTERS.map((p) => ({ value: p.key, label: p.label }))}
        value={period}
        onChange={(v) => setParam({ period: v, month: "", year: "" })}
      />

      {/* Oy */}
      <Dropdown
        size="sm"
        className="w-36"
        icon={<Calendar1 size={16} />}
        placeholder="Oy"
        options={[
          { value: "", label: "Barcha oylar" },
          ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
        ]}
        value={month}
        onChange={(v) => setParam({ month: v, period: "all" })}
      />

      {/* Yil */}
      <Dropdown
        size="sm"
        className="w-32"
        icon={<Calendar size={16} />}
        placeholder="Yil"
        options={[
          { value: "", label: "Barcha yillar" },
          ...years.map((y) => ({ value: String(y), label: String(y) })),
        ]}
        value={year}
        onChange={(v) => setParam({ year: v, period: "all" })}
      />
    </div>
  );
}
