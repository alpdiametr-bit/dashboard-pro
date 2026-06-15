"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Chart21,
  Book1,
  TrendUp,
  Wallet3,
  Receipt1,
  MoneyRecive,
  ShieldTick,
  DocumentText1,
  FolderOpen,
  Paperclip2,
  DocumentUpload,
  Calendar,
  Activity,
  type Icon,
} from "iconsax-reactjs";

type Tab = { key: string; label: string; icon: Icon };

const TABS: Tab[] = [
  { key: "umumiy", label: "Umumiy", icon: Chart21 },
  { key: "analitika", label: "Analitika", icon: Activity },
  { key: "kalendar", label: "Kalendar", icon: Calendar },
  { key: "balans", label: "Balans", icon: Book1 },
  { key: "foyda", label: "Foyda-zarar", icon: TrendUp },
  { key: "kredit", label: "Kredit portfeli", icon: Wallet3 },
  { key: "schotlar", label: "Schotlar", icon: Receipt1 },
  { key: "jalb", label: "Jalb etilgan", icon: MoneyRecive },
  { key: "normativ", label: "Normativlar", icon: ShieldTick },
  { key: "varaqlar", label: "Varaqlar", icon: DocumentText1 },
  { key: "fayllar", label: "Yuklangan fayllar", icon: FolderOpen },
  { key: "hujjatlar", label: "Hujjatlar", icon: Paperclip2 },
  { key: "yuklash", label: "Yuklash", icon: DocumentUpload },
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
    <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-xs)]">
      <div className="flex gap-1 min-w-max">
        {TABS.map((t) => {
          const isActive = active === t.key;
          const isUpload = t.key === "yuklash";
          const Ico = t.icon;
          return (
            <Link
              key={t.key}
              href={href(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200",
                isActive
                  ? isUpload
                    ? "bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] text-white shadow-[var(--shadow-gold)] ring-1 ring-inset ring-white/15"
                    : "bg-gradient-to-b from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-blue)] ring-1 ring-inset ring-white/15"
                  : isUpload
                    ? "text-[var(--gold)] hover:bg-[var(--gold)]/10"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
              )}
            >
              <Ico size={16} variant={isActive ? "Bold" : "Outline"} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
