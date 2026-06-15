"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Calendar,
  Building,
  ArrowDown2,
  TickCircle,
  CloseCircle,
} from "iconsax-reactjs";

type Option = { value: string; label: string };

const PERIODS: Option[] = [
  { value: "all", label: "Barcha davr" },
  { value: "today", label: "Bugun" },
  { value: "7d", label: "So'nggi 7 kun" },
  { value: "30d", label: "So'nggi 30 kun" },
  { value: "month", label: "Joriy oy" },
  { value: "year", label: "Joriy yil" },
];

/**
 * Dashboard premium filtrlari: sana davri + firma (filial) dropdownlari.
 * URL searchParams (period, company) ni yangilaydi.
 */
export function DashboardFilters({
  companies,
}: {
  companies: { id: number; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const period = params.get("period") || "all";
  const company = params.get("company") || "";

  function setParam(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  const periodLabel =
    PERIODS.find((p) => p.value === period)?.label ?? "Barcha davr";
  const companyLabel =
    companies.find((c) => String(c.id) === company)?.name ?? "Barcha firmalar";

  const hasFilter = period !== "all" || company !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        icon={<Calendar size={16} variant="Bold" />}
        label={periodLabel}
        active={period !== "all"}
        items={PERIODS}
        current={period}
        onSelect={(v) => setParam("period", v === "all" ? "" : v)}
      />
      <Dropdown
        icon={<Building size={16} variant="Bold" />}
        label={companyLabel}
        active={company !== ""}
        searchable
        items={[
          { value: "", label: "Barcha firmalar" },
          ...companies.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
        current={company}
        onSelect={(v) => setParam("company", v)}
      />
      {hasFilter && (
        <button
          onClick={() => router.replace(pathname)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--loss)] hover:bg-[var(--loss)]/8 transition-colors"
        >
          <CloseCircle size={15} /> Tozalash
        </button>
      )}
    </div>
  );
}

function Dropdown({
  icon,
  label,
  items,
  current,
  onSelect,
  active,
  searchable = false,
}: {
  icon: React.ReactNode;
  label: string;
  items: Option[];
  current: string;
  onSelect: (value: string) => void;
  active?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-[10px] border text-[13px] font-medium shadow-[var(--shadow-xs)] transition-all duration-200 max-w-[220px]",
          active
            ? "border-[var(--trust-blue)]/40 bg-[var(--trust-blue)]/8 text-[var(--trust-blue)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border-strong)]",
        )}
      >
        <span className={active ? "text-[var(--trust-blue)]" : "text-[var(--text-muted)]"}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
        <ArrowDown2
          size={14}
          className={cn(
            "text-[var(--text-muted)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-xl)] animate-rise">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish..."
              className="mb-1.5 h-9 w-full rounded-[9px] border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 text-[13px] text-[var(--text)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
            />
          )}
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
                Topilmadi
              </p>
            )}
            {filtered.map((it) => {
              const selected = it.value === current;
              return (
                <button
                  key={it.value}
                  onClick={() => {
                    onSelect(it.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[9px] px-3 py-2 text-left text-[13px] transition-colors",
                    selected
                      ? "bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] font-medium"
                      : "text-[var(--text)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span className="flex-1 truncate">{it.label}</span>
                  {selected && <TickCircle size={15} variant="Bold" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
