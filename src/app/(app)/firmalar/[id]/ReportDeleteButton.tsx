"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Trash, CloseCircle, Warning2, DocumentText } from "iconsax-reactjs";

/**
 * Hisobotni o'chirish tugmasi + qat'iy tasdiqlash modali.
 * O'chirilsa audit jurnaliga (qaysi fayl) yoziladi (server tomonda).
 */
export function ReportDeleteButton({
  reportId,
  companyId,
  fileName,
  reportDateLabel,
  status,
}: {
  reportId: number;
  companyId: number;
  fileName: string;
  reportDateLabel: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "O'chirishda xatolik");
        return;
      }
      setOpen(false);
      // ?report= eski (o'chirilgan) ID'ga ishora qilmasin — fayllar tabiga toza qaytamiz
      router.push(`/firmalar/${companyId}?tab=fayllar`);
      router.refresh();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Hisobotni o'chirish"
        aria-label="Hisobotni o'chirish"
        className="grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--loss)] hover:border-[var(--loss)]/40 transition-colors cursor-pointer"
      >
        <Trash size={16} />
      </button>

      <Modal
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Hisobotni o'chirish"
        width="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <CloseCircle size={18} /> Bekor qilish
            </Button>
            <Button variant="danger" onClick={onDelete} disabled={loading}>
              <Trash size={18} />
              {loading ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="flex items-start gap-3 rounded-[10px] bg-[var(--loss)]/8 border border-[var(--loss)]/20 p-3">
            <Warning2 size={20} variant="Bold" className="text-[var(--loss)] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[var(--text)] leading-relaxed">
              Bu hisobot va unga tegishli <span className="font-semibold">barcha ma&apos;lumotlar</span>{" "}
              (balans, kredit portfeli, varaqlar va boshqalar) butunlay o&apos;chiriladi.
              Bu amalni qaytarib bo&apos;lmaydi. O&apos;chirish audit jurnaliga yoziladi.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] p-3">
            <span className="grid place-items-center h-9 w-9 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] shrink-0">
              <DocumentText size={17} variant="Bold" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--text)] truncate" title={fileName}>
                {fileName}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {reportDateLabel} ·{" "}
                {status === "CONFIRMED" ? "Tasdiqlangan" : "Kutilmoqda"}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-[var(--loss)] flex items-center gap-1.5">
              <Warning2 size={15} /> {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
