"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash, Warning2, CloseCircle } from "iconsax-reactjs";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Firmani o'chirish tugmasi — faqat hisoboti (datasi) bo'lmagan firmalar uchun.
 * Karta ichida ishlatilganda navigatsiyani to'xtatadi.
 */
export function DeleteCompanyButton({
  companyId,
  companyName,
  size = 16,
  stopNavigation = false,
  variant = "icon",
  reportCount = 0,
}: {
  companyId: number;
  companyName: string;
  size?: number;
  stopNavigation?: boolean;
  variant?: "icon" | "labeled";
  reportCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = reportCount > 0;

  function openModal(e: React.MouseEvent) {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError(null);
    setOpen(true);
  }

  async function confirmDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "O'chirishda xatolik");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {variant === "labeled" ? (
        <button
          onClick={openModal}
          title="Firmani o'chirish"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer transition-colors hover:border-[var(--loss)]/40 hover:bg-[var(--loss)]/10 hover:text-[var(--loss)]"
        >
          <Trash size={size} /> O&apos;chirish
        </button>
      ) : (
        <button
          onClick={openModal}
          title="Firmani o'chirish"
          aria-label="Firmani o'chirish"
          className="group grid place-items-center h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer transition-all hover:border-[var(--loss)]/50 hover:bg-[var(--loss)]/10 hover:text-[var(--loss)] active:scale-95"
        >
          <Trash size={size} variant="Bold" className="opacity-80 group-hover:opacity-100" />
        </button>
      )}

      <Modal
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Firmani o'chirish"
        width="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <CloseCircle size={18} /> Bekor
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={loading || blocked}
            >
              <Trash size={18} />
              {loading ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--loss)]/12 text-[var(--loss)]">
            <Warning2 size={24} variant="Bold" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] text-[var(--text)]">
              <span className="font-semibold">{companyName}</span> firmasini
              o&apos;chirmoqchimisiz?
            </p>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Bu amalni qaytarib bo&apos;lmaydi. Firma logosi va barcha
              hujjatlari ham o&apos;chiriladi.
            </p>
          </div>
        </div>

        {blocked && (
          <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-[var(--warning)]/10 text-[var(--warning)] px-3 py-2.5 text-[13px]">
            <Warning2 size={16} className="shrink-0 mt-0.5" />
            <span>
              Bu firmada <span className="font-semibold">{reportCount} ta hisobot</span>{" "}
              mavjud. Avval &laquo;Yuklangan fayllar&raquo; bo&apos;limidan
              hisobotlarni o&apos;chiring, so&apos;ng firmani o&apos;chirish mumkin bo&apos;ladi.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
            <Warning2 size={16} /> {error}
          </div>
        )}
      </Modal>
    </>
  );
}
