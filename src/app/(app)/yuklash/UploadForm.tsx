"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  DocumentUpload,
  DocumentText,
  Building,
  TickCircle,
  CloseCircle,
  InfoCircle,
  Trash,
  Warning2,
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

type CompanyOption = { id: number; name: string };

type ExistingReport = {
  id: number;
  fileName: string;
  fileSize: number | null;
  status: string;
  createdAt: string;
  reportDate: string;
  company: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function UploadForm({
  companies = [],
  defaultCompanyId,
  lockCompany = false,
  embedded = false,
  onDone,
}: {
  companies?: CompanyOption[];
  defaultCompanyId?: number;
  lockCompany?: boolean;
  embedded?: boolean;
  onDone?: (companyId: number) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState<string>(
    defaultCompanyId ? String(defaultCompanyId) : "",
  );
  const [reportDate, setReportDate] = useState("");
  const [isConsolidated, setIsConsolidated] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState<ExistingReport | null>(null);

  const lockedCompany = lockCompany
    ? companies.find((c) => String(c.id) === companyId)
    : null;

  function pick(f: File | null) {
    if (!f) return;
    if (!/\.(xls|xlsx)$/i.test(f.name)) {
      setError("Faqat .xls yoki .xlsx fayl");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function doUpload(force: boolean) {
    if (!file) {
      setError("Fayl tanlang");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (companyId) fd.append("companyId", companyId);
      if (reportDate) fd.append("reportDate", reportDate);
      fd.append("isConsolidated", String(isConsolidated));
      if (force) fd.append("force", "true");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      // Bu sana uchun allaqachon hisobot bor — almashtirishni so'raymiz
      if (res.status === 409 && data.conflict) {
        setConflict(data.existing as ExistingReport);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Yuklashda xatolik");
        return;
      }
      setConflict(null);
      setSummary(data.summary);
      setReportId(data.reportId);
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }

  function onUpload(e: React.FormEvent) {
    e.preventDefault();
    void doUpload(false);
  }

  function onReplaceConfirm() {
    setConflict(null);
    void doUpload(true);
  }

  async function onConfirm() {
    if (!reportId) return;
    setConfirming(true);
    const res = await fetch(`/api/reports/${reportId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isConsolidated }),
    });
    const data = await res.json();
    setConfirming(false);
    if (res.ok) {
      if (onDone) {
        onDone(data.companyId);
      } else {
        router.push(`/firmalar/${data.companyId}`);
        router.refresh();
      }
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

  const Wrapper: React.ElementType = embedded ? "div" : Card;
  const wrapperClass = embedded ? "space-y-5" : "p-5 space-y-5";

  return (
    <>
      <form onSubmit={onUpload}>
        <Wrapper className={wrapperClass}>
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-stretch">
            {/* CHAP: Drag & drop (asosiy, prominent) */}
            <div className="flex flex-col">
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
                className={`group flex-1 cursor-pointer rounded-[14px] border-2 border-dashed px-6 py-8 flex flex-col items-center justify-center text-center transition-colors min-h-[220px] ${
                  dragOver
                    ? "border-[var(--trust-blue)] bg-[var(--trust-blue)]/5"
                    : file
                      ? "border-[var(--profit)]/40 bg-[var(--profit)]/[0.04]"
                      : "border-[var(--border)] hover:border-[var(--trust-blue)]/50 hover:bg-[var(--surface-2)]/40"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={(e) => pick(e.target.files?.[0] ?? null)}
                />
                <div
                  className={`mx-auto grid place-items-center h-14 w-14 rounded-[16px] transition-colors ${
                    file
                      ? "bg-[var(--profit)]/12 text-[var(--profit)]"
                      : "bg-[var(--surface-2)] text-[var(--trust-blue)] group-hover:bg-[var(--trust-blue)]/10"
                  }`}
                >
                  {file ? (
                    <DocumentText size={26} variant="Bold" />
                  ) : (
                    <DocumentUpload size={26} />
                  )}
                </div>
                {file ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-[var(--text)] break-all px-2">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                      {(file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                      <span className="text-[var(--trust-blue)]">
                        almashtirish uchun bosing
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-medium text-[var(--text)]">
                      Faylni shu yerga tashlang yoki bosing
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      MFO hisobot paketi (.xls / .xlsx)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* O'NG: Sozlamalar (ixcham) */}
            <div className="flex flex-col gap-4">
              {/* Firma (filial) */}
              <div>
                <Label>Firma (filial)</Label>
                {lockCompany ? (
                  <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)]/60 text-sm text-[var(--text)]">
                    <Building size={18} className="text-[var(--trust-blue)]" />
                    <span className="font-medium truncate">
                      {lockedCompany?.name ?? "Tanlangan firma"}
                    </span>
                    <Badge tone="info" className="ml-auto">
                      Tanlangan
                    </Badge>
                  </div>
                ) : (
                  <Select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Avtomatik (fayldan aniqlanadi)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {/* Sana */}
              <div>
                <Label>Hisobot sanasi</Label>
                <DatePicker
                  value={reportDate}
                  onChange={setReportDate}
                  placeholder="Sana tanlang"
                />
              </div>

              {/* Belgi */}
              <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:bg-[var(--surface-2)]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={isConsolidated}
                  onChange={(e) => setIsConsolidated(e.target.checked)}
                  className="accent-[var(--trust-blue)] w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--text)]">
                    Umumiy (konsolidatsiya)
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)] leading-snug">
                    Barcha filiallar birlashtirilgan yagona hisobot. Belgilanmasa
                    — alohida filial (filial) hisoboti deb saqlanadi.
                  </span>
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-[10px] bg-[var(--loss)]/10 text-[var(--loss)] px-3 py-2 text-[13px]">
                  <InfoCircle size={16} /> {error}
                </div>
              )}

              <Button
                type="submit"
                variant="gold"
                size="lg"
                className="w-full mt-auto"
                disabled={loading || !file}
              >
                {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
                {!loading && <DocumentUpload size={18} />}
              </Button>
            </div>
          </div>
        </Wrapper>
      </form>

      {/* Almashtirishni tasdiqlash modali (bu sana uchun hisobot bor) */}
      <Modal
        open={!!conflict}
        onClose={() => setConflict(null)}
        title="Eski hisobotni almashtirish"
        width="max-w-lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConflict(null)}
              disabled={loading}
            >
              <CloseCircle size={18} /> Bekor qilish
            </Button>
            <Button variant="danger" onClick={onReplaceConfirm} disabled={loading}>
              <Trash size={18} />
              {loading ? "Almashtirilmoqda..." : "O'chirib, almashtirish"}
            </Button>
          </>
        }
      >
        {conflict && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[10px] bg-[var(--warning)]/10 border border-[var(--warning)]/25 p-3">
              <Warning2
                size={20}
                variant="Bold"
                className="text-[var(--warning)] shrink-0 mt-0.5"
              />
              <p className="text-[13px] text-[var(--text)] leading-relaxed">
                <span className="font-semibold">{conflict.company}</span> uchun{" "}
                <span className="font-semibold tnum">
                  {new Date(conflict.reportDate).toLocaleDateString("ru-RU")}
                </span>{" "}
                sanasida allaqachon hisobot mavjud. Davom etsangiz,{" "}
                <span className="font-semibold">eski hisobot butunlay o&apos;chiriladi</span>{" "}
                va yangisi bilan almashtiriladi. Bu amal audit jurnaliga yoziladi.
              </p>
            </div>

            <div className="rounded-[10px] border border-[var(--border)] divide-y divide-[var(--border)]">
              <div className="flex items-center gap-2.5 p-3">
                <span className="grid place-items-center h-8 w-8 rounded-[8px] bg-[var(--loss)]/10 text-[var(--loss)] shrink-0">
                  <DocumentText size={16} variant="Bold" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    O&apos;chiriladi (eski)
                  </p>
                  <p className="text-[13px] font-medium text-[var(--text)] truncate" title={conflict.fileName}>
                    {conflict.fileName}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {conflict.status === "CONFIRMED" ? "Tasdiqlangan" : "Kutilmoqda"}
                    {conflict.fileSize
                      ? ` · ${(conflict.fileSize / 1024 / 1024).toFixed(1)} MB`
                      : ""}
                    {" · "}
                    {new Date(conflict.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3">
                <span className="grid place-items-center h-8 w-8 rounded-[8px] bg-[var(--profit)]/10 text-[var(--profit)] shrink-0">
                  <DocumentUpload size={16} variant="Bold" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Yangi (yuklanadi)
                  </p>
                  <p className="text-[13px] font-medium text-[var(--text)] truncate" title={file?.name}>
                    {file?.name}
                  </p>
                  {file && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

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

            {/* Konsolidatsiya turi — saqlashdan oldin so'raladi */}
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)]/40 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="grid place-items-center h-8 w-8 rounded-[9px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] shrink-0">
                  <InfoCircle size={17} variant="Bold" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text)]">
                    Hisobot turi
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                    <b>Umumiy (konsolidatsiya)</b> — barcha filiallar
                    birlashtirilgan yagona hisobot. <b>Alohida filial</b> — bitta
                    filialning hisoboti.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsConsolidated(false)}
                  className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border text-[13px] font-medium transition-all ${
                    !isConsolidated
                      ? "border-[var(--trust-blue)] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] ring-2 ring-[var(--ring)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {!isConsolidated && <TickCircle size={16} variant="Bold" />}
                  Alohida filial
                </button>
                <button
                  type="button"
                  onClick={() => setIsConsolidated(true)}
                  className={`flex items-center justify-center gap-2 h-10 rounded-[10px] border text-[13px] font-medium transition-all ${
                    isConsolidated
                      ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] ring-2 ring-[var(--gold)]/20"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {isConsolidated && <TickCircle size={16} variant="Bold" />}
                  Umumiy (konsolidatsiya)
                </button>
              </div>
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
