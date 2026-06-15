"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  DocumentUpload,
  DocumentText,
  Calendar,
  TickCircle,
  CloseCircle,
  InfoCircle,
} from "iconsax-reactjs";

type Summary = {
  company: string;
  region: string | null;
  reportDate: string;
  sheets: number;
  loans: number;
  ledger: number;
  balanceLines: number;
  borrowed: number;
  norms: number;
  assets: number;
  liabilities: number;
  capital: number;
  profit: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reportDate, setReportDate] = useState("");
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  function pick(f: File | null) {
    if (!f) return;
    if (!/\.(xls|xlsx)$/i.test(f.name)) {
      setError("Faqat .xls yoki .xlsx fayl");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Fayl tanlang");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (reportDate) fd.append("reportDate", reportDate);
      fd.append("isConsolidated", String(isConsolidated));

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Yuklashda xatolik");
        return;
      }
      setSummary(data.summary);
      setReportId(data.reportId);
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm() {
    if (!reportId) return;
    setConfirming(true);
    const res = await fetch(`/api/reports/${reportId}/confirm`, {
      method: "POST",
    });
    const data = await res.json();
    setConfirming(false);
    if (res.ok) {
      router.push(`/firmalar/${data.companyId}`);
      router.refresh();
    } else {
      setError(data.error ?? "Tasdiqlashda xatolik");
      setSummary(null);
    }
  }

  async function onCancel() {
    if (reportId) {
      await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    }
    setSummary(null);
    setReportId(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <form onSubmit={onUpload}>
        <Card className="p-5 space-y-5">
          {/* Drag & drop */}
          <div>
            <Label>Excel fayl (.xls / .xlsx)</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-[12px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver
                  ? "border-[var(--trust-blue)] bg-[var(--trust-blue)]/5"
                  : "border-[var(--border)] hover:border-[var(--trust-blue)]/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              <div className="mx-auto grid place-items-center h-12 w-12 rounded-full bg-[var(--surface-2)] text-[var(--trust-blue)]">
                {file ? <DocumentText size={24} /> : <DocumentUpload size={24} />}
              </div>
              {file ? (
                <p className="mt-3 text-sm font-medium text-[var(--text)]">
                  {file.name}{" "}
                  <span className="text-[var(--text-muted)]">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </p>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium text-[var(--text)]">
                    Faylni shu yerga tashlang yoki bosing
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    MFO hisobot paketi (.xls)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Sana */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Hisobot sanasi</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="h-10 w-full pl-10 pr-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setReportDate(yesterdayISO())}
                >
                  Kechagi
                </Button>
              </div>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Bo&apos;sh qoldirsangiz, fayldagi sana ishlatiladi
              </p>
            </div>

            <div>
              <Label>Belgi</Label>
              <label className="flex items-center gap-2 h-10 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConsolidated}
                  onChange={(e) => setIsConsolidated(e.target.checked)}
                  className="accent-[var(--trust-blue)] w-4 h-4"
                />
                <span className="text-sm text-[var(--text)]">
                  Umumiy (konsolidatsiya)
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
              <InfoCircle size={16} /> {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="gold" size="lg" disabled={loading || !file}>
              {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
              {!loading && <DocumentUpload size={18} />}
            </Button>
          </div>
        </Card>
      </form>

      {/* Tasdiqlash modali */}
      <Modal
        open={!!summary}
        onClose={onCancel}
        title="Hisobotni tasdiqlash"
        width="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={confirming}>
              <CloseCircle size={18} /> Bekor qilish
            </Button>
            <Button variant="gold" onClick={onConfirm} disabled={confirming}>
              <TickCircle size={18} />
              {confirming ? "Saqlanmoqda..." : "Tasdiqlash va saqlash"}
            </Button>
          </>
        }
      >
        {summary && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text)]">
                  {summary.company}
                </p>
                <p className="text-[13px] text-[var(--text-muted)]">
                  {summary.region ?? "—"} ·{" "}
                  {new Date(summary.reportDate).toLocaleDateString("ru-RU")}
                </p>
              </div>
              {isConsolidated && <Badge tone="gold">Umumiy</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Jami aktivlar" value={fmt(summary.assets)} tone />
              <Stat label="Jami kapital" value={fmt(summary.capital)} tone />
              <Stat label="Jami majburiyatlar" value={fmt(summary.liabilities)} />
              <Stat
                label="Sof foyda"
                value={fmt(summary.profit)}
                positive={summary.profit >= 0}
              />
            </div>

            <div className="rounded-[10px] border border-[var(--border)] divide-y divide-[var(--border)] text-[13px]">
              <Row label="Varaqlar (saqlanadi)" value={summary.sheets} />
              <Row label="Kredit portfeli qatorlari" value={summary.loans} />
              <Row label="Konsolidatsiya hisobvaraqlari" value={summary.ledger} />
              <Row label="Balans qatorlari" value={summary.balanceLines} />
              <Row label="Jalb etilgan mablag'lar" value={summary.borrowed} />
              <Row label="Normativlar" value={summary.norms} />
            </div>

            <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
              <InfoCircle size={15} />
              Tasdiqlangach hisobot dashboard va firma sahifasida ko&apos;rinadi.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
  positive,
}: {
  label: string;
  value: string;
  tone?: boolean;
  positive?: boolean;
}) {
  const color =
    positive === undefined
      ? tone
        ? "text-[var(--trust-blue)]"
        : "text-[var(--text)]"
      : positive
        ? "text-[var(--profit)]"
        : "text-[var(--loss)]";
  return (
    <div className="rounded-[10px] bg-[var(--surface-2)] p-3">
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold tnum ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-medium tnum text-[var(--text)]">
        {value.toLocaleString("ru-RU")}
      </span>
    </div>
  );
}
