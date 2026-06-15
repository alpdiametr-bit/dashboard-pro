"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  DocumentUpload,
  Gallery,
  DocumentText,
  Document,
  Star1,
  Trash,
  DocumentDownload,
  CloseCircle,
  TickCircle,
  Warning2,
} from "iconsax-reactjs";

type Doc = {
  id: number;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  kind: string;
  mimeType: string | null;
  fileSize: number | null;
  isPinned: boolean;
  createdAt: string;
  uploadedBy: { name: string | null; login: string } | null;
};

const KIND_META: Record<
  string,
  { label: string; tone: "info" | "profit" | "warning" | "loss" | "neutral" | "gold" }
> = {
  image: { label: "Rasm", tone: "info" },
  excel: { label: "Excel", tone: "profit" },
  csv: { label: "CSV", tone: "profit" },
  pdf: { label: "PDF", tone: "loss" },
  word: { label: "Word", tone: "info" },
  other: { label: "Fayl", tone: "neutral" },
};

function KindIcon({ kind, size = 22 }: { kind: string; size?: number }) {
  if (kind === "image") return <Gallery size={size} variant="Bold" />;
  if (kind === "excel" || kind === "csv")
    return <DocumentText size={size} variant="Bold" />;
  return <Document size={size} variant="Bold" />;
}

function fmtSize(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(s: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
}

export function DocumentsPanel({ companyId }: { companyId: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const res = await fetch(`/api/companies/${companyId}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents);
    }
    setLoaded(true);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/companies/${companyId}/documents`);
      if (!active) return;
      if (res.ok) {
        const data = await res.json();
        if (active) setDocs(data.documents);
      }
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  function pickFile(f: File | null) {
    if (!f) return;
    setError(null);
    setFile(f);
    // sarlavhani fayl nomidan (kengaytmasiz) avto to'ldirish
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function resetForm() {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Fayl tanlang");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      const res = await fetch(`/api/companies/${companyId}/documents`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Yuklashda xatolik");
        return;
      }
      setDocs((d) => [data.document, ...d]);
      resetForm();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setUploading(false);
    }
  }

  async function togglePin(doc: Doc) {
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: !doc.isPinned }),
    });
    if (res.ok) load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/documents/${toDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setDocs((d) => d.filter((x) => x.id !== toDelete.id));
      setToDelete(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Yuklash formasi */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <DocumentUpload size={18} /> Hujjat yuklash
            </span>
          </CardTitle>
          <span className="text-[12px] text-[var(--text-muted)]">
            Rasm, Excel, CSV, PDF, Word · 25 MB gacha
          </span>
        </CardHeader>
        <CardBody>
          <form onSubmit={upload} className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="grid place-items-center h-24 w-24 rounded-[14px] border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] cursor-pointer overflow-hidden hover:border-[var(--trust-blue)]/50 shrink-0"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : file ? (
                  <div className="text-center text-[var(--text-muted)]">
                    <KindIcon kind="other" size={28} />
                    <p className="text-[10px] mt-1 px-1 truncate max-w-[80px]">
                      .{file.name.split(".").pop()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-[var(--text-muted)]">
                    <DocumentUpload size={26} />
                    <p className="text-[10px] mt-1">Tanlash</p>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <Label htmlFor="doctitle">Hujjat nomi</Label>
                  <Input
                    id="doctitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Fayl nomidan avtomatik olinadi"
                  />
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.xls,.xlsx,.xlsm,.csv,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <p className="text-[12px] text-[var(--text-muted)] truncate">
                    {file.name} · {fmtSize(file.size)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="docdesc">Izoh</Label>
              <textarea
                id="docdesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hujjat haqida qisqacha (ixtiyoriy)"
                rows={2}
                className="w-full px-3 py-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] resize-none focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
                <CloseCircle size={16} /> {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" variant="gold" disabled={uploading || !file}>
                <TickCircle size={18} />
                {uploading ? "Yuklanmoqda..." : "Yuklash"}
              </Button>
              {file && (
                <Button type="button" variant="secondary" onClick={resetForm} disabled={uploading}>
                  <CloseCircle size={18} /> Bekor
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Hujjatlar ro'yxati */}
      <Card>
        <CardHeader>
          <CardTitle>Firma hujjatlari</CardTitle>
          <span className="text-[12px] text-[var(--text-muted)]">
            {docs.length} ta
          </span>
        </CardHeader>
        <CardBody>
          {!loaded ? (
            <p className="text-center text-[var(--text-muted)] py-8 text-sm">
              Yuklanmoqda...
            </p>
          ) : docs.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-10">
              <Document size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Hujjat yuklanmagan</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {docs.map((doc) => {
                const meta = KIND_META[doc.kind] ?? KIND_META.other;
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "group rounded-[14px] border bg-[var(--surface)] overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]",
                      doc.isPinned
                        ? "border-[var(--gold)]/50 ring-1 ring-[var(--gold)]/20"
                        : "border-[var(--border)]",
                    )}
                  >
                    {/* Preview / icon */}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-32 bg-[var(--surface-2)] relative overflow-hidden"
                    >
                      {doc.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.fileUrl}
                          alt={doc.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-[var(--text-muted)]">
                          <KindIcon kind={doc.kind} size={40} />
                        </div>
                      )}
                      <span className="absolute top-2 left-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </span>
                      {doc.isPinned && (
                        <span className="absolute top-2 right-2 grid place-items-center h-6 w-6 rounded-full bg-[var(--gold)] text-white">
                          <Star1 size={13} variant="Bold" />
                        </span>
                      )}
                    </a>

                    {/* Tafsilot */}
                    <div className="p-3">
                      <h4 className="text-[13px] font-semibold text-[var(--text)] truncate" title={doc.title}>
                        {doc.title}
                      </h4>
                      {doc.description && (
                        <p className="text-[12px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--text-muted)] mt-1.5 truncate" title={doc.fileName}>
                        {doc.fileName} · {fmtSize(doc.fileSize)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {fmtDate(doc.createdAt)} ·{" "}
                        {doc.uploadedBy?.name ?? doc.uploadedBy?.login ?? "—"}
                      </p>

                      {/* Amallar */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <button
                          onClick={() => togglePin(doc)}
                          title={doc.isPinned ? "Qadashdan olib tashlash" : "Tepaga qadash"}
                          className={cn(
                            "grid place-items-center h-8 w-8 rounded-[8px] border cursor-pointer transition-colors",
                            doc.isPinned
                              ? "border-[var(--gold)] bg-[var(--gold)]/12 text-[var(--gold)]"
                              : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--gold)]",
                          )}
                        >
                          <Star1 size={15} variant={doc.isPinned ? "Bold" : "Outline"} />
                        </button>
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          className="grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--trust-blue)] cursor-pointer transition-colors"
                          title="Yuklab olish"
                        >
                          <DocumentDownload size={15} />
                        </a>
                        <button
                          onClick={() => setToDelete(doc)}
                          title="O'chirish"
                          className="grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--loss)] hover:border-[var(--loss)]/40 cursor-pointer transition-colors ml-auto"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Hujjatni o'chirish — qat'iy tasdiqlash */}
      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        title="Hujjatni o'chirish"
        width="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              <CloseCircle size={18} /> Bekor qilish
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              <Trash size={18} />
              {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </Button>
          </>
        }
      >
        {toDelete && (
          <div className="space-y-3.5">
            <div className="flex items-start gap-3 rounded-[10px] bg-[var(--loss)]/8 border border-[var(--loss)]/20 p-3">
              <Warning2 size={20} variant="Bold" className="text-[var(--loss)] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[var(--text)] leading-relaxed">
                Bu hujjat fayli serverdan butunlay o&apos;chiriladi. Bu amalni
                qaytarib bo&apos;lmaydi. O&apos;chirish audit jurnaliga yoziladi.
              </p>
            </div>
            <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] p-3">
              <span className="grid place-items-center h-9 w-9 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] shrink-0">
                <KindIcon kind={toDelete.kind} size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--text)] truncate" title={toDelete.title}>
                  {toDelete.title}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate" title={toDelete.fileName}>
                  {toDelete.fileName} · {fmtSize(toDelete.fileSize)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
