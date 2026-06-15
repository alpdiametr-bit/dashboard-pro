"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Star1 } from "iconsax-reactjs";

/**
 * Qadab qo'yish (pin) tugmasi — firma yoki hisobot uchun.
 * `endpoint` PATCH so'rovini qabul qiladi va {isPinned} qaytaradi.
 */
export function PinButton({
  endpoint,
  pinned,
  size = 18,
  variant = "icon",
  stopNavigation = false,
}: {
  endpoint: string;
  pinned: boolean;
  size?: number;
  variant?: "icon" | "labeled";
  stopNavigation?: boolean;
}) {
  const router = useRouter();
  const [isPinned, setIsPinned] = useState(pinned);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading) return;
    setLoading(true);
    // optimistik
    const next = !isPinned;
    setIsPinned(next);
    try {
      const res = await fetch(endpoint, { method: "PATCH" });
      if (!res.ok) {
        setIsPinned(!next);
      } else {
        const data = await res.json().catch(() => null);
        if (data && typeof data.isPinned === "boolean") setIsPinned(data.isPinned);
        router.refresh();
      }
    } catch {
      setIsPinned(!next);
    } finally {
      setLoading(false);
    }
  }

  if (variant === "labeled") {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={isPinned ? "Qadashdan olib tashlash" : "Tepaga qadash"}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-medium border transition-colors cursor-pointer disabled:opacity-50",
          isPinned
            ? "border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--gold)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]",
        )}
      >
        <Star1 size={size} variant={isPinned ? "Bold" : "Outline"} />
        {isPinned ? "Qadalgan" : "Qadash"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isPinned ? "Qadashdan olib tashlash" : "Tepaga qadash"}
      aria-label={isPinned ? "Qadashdan olib tashlash" : "Tepaga qadash"}
      className={cn(
        "grid place-items-center h-8 w-8 rounded-[8px] border transition-colors cursor-pointer disabled:opacity-50",
        isPinned
          ? "border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--gold)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--gold)]",
      )}
    >
      <Star1 size={size} variant={isPinned ? "Bold" : "Outline"} />
    </button>
  );
}
