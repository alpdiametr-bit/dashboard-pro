"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MessageText1, Send2, User } from "iconsax-reactjs";

type Note = {
  id: number;
  text: string;
  createdAt: string;
  admin: { name: string | null; login: string } | null;
};

function initials(name?: string | null, login?: string) {
  const src = (name || login || "A").trim();
  return src
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hozirgina";
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} kun oldin`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

/**
 * Universal izohlar paneli. entityType/entityId orqali firma, hisobot yoki
 * faylga bog'lanadi. reportId ixtiyoriy (firma izohida null).
 */
export function NotesPanel({
  entityType = "report",
  entityId,
  reportId,
  title = "Izohlar",
  placeholder = "Izoh qo'shing...",
  compact = false,
}: {
  entityType?: string;
  entityId: string | number;
  reportId?: number | null;
  title?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const eid = String(entityId);

  async function load() {
    const params = new URLSearchParams({ entityType, entityId: eid });
    if (reportId) params.set("reportId", String(reportId));
    const res = await fetch(`/api/notes?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, eid, reportId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: reportId ?? null,
        entityType,
        entityId: eid,
        text: text.trim(),
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setNotes((n) => [data.note, ...n]);
      setText("");
    }
  }

  return (
    <Card className={compact ? "" : "shadow-[var(--shadow-sm)]"}>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)]">
              <MessageText1 size={16} variant="Bold" />
            </span>
            {title}
          </span>
        </CardTitle>
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[12px] font-medium text-[var(--text-muted)] tnum">
          {notes.length}
        </span>
      </CardHeader>
      <CardBody className="space-y-4">
        <form onSubmit={add} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="h-10 flex-1 px-3.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] shadow-[var(--shadow-xs)] placeholder:text-[var(--text-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-[var(--trust-blue)] transition-all"
          />
          <Button type="submit" variant="primary" disabled={loading || !text.trim()}>
            <Send2 size={16} variant="Bold" />
            <span className="hidden sm:inline">Qo&apos;shish</span>
          </Button>
        </form>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--text-soft)]">
              <MessageText1 size={22} />
            </span>
            <p className="text-[13px] text-[var(--text-muted)]">
              Hozircha izoh yo&apos;q. Birinchi bo&apos;lib yozing.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white text-[11px] font-semibold ring-1 ring-white/15">
                  {n.admin ? initials(n.admin.name, n.admin.login) : <User size={14} />}
                </span>
                <div className="min-w-0 flex-1 rounded-[12px] rounded-tl-sm bg-[var(--surface-2)]/70 px-3.5 py-2.5 ring-1 ring-inset ring-[var(--border)]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-[var(--text)]">
                      {n.admin?.name ?? n.admin?.login ?? "Admin"}
                    </span>
                    <span className="text-[11px] text-[var(--text-soft)] shrink-0">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text)] break-words">
                    {n.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
