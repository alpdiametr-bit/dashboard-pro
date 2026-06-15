"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ArrowLeft2, ArrowRight2 } from "iconsax-reactjs";
import { cn } from "@/lib/cn";

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];
// Hafta dushanbadan boshlanadi
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Premium kalendar / sana tanlash (date picker).
 * Qiymat ISO formatda (yyyy-mm-dd) saqlanadi.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Sana tanlang",
  className,
  max,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = fromISO(value);
  const today = new Date();
  const [view, setView] = useState<Date>(
    () => selected ?? new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const maxDate = max ? fromISO(max) : null;

  useEffect(() => {
    if (open && selected) {
      setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Joriy oy uchun katakchalar (dushanba = 0)
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0,
  ).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  function pick(d: Date) {
    onChange(toISO(d));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  const label = selected
    ? selected.toLocaleDateString("ru-RU")
    : placeholder;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-[10px] border bg-[var(--surface)] px-3.5 text-sm shadow-[var(--shadow-xs)] transition-all duration-200",
          "focus:outline-none focus:ring-4 focus:ring-[var(--ring)]",
          open
            ? "border-[var(--trust-blue)] ring-4 ring-[var(--ring)]"
            : "border-[var(--border)] hover:border-[var(--border-strong)]",
        )}
      >
        <Calendar
          size={18}
          variant={selected ? "Bold" : "Outline"}
          className="text-[var(--trust-blue)] shrink-0"
        />
        <span
          className={cn(
            "tnum",
            selected ? "text-[var(--text)]" : "text-[var(--text-soft)]",
          )}
        >
          {label}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[290px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-xl)] animate-rise"
          role="dialog"
        >
          {/* sarlavha — oy navigatsiyasi */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="grid h-8 w-8 place-items-center rounded-[9px] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
              aria-label="Oldingi oy"
            >
              <ArrowLeft2 size={16} />
            </button>
            <div className="text-[13px] font-semibold text-[var(--text)]">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="grid h-8 w-8 place-items-center rounded-[9px] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
              aria-label="Keyingi oy"
            >
              <ArrowRight2 size={16} />
            </button>
          </div>

          {/* hafta kunlari */}
          <div className="grid grid-cols-7 gap-1 px-0.5 pb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={cn(
                  "grid h-7 place-items-center text-[11px] font-medium",
                  i >= 5 ? "text-[var(--loss)]/70" : "text-[var(--text-soft)]",
                )}
              >
                {w}
              </div>
            ))}
          </div>

          {/* kunlar */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const isSel = selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              const disabled = maxDate ? d > maxDate : false;
              const weekend = (i % 7) >= 5;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  className={cn(
                    "relative grid h-9 place-items-center rounded-[9px] text-[13px] tnum transition-all duration-150",
                    disabled && "opacity-30 cursor-not-allowed",
                    isSel
                      ? "bg-gradient-to-b from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white font-semibold shadow-[var(--shadow-blue)]"
                      : cn(
                          "hover:bg-[var(--surface-2)]",
                          weekend
                            ? "text-[var(--loss)]/80"
                            : "text-[var(--text)]",
                        ),
                  )}
                >
                  {d.getDate()}
                  {isToday && !isSel && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--gold)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* tezkor amallar */}
          <div className="mt-2.5 flex items-center gap-2 border-t border-[var(--border)] pt-2.5">
            <QuickBtn
              label="Bugun"
              onClick={() => {
                const d = new Date();
                if (!maxDate || d <= maxDate) pick(d);
              }}
            />
            <QuickBtn
              label="Kecha"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                pick(d);
              }}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="ml-auto text-[12px] text-[var(--text-muted)] hover:text-[var(--loss)] transition-colors"
              >
                Tozalash
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[8px] bg-[var(--surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--trust-blue)]/10 hover:text-[var(--trust-blue)] transition-colors"
    >
      {label}
    </button>
  );
}
