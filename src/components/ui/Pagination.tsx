"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft2, ArrowRight2 } from "iconsax-reactjs";
import { PAGE_SIZES } from "@/lib/constants";

export function Pagination({
  total,
  page,
  pageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function go(p: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    router.replace(`${pathname}?${sp.toString()}`);
  }

  function setSize(s: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("size", String(s));
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-[13px] text-[var(--text-muted)]">
      <div className="flex items-center gap-2">
        <span className="tnum">
          {from}–{to} / {total.toLocaleString("ru-RU")}
        </span>
        <select
          value={pageSize}
          onChange={(e) => setSize(Number(e.target.value))}
          className="h-8 px-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer text-[var(--text)]"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} / bet
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="grid place-items-center h-8 w-8 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)]"
          aria-label="Oldingi"
        >
          <ArrowLeft2 size={16} />
        </button>
        <span className="px-3 tnum">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="grid place-items-center h-8 w-8 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)]"
          aria-label="Keyingi"
        >
          <ArrowRight2 size={16} />
        </button>
      </div>
    </div>
  );
}
