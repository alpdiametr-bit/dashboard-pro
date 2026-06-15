"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MessageText1, Send2 } from "iconsax-reactjs";

type Note = {
  id: number;
  text: string;
  createdAt: string;
  admin: { name: string | null; login: string } | null;
};

export function NotesPanel({ reportId }: { reportId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(
      `/api/notes?reportId=${reportId}&entityType=report&entityId=${reportId}`,
    );
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId,
        entityType: "report",
        entityId: String(reportId),
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
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <MessageText1 size={18} /> Izohlar
          </span>
        </CardTitle>
        <span className="text-[12px] text-[var(--text-muted)]">
          {notes.length} ta
        </span>
      </CardHeader>
      <CardBody className="space-y-4">
        <form onSubmit={add} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bu hisobotga izoh qo'shing..."
            className="h-10 flex-1 px-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:ring-3 focus:ring-[var(--trust-blue)]/30"
          />
          <Button type="submit" variant="primary" disabled={loading || !text.trim()}>
            <Send2 size={16} /> Qo&apos;shish
          </Button>
        </form>

        {notes.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)] text-center py-4">
            Hozircha izoh yo&apos;q
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-[10px] bg-[var(--surface-2)] px-3 py-2.5"
              >
                <p className="text-[13px] text-[var(--text)]">{n.text}</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {n.admin?.name ?? n.admin?.login ?? "Admin"} ·{" "}
                  {new Date(n.createdAt).toLocaleString("ru-RU")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
