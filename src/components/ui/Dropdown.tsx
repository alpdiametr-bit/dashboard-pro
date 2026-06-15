"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ArrowDown2, TickCircle, SearchNormal1 } from "iconsax-reactjs";

export type DropdownOption = { value: string; label: string };

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Tanlang...",
  searchable = false,
  icon,
  className,
  size = "md",
  openUp = false,
}: {
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
  openUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const h = size === "sm" ? "h-9 text-[13px]" : "h-10 text-sm";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 px-3.5 rounded-[10px] border cursor-pointer shadow-[var(--shadow-xs)] transition-all duration-200",
          "focus:outline-none focus:ring-4 focus:ring-[var(--ring)]",
          open
            ? "border-[var(--trust-blue)] ring-4 ring-[var(--ring)] bg-[var(--surface)]"
            : selected
              ? "border-[var(--trust-blue)]/40 bg-[var(--trust-blue)]/[0.06] hover:border-[var(--trust-blue)]/60"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]",
          h,
        )}
      >
        {icon && (
          <span
            className={cn(
              "shrink-0",
              selected ? "text-[var(--trust-blue)]" : "text-[var(--text-muted)]",
            )}
          >
            {icon}
          </span>
        )}
        <span
          className={cn(
            "flex-1 text-left truncate",
            selected
              ? "text-[var(--text)] font-medium"
              : "text-[var(--text-soft)]",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ArrowDown2
          size={16}
          className={cn(
            "text-[var(--text-muted)] transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-full min-w-[180px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-xl)] overflow-hidden animate-rise",
            openUp ? "bottom-full mb-2" : "mt-2",
          )}
        >
          {searchable && (
            <div className="pb-1.5">
              <div className="relative">
                <SearchNormal1
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Qidirish..."
                  className="h-9 w-full pl-9 pr-2.5 rounded-[9px] border border-[var(--border)] bg-[var(--surface-2)]/50 text-[13px] text-[var(--text)] placeholder:text-[var(--text-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-[var(--trust-blue)]"
                />
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-[var(--text-muted)] text-center">
                Topilmadi
              </p>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[9px] text-[13px] text-left cursor-pointer transition-colors",
                      active
                        ? "bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] font-medium"
                        : "text-[var(--text)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <TickCircle size={16} variant="Bold" />}
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
