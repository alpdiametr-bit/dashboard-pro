"use client";

import {
  ArrowLeft2,
  ArrowRight2,
  ArrowLeft3,
  ArrowRight3,
} from "iconsax-reactjs";
import { cn } from "@/lib/cn";

/** Sahifa raqamlari (ellipsis bilan) */
function pageList(current: number, totalPages: number): (number | "…")[] {
  const range: (number | "…")[] = [];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);
  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push("…");
  if (totalPages > 1) range.push(totalPages);
  return range;
}

/**
 * State-asosidagi premium pagination (URL parametrlarsiz).
 * SheetViewer kabi lokal pager uchun.
 */
export function Pager({
  page,
  total,
  pageSize,
  onChange,
  label = "qator",
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = pageList(page, totalPages);

  function go(p: number) {
    onChange(Math.min(Math.max(1, p), totalPages));
  }

  const navBtn =
    "grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer shadow-[var(--shadow-xs)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1.5 py-2.5 text-[13px] text-[var(--text-muted)]">
      <span className="tnum">
        <span className="font-semibold text-[var(--text)]">
          {total.toLocaleString("ru-RU")}
        </span>{" "}
        {label}
      </span>

      <div className="flex items-center gap-1.5">
        <button onClick={() => go(1)} disabled={page <= 1} className={navBtn} title="Birinchi">
          <ArrowLeft3 size={16} />
        </button>
        <button onClick={() => go(page - 1)} disabled={page <= 1} className={navBtn} aria-label="Oldingi">
          <ArrowLeft2 size={16} />
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="grid place-items-center h-8 w-8 text-[var(--text-muted)] select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "grid place-items-center h-8 min-w-8 px-2 rounded-[8px] tnum text-[13px] cursor-pointer transition-all",
                  p === page
                    ? "bg-[var(--trust-blue)] text-white font-semibold shadow-[var(--shadow-sm)]"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <span className="sm:hidden px-2.5 tnum">
          <span className="font-semibold text-[var(--text)]">{page}</span> / {totalPages}
        </span>

        <button onClick={() => go(page + 1)} disabled={page >= totalPages} className={navBtn} aria-label="Keyingi">
          <ArrowRight2 size={16} />
        </button>
        <button onClick={() => go(totalPages)} disabled={page >= totalPages} className={navBtn} title="Oxirgi">
          <ArrowRight3 size={16} />
        </button>
      </div>
    </div>
  );
}
