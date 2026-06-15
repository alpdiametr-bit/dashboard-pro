"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowLeft2,
  ArrowRight2,
  ArrowLeft3,
  ArrowRight3,
} from "iconsax-reactjs";
import { PAGE_SIZES } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { Dropdown } from "./Dropdown";

/** Ko'rsatiladigan sahifa raqamlari ro'yxati (ellipsis bilan) */
function pageList(current: number, totalPages: number): (number | "…")[] {
  const delta = 1; // joriy atrofidagi qo'shni sahifalar
  const range: (number | "…")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(totalPages - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push("…");
  if (totalPages > 1) range.push(totalPages);

  return range;
}

export function Pagination({
  total,
  page,
  pageSize,
  showSize = true,
}: {
  total: number;
  page: number;
  pageSize: number;
  showSize?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function go(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(next));
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function setSize(s: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("size", String(s));
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = pageList(page, totalPages);

  const navBtn =
    "grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer shadow-[var(--shadow-xs)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1.5 py-2.5 text-[13px] text-[var(--text-muted)]">
      <div className="flex items-center gap-2.5">
        <span className="tnum">
          <span className="font-semibold text-[var(--text)]">
            {from}–{to}
          </span>{" "}
          / {total.toLocaleString("ru-RU")}
        </span>
        {showSize && (
          <Dropdown
            size="sm"
            className="w-[110px]"
            openUp
            options={PAGE_SIZES.map((s) => ({
              value: String(s),
              label: `${s} / bet`,
            }))}
            value={String(pageSize)}
            onChange={(v) => setSize(Number(v))}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Birinchi sahifa */}
        <button
          onClick={() => go(1)}
          disabled={page <= 1}
          className={navBtn}
          aria-label="Birinchi sahifa"
          title="Birinchi"
        >
          <ArrowLeft3 size={16} />
        </button>
        {/* Oldingi */}
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className={navBtn}
          aria-label="Oldingi"
        >
          <ArrowLeft2 size={16} />
        </button>

        {/* Raqamli sahifalar */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "…" ? (
              <span
                key={`e${i}`}
                className="grid place-items-center h-8 w-8 text-[var(--text-muted)] select-none"
              >
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

        {/* Mobil: faqat joriy / jami */}
        <span className="sm:hidden px-2.5 tnum">
          <span className="font-semibold text-[var(--text)]">{page}</span> /{" "}
          {totalPages}
        </span>

        {/* Keyingi */}
        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className={navBtn}
          aria-label="Keyingi"
        >
          <ArrowRight2 size={16} />
        </button>
        {/* Oxirgi sahifa */}
        <button
          onClick={() => go(totalPages)}
          disabled={page >= totalPages}
          className={navBtn}
          aria-label="Oxirgi sahifa"
          title="Oxirgi"
        >
          <ArrowRight3 size={16} />
        </button>
      </div>
    </div>
  );
}
