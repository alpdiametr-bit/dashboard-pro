"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchNormal1, CloseCircle } from "iconsax-reactjs";

export function SearchInput({
  placeholder = "Qidirish...",
  paramKey = "q",
}: {
  placeholder?: string;
  paramKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(paramKey) ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(paramKey, value);
      else sp.delete(paramKey);
      sp.delete("page"); // qidirishda 1-betga qaytish
      startTransition(() => {
        router.replace(`${pathname}?${sp.toString()}`);
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="group relative">
      <SearchNormal1
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--trust-blue)]"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full pl-11 pr-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] shadow-[var(--shadow-xs)] placeholder:text-[var(--text-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-[var(--trust-blue)] transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Tozalash"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--loss)] transition-colors"
        >
          <CloseCircle size={16} />
        </button>
      )}
    </div>
  );
}
