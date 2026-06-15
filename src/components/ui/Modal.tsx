"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseCircle } from "iconsax-reactjs";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Modal ochiq paytda sahifa scroll bo'lmasin
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Modallar har doim yopiq holda boshlanadi → SSR'da chiqmaydi.
  // Klientda `open` true bo'lganda document mavjud bo'ladi.
  if (!open || typeof document === "undefined") return null;

  // document.body ga portal — har qanday transform/backdrop-blur/overflow
  // ota-elementdan qat'i nazar modal viewport markazida va eng ustda chiqadi.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} bg-[var(--surface)] rounded-[16px] shadow-[var(--shadow-lg)] border border-[var(--border)] max-h-[90vh] flex flex-col`}
        style={{ animation: "dp-modal-in 0.18s cubic-bezier(0.2,0.7,0.2,1)" }}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            aria-label="Yopish"
          >
            <CloseCircle size={22} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
