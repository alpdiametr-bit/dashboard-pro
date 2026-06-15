"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Calendar,
  ArrowDown2,
  TickCircle,
  Star1,
  Clock,
  SearchNormal1,
} from "iconsax-reactjs";

type ReportOption = {
  id: number;
  date: string; // "08.06.2026"
  weekday: string; // "Payshanba"
  long: string; // "8-iyun, 2026"
  status: string; // PENDING | CONFIRMED
  isPinned: boolean;
  isConsolidated: boolean;
};

export function ReportSelector({
  reports,
  current,
}: {
  reports: ReportOption[];
  current: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(id: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("report", String(id));
    sp.delete("page");
    sp.delete("q");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    setOpen(false);
    setQuery("");
  }

  const selected = reports.find((r) => r.id === current);
  const filtered = query
    ? reports.filter(
        (r) =>
          r.date.includes(query) ||
          r.weekday.toLowerCase().includes(query.toLowerCase()) ||
          r.long.toLowerCase().includes(query.toLowerCase()),
      )
    : reports;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 h-9 pl-2.5 pr-2 rounded-[10px] border bg-[var(--surface)] cursor-pointer transition-colors min-w-[190px]",
          "focus:outline-none focus:ring-4 focus:ring-[var(--ring)]",
          open
            ? "border-[var(--trust-blue)] ring-4 ring-[var(--ring)]"
            : "border-[var(--border)] hover:border-[var(--trust-blue)]/40",
        )}
      >
        <span className="grid place-items-center h-6 w-6 rounded-[7px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] shrink-0">
          <Calendar size={15} variant="Bold" />
        </span>
        <span className="flex-1 text-left leading-tight">
          <span className="block text-[13px] font-semibold text-[var(--text)] tnum">
            {selected?.date ?? "—"}
          </span>
          <span className="block text-[10.5px] text-[var(--text-muted)]">
            {selected?.weekday ?? ""}
          </span>
        </span>
        {selected?.isPinned && (
          <Star1 size={13} variant="Bold" className="text-[var(--gold)] shrink-0" />
        )}
        <ArrowDown2
          size={15}
          className={cn(
            "text-[var(--text-muted)] transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[290px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden animate-rise">
          <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[var(--text)] uppercase tracking-wide">
              Hisobot sanasi
            </span>
            <span className="text-[11px] text-[var(--text-muted)] tnum">
              {reports.length} ta
            </span>
          </div>

          {reports.length > 6 && (
            <div className="p-2 border-b border-[var(--border)]">
              <div className="relative">
                <SearchNormal1
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sana qidirish..."
                  className="h-8 w-full pl-8 pr-2 rounded-[7px] border border-[var(--border)] bg-[var(--background)] text-[13px] text-[var(--text)] focus:outline-none focus:border-[var(--trust-blue)]"
                />
              </div>
            </div>
          )}

          <div className="max-h-[320px] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-[var(--text-muted)] text-center">
                Sana topilmadi
              </p>
            ) : (
              filtered.map((r) => {
                const active = r.id === current;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pick(r.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-left cursor-pointer transition-colors group",
                      active
                        ? "bg-[var(--trust-blue)]/10"
                        : "hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid place-items-center h-9 w-9 rounded-[9px] shrink-0 transition-colors",
                        active
                          ? "bg-[var(--trust-blue)] text-white"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)] group-hover:text-[var(--trust-blue)]",
                      )}
                    >
                      <Clock size={17} variant={active ? "Bold" : "Outline"} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[13px] font-semibold tnum",
                            active ? "text-[var(--trust-blue)]" : "text-[var(--text)]",
                          )}
                        >
                          {r.date}
                        </span>
                        {r.isPinned && (
                          <Star1 size={12} variant="Bold" className="text-[var(--gold)]" />
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {r.weekday}
                        </span>
                        {r.status === "PENDING" ? (
                          <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--warning)]/15 text-[var(--warning)] font-medium">
                            kutilmoqda
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--profit)]/12 text-[var(--profit)] font-medium">
                            tasdiqlangan
                          </span>
                        )}
                        {r.isConsolidated && (
                          <span className="text-[10px] px-1.5 py-px rounded-full bg-[var(--gold)]/15 text-[var(--gold)] font-medium">
                            umumiy
                          </span>
                        )}
                      </span>
                    </span>
                    {active && (
                      <TickCircle
                        size={17}
                        variant="Bold"
                        className="text-[var(--trust-blue)] shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
