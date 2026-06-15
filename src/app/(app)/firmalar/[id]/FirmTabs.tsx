"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "umumiy", label: "Umumiy" },
  { key: "balans", label: "Balans" },
  { key: "foyda", label: "Foyda-zarar" },
  { key: "kredit", label: "Kredit portfeli" },
  { key: "schotlar", label: "Schotlar" },
  { key: "jalb", label: "Jalb etilgan" },
  { key: "normativ", label: "Normativlar" },
  { key: "varaqlar", label: "Varaqlar" },
  { key: "fayllar", label: "Yuklangan fayllar" },
];

export function FirmTabs({
  base,
  active,
  reportId,
}: {
  base: string;
  active: string;
  reportId?: number;
}) {
  const params = useSearchParams();

  function href(tab: string) {
    const sp = new URLSearchParams();
    if (reportId) sp.set("report", String(reportId));
    sp.set("tab", tab);
    return `${base}?${sp.toString()}`;
  }

  return (
    <div className="border-b border-[var(--border)] overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
              active === t.key
                ? "border-[var(--gold)] text-[var(--text)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
