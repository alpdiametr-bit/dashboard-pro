"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { UZ_REGIONS } from "@/lib/constants";
import {
  AddCircle,
  Building,
  Gallery,
  InfoCircle,
  CloseCircle,
  TickCircle,
  Location,
} from "iconsax-reactjs";

export function AddCompanyButton() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [inn, setInn] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setRegion("");
    setInn("");
    setDescription("");
    setImage(null);
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
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

      const res = await fetch("/api/companies", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Xatolik");
        return;
      }
      setOpen(false);
      reset();
      // Yangi firma sahifasiga o'tamiz — aktiv filtr tufayli ro'yxatda
      // ko'rinmay qolmasligi uchun (tasdiq sifatida).
      if (data.company?.id) {
        router.push(`/firmalar/${data.company.id}`);
      }
      router.refresh();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="gold" onClick={() => setOpen(true)}>
        <AddCircle size={18} /> Firma qo&apos;shish
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="Yangi firma qo'shish"
        width="max-w-lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={loading}
            >
              <CloseCircle size={18} /> Bekor
            </Button>
            <Button variant="gold" onClick={onSubmit} disabled={loading}>
              <TickCircle size={18} />
              {loading ? "Saqlanmoqda..." : "Qo'shish"}
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
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[13px] text-[var(--trust-blue)] hover:underline cursor-pointer"
              >
                Rasm tanlash
              </button>
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
            <Label htmlFor="cname">Firma nomi *</Label>
            <div className="relative">
              <Building
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <Input
                id="cname"
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
              <Label htmlFor="inn">STIR (INN)</Label>
              <Input
                id="inn"
                value={inn}
                onChange={(e) => setInn(e.target.value)}
                placeholder="123456789"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Tavsif</Label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Firma haqida qisqacha ma'lumot..."
              className="w-full px-3 py-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30 focus:border-[var(--trust-blue)] resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
              <InfoCircle size={16} /> {error}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
