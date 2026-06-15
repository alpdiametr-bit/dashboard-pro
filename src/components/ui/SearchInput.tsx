"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchNormal1 } from "iconsax-reactjs";

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
    <div className="relative">
      <SearchNormal1
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full pl-10 pr-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30 focus:border-[var(--trust-blue)]"
      />
    </div>
  );
}
