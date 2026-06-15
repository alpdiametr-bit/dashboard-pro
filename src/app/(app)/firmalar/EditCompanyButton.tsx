"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { UZ_REGIONS } from "@/lib/constants";
import {
  Edit2,
  Building,
  Gallery,
  InfoCircle,
  CloseCircle,
  TickCircle,
  Location,
  Trash,
} from "iconsax-reactjs";

type Company = {
  id: number;
  name: string;
  region: string | null;
  inn: string | null;
  description: string | null;
  imageUrl: string | null;
};

/**
 * Firma ma'lumotlarini tahrirlash tugmasi (rasm, nom, STIR, hudud, tavsif).
 */
export function EditCompanyButton({
  company,
  variant = "labeled",
  stopNavigation = false,
}: {
  company: Company;
  variant?: "icon" | "labeled";
  stopNavigation?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [region, setRegion] = useState(company.region ?? "");
  const [inn, setInn] = useState(company.inn ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(company.imageUrl);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal(e: React.MouseEvent) {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    // joriy qiymatlarga qaytaramiz
    setName(company.name);
    setRegion(company.region ?? "");
    setInn(company.inn ?? "");
    setDescription(company.description ?? "");
    setImage(null);
    setPreview(company.imageUrl);
    setRemoveImage(false);
    setError(null);
    setOpen(true);
  }

  function pickImage(f: File | null) {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) {
      setError("Faqat PNG, JPG, WEBP yoki SVG");
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      setError("Rasm 4 MB dan kichik bo'lsin");
      return;
    }
    setError(null);
    setImage(f);
    setPreview(URL.createObjectURL(f));
    setRemoveImage(false);
  }

  function clearImage() {
    setImage(null);
    setPreview(null);
    setRemoveImage(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Firma nomi kiriting");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("region", region.trim());
      fd.append("inn", inn.trim());
      fd.append("description", description.trim());
      if (image) fd.append("image", image);
      if (removeImage) fd.append("removeImage", "true");

      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Xatolik");
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
          title="Tahrirlash"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer transition-colors hover:border-[var(--trust-blue)]/40 hover:bg-[var(--trust-blue)]/8 hover:text-[var(--trust-blue)]"
        >
          <Edit2 size={16} /> Tahrirlash
        </button>
      ) : (
        <button
          onClick={openModal}
          title="Tahrirlash"
          aria-label="Tahrirlash"
          className="group grid place-items-center h-9 w-9 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] cursor-pointer transition-all hover:border-[var(--trust-blue)]/50 hover:bg-[var(--trust-blue)]/10 hover:text-[var(--trust-blue)] active:scale-95"
        >
          <Edit2 size={16} variant="Bold" className="opacity-80 group-hover:opacity-100" />
        </button>
      )}

      <Modal
        open={open}
        onClose={() => !loading && setOpen(false)}
        title="Firmani tahrirlash"
        width="max-w-lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <CloseCircle size={18} /> Bekor
            </Button>
            <Button variant="gold" onClick={onSubmit} disabled={loading}>
              <TickCircle size={18} />
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="grid place-items-center h-20 w-20 rounded-[14px] border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] cursor-pointer overflow-hidden hover:border-[var(--trust-blue)]/50 shrink-0"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <Gallery size={26} className="text-[var(--text-muted)]" />
              )}
            </div>
            <div>
              <p className="text-[13px] font-medium text-[var(--text)]">
                Logo / rasm
              </p>
              <p className="text-[12px] text-[var(--text-muted)] mb-1.5">
                PNG, JPG, WEBP, SVG · 4 MB gacha
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[13px] text-[var(--trust-blue)] hover:underline cursor-pointer"
                >
                  Rasm tanlash
                </button>
                {preview && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex items-center gap-1 text-[13px] text-[var(--loss)] hover:underline cursor-pointer"
                  >
                    <Trash size={14} /> O&apos;chirish
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ename">Firma nomi *</Label>
            <div className="relative">
              <Building
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <Input
                id="ename"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='"CLEVER MIKROMOLIYA TASHKILOTI" MCHJ'
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Hudud</Label>
              <Dropdown
                options={UZ_REGIONS.map((r) => ({ value: r, label: r }))}
                value={region || null}
                onChange={setRegion}
                placeholder="Hududni tanlang"
                searchable
                icon={<Location size={18} />}
              />
            </div>
            <div>
              <Label htmlFor="einn">STIR (INN)</Label>
              <Input
                id="einn"
                value={inn}
                onChange={(e) => setInn(e.target.value)}
                placeholder="123456789"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edesc">Tavsif</Label>
            <textarea
              id="edesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Firma haqida qisqacha ma'lumot..."
              className="w-full px-3 py-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-[var(--trust-blue)] resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[10px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
              <InfoCircle size={16} /> {error}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
