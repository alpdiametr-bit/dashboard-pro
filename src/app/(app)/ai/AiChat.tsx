"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { Pager } from "@/components/ui/Pager";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { GenericChart } from "@/components/charts/Charts";
import {
  Send2,
  Magicpen,
  Trash,
  Profile,
  Warning2,
  Flash,
  DocumentDownload,
  DocumentText1,
  TrendUp,
  Buildings2,
  Chart21,
  CloseCircle,
  TickCircle,
  Danger,
  Calendar,
  Clock,
} from "iconsax-reactjs";
import { LogoMark } from "@/components/Logo";

// ── Tiplar ──
type Column = { key: string; label: string; type: string };
type ResultPayload = {
  model: string;
  operation: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  total: number;
  numericFields: string[];
};
type ChartSpec = { type: string; xField: string; yField: string; title?: string };
type DangerPayload = {
  reason?: string;
  where?: Record<string, unknown>;
  preview?: {
    id: number;
    date: string;
    fileName: string;
    status: string;
    company: string;
  }[];
  count?: number;
  error?: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  result?: ResultPayload;
  chart?: ChartSpec;
  querySpec?: unknown;
  canExport?: boolean;
  danger?: DangerPayload;
  queryError?: string;
};

type ConversationMeta = {
  uid: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

const SUGGESTIONS: { icon: typeof Chart21; text: string; prompt: string }[] = [
  {
    icon: DocumentText1,
    text: "Firmalar ro'yxati",
    prompt: "Barcha firmalarni ro'yxat qilib ber.",
  },
  {
    icon: TrendUp,
    text: "Aktivlar dinamikasi",
    prompt:
      "Birinchi firmaning barcha sanalardagi jami aktivini (balanceLine kod 120) chiziqli diagramma bilan ko'rsat.",
  },
  {
    icon: Buildings2,
    text: "Sana bo'yicha hisobotlar",
    prompt: "Oxirgi mavjud sanadagi barcha hisobotlarni ro'yxat qilib ber.",
  },
  {
    icon: Chart21,
    text: "Eng katta kreditlar",
    prompt:
      "Oxirgi hisobotdagi eng katta qoldiqli 20 ta kreditni qarzdor nomi bilan ko'rsat.",
  },
];

/** Model/manba nomlari — o'zbekcha chiroyli nom (UI uchun) */
const MODEL_LABELS: Record<string, string> = {
  company: "Firmalar",
  report: "Hisobotlar",
  balanceLine: "Balans",
  incomeLine: "Moliyaviy natijalar",
  loanItem: "Kredit portfeli",
  ledgerAccount: "Konsolidatsiya (oborotka)",
  borrowedFund: "Jalb etilgan mablag'lar",
  norm: "Normativlar",
};

function modelLabel(model: string): string {
  return MODEL_LABELS[model] ?? model;
}

function renderRich(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const bullet = /^\s*[-•*]\s+/.test(line);
    const clean = line.replace(/^\s*[-•*]\s+/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    if (bullet)
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--trust-blue)]" />
          <span>{parts}</span>
        </div>
      );
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    return <div key={i}>{parts}</div>;
  });
}

export function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [convList, setConvList] = useState<ConversationMeta[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Suhbat identifikatori (DB ga saqlash uchun) — birinchi yuborishda yaratiladi
  const convUidRef = useRef<string | null>(null);

  // Textarea balandligini matnga moslab o'stirish (auto-grow)
  const autoGrow = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  const resetGrow = useCallback(() => {
    const el = taRef.current;
    if (el) el.style.height = "auto";
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      setError(null);
      setBusy(true);

      const history: Msg[] = [
        ...messages,
        { role: "user", content },
      ];
      setMessages([...history, { role: "assistant", content: "", pending: true }]);
      setInput("");
      resetGrow();
      scrollToBottom();

      // Suhbat id sini lazy yaratamiz (render paytida emas — purity qoidasi)
      if (!convUidRef.current) {
        convUidRef.current = `c_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 10)}`;
        setActiveUid(convUidRef.current);
      }

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationUid: convUidRef.current,
            messages: history
              .filter((m) => m.content)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "AI bilan bog'lanishda xatolik");

        const assistant: Msg = {
          role: "assistant",
          content: data.reply || (data.queryError ? "" : "Tayyor."),
          result: data.result,
          chart: data.chart,
          querySpec: data.querySpec,
          canExport: !!data.export,
          danger: data.danger,
          queryError: data.queryError,
        };
        setMessages([...history, assistant]);
      } catch (e) {
        setMessages(history);
        setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
      } finally {
        setBusy(false);
        scrollToBottom();
      }
    },
    [messages, busy, scrollToBottom, resetGrow],
  );

  function clearChat() {
    setMessages([]);
    setError(null);
    setInput("");
    resetGrow();
    // yangi suhbat — keyingi yuborishda yangi DB yozuvi yaratiladi
    convUidRef.current = null;
    setActiveUid(null);
  }

  // Saqlangan suhbatlar ro'yxatini yuklash
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/ai/conversations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setConvList(data.conversations ?? []);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next) void loadHistory();
  }

  // Suhbatni ochish (DB dan xabarlarni qayta yuklash)
  const openConversation = useCallback(async (uid: string) => {
    setBusy(true);
    setHistoryOpen(false);
    try {
      const res = await fetch(`/api/ai/conversations/${uid}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Suhbatni yuklab bo'lmadi");
      const restored: Msg[] = (data.messages ?? []).map(
        (m: {
          role: "user" | "assistant";
          content: string;
          result?: ResultPayload;
          chart?: ChartSpec;
          querySpec?: unknown;
        }) => ({
          role: m.role,
          content: m.content,
          result: m.result ?? undefined,
          chart: m.chart ?? undefined,
          querySpec: m.querySpec ?? undefined,
          canExport: !!m.querySpec,
        }),
      );
      setMessages(restored);
      convUidRef.current = uid;
      setActiveUid(uid);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }, [scrollToBottom]);

  // Suhbatni o'chirish (ro'yxatdan)
  const deleteConversation = useCallback(
    async (uid: string) => {
      await fetch(`/api/ai/conversations/${uid}`, { method: "DELETE" });
      setConvList((prev) => prev.filter((c) => c.uid !== uid));
      if (convUidRef.current === uid) clearChat();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  // O'chirishni tasdiqlash
  const confirmDelete = useCallback(
    async (where: Record<string, unknown>, msgIndex: number) => {
      setBusy(true);
      try {
        const res = await fetch("/api/ai/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ where, confirm: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "O'chirishda xatolik");
        setMessages((prev) => {
          const next = [...prev];
          const m = next[msgIndex];
          if (m)
            next[msgIndex] = {
              ...m,
              danger: undefined,
              content: `✓ ${data.deleted} ta hisobot o'chirildi.`,
            };
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "O'chirishda xatolik");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  function cancelDelete(msgIndex: number) {
    setMessages((prev) => {
      const next = [...prev];
      const m = next[msgIndex];
      if (m)
        next[msgIndex] = {
          ...m,
          danger: undefined,
          content: m.content || "O'chirish bekor qilindi.",
        };
      return next;
    });
  }

  return (
    <div className="relative flex h-[calc(100vh-7.5rem)] w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5 sm:px-5">
        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-blue)]">
          <Magicpen size={18} variant="Bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[var(--text)]">
            AI Moliyaviy yordamchi
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--profit)]" />
            {"Bazadan so'rov \u2014 AI ga data berilmaydi"}
          </div>
        </div>
        {/* Tarix */}
        <button
          onClick={toggleHistory}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[9px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
            historyOpen
              ? "border-[var(--trust-blue)] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)]"
              : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]",
          )}
        >
          <Clock size={14} variant="Bold" />
          Tarix
        </button>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--loss)]/40 hover:text-[var(--loss)] disabled:opacity-50"
          >
            <Trash size={14} />
            Tozalash
          </button>
        )}
      </div>

      {/* Tarix paneli (overlay) */}
      {historyOpen && (
        <HistoryPanel
          conversations={convList}
          loading={loadingHistory}
          activeUid={activeUid}
          onOpen={openConversation}
          onDelete={deleteConversation}
          onClose={() => setHistoryOpen(false)}
          onNew={() => {
            clearChat();
            setHistoryOpen(false);
          }}
        />
      )}

      {/* Xabarlar */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 lg:px-8"
      >
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {messages.length === 0 && <EmptyState />}
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              msg={m}
              index={i}
              onConfirmDelete={confirmDelete}
              onCancelDelete={cancelDelete}
              busy={busy}
            />
          ))}
          {error && (
            <div className="mx-auto flex max-w-md items-start gap-2.5 rounded-[12px] border border-[var(--loss)]/25 bg-[var(--loss)]/8 px-4 py-3 text-[13px] text-[var(--loss)]">
              <Warning2 size={18} variant="Bold" className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tavsiyalar */}
      {messages.length === 0 && (
        <div className="border-t border-[var(--border)] px-3 py-3 sm:px-5 lg:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.text}
                  onClick={() => void send(s.prompt)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--trust-blue)]/40 hover:text-[var(--trust-blue)] disabled:opacity-50"
                >
                  <Icon size={14} variant="Bold" />
                  {s.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Kiritish */}
      <div className="border-t border-[var(--border)] p-3 sm:px-5 sm:py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 shadow-[var(--shadow-xs)] transition-all focus-within:border-[var(--trust-blue)]/50 focus-within:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[var(--ring)]">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="So'rang… (masalan: 08.06 sanadagi hisobotlarni Excelda ber)"
            className="block max-h-40 min-h-[40px] flex-1 resize-none self-center bg-transparent px-2 py-2 text-[14px] leading-[1.5] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            onClick={() => void send(input)}
            disabled={busy || !input.trim()}
            className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-b from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-blue)] disabled:opacity-40"
            aria-label="Yuborish"
          >
            {busy ? (
              <Flash size={16} variant="Bold" className="animate-pulse" />
            ) : (
              <Send2 size={16} variant="Bold" />
            )}
          </button>
        </div>
        <p className="mx-auto mt-1.5 w-full max-w-3xl px-1 text-center text-[11px] text-[var(--text-muted)]">
          {
            "AI faqat baza so'rovini rejalashtiradi \u2014 sonlar bazadan keladi. Muhim qarorlar uchun hisobotni tekshiring."
          }
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-gradient-to-br from-[var(--navy)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-blue)]">
        <Magicpen size={30} variant="Bold" />
      </span>
      <h2 className="text-[18px] font-semibold text-[var(--text)]">
        Moliyaviy ma&apos;lumotlaringiz bo&apos;yicha so&apos;rang
      </h2>
      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
        Firmalar, hisobotlar, kreditlar yoki sanalar bo&apos;yicha so&apos;rang.
        AI bazadan ma&apos;lumotni olib keladi, jadval va diagramma sifatida
        ko&apos;rsatadi, Excelda chiqaradi. O&apos;chirish faqat sizning
        ruxsatingiz bilan bajariladi.
      </p>
    </div>
  );
}

function HistoryPanel({
  conversations,
  loading,
  activeUid,
  onOpen,
  onDelete,
  onClose,
  onNew,
}: {
  conversations: ConversationMeta[];
  loading: boolean;
  activeUid: string | null;
  onOpen: (uid: string) => void;
  onDelete: (uid: string) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <>
      {/* fon */}
      <div
        className="absolute inset-0 z-20 bg-black/20"
        onClick={onClose}
      />
      {/* panel — chapdan */}
      <div className="absolute left-0 top-0 z-30 flex h-full w-[300px] max-w-[85%] flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] animate-rise">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock size={16} variant="Bold" className="text-[var(--trust-blue)]" />
            <span className="text-[14px] font-semibold text-[var(--text)]">
              Suhbatlar tarixi
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Yopish"
          >
            <CloseCircle size={18} />
          </button>
        </div>

        <button
          onClick={onNew}
          className="mx-3 mt-3 inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--border-strong,#cbd5e1)] py-2 text-[13px] font-medium text-[var(--trust-blue)] transition-colors hover:bg-[var(--trust-blue)]/5"
        >
          <Magicpen size={14} variant="Bold" />
          Yangi suhbat
        </button>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[var(--text-muted)]">
              <Flash size={15} className="animate-pulse" /> Yuklanmoqda…
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">
              Hozircha saqlangan suhbat yo&apos;q.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.uid}
                className={cn(
                  "group flex items-center gap-2 rounded-[10px] px-3 py-2 transition-colors",
                  activeUid === c.uid
                    ? "bg-[var(--trust-blue)]/10 ring-1 ring-inset ring-[var(--trust-blue)]/30"
                    : "hover:bg-[var(--surface-2)]",
                )}
              >
                <button
                  onClick={() => onOpen(c.uid)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[13px] font-medium text-[var(--text)]">
                    {c.title || "Nomsiz suhbat"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span>{fmtHistoryDate(c.updatedAt)}</span>
                    <span>·</span>
                    <span>{c.messageCount} xabar</span>
                  </div>
                </button>
                <button
                  onClick={() => onDelete(c.uid)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--loss)]/10 hover:text-[var(--loss)] group-hover:opacity-100"
                  aria-label="O'chirish"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function fmtHistoryDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return `Bugun ${time}`;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${time}`;
}

function MessageBubble({
  msg,
  index,
  onConfirmDelete,
  onCancelDelete,
  busy,
}: {
  msg: Msg;
  index: number;
  onConfirmDelete: (where: Record<string, unknown>, i: number) => void;
  onCancelDelete: (i: number) => void;
  busy: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[10px]",
          isUser
            ? "bg-[var(--surface-2)] text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]"
            : "bg-gradient-to-br from-[var(--navy)] to-[var(--trust-blue)] text-white",
        )}
      >
        {isUser ? <Profile size={16} variant="Bold" /> : <LogoMark size={18} />}
      </span>

      <div
        className={cn(
          "flex min-w-0 flex-col gap-3",
          isUser ? "max-w-[82%] items-end" : "flex-1 items-stretch",
        )}
      >
        {/* Matn */}
        {(msg.content || msg.pending) && (
          <div
            className={cn(
              "max-w-full rounded-[14px] px-4 py-2.5 text-[14px] leading-relaxed",
              isUser
                ? "self-end bg-[var(--trust-blue)] text-white"
                : "self-start bg-[var(--surface-2)] text-[var(--text)] ring-1 ring-inset ring-[var(--border)]",
            )}
          >
            {msg.pending && msg.content === "" ? (
              <span className="inline-flex items-center gap-1 py-1">
                <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
              </span>
            ) : isUser ? (
              msg.content
            ) : (
              <div className="space-y-0.5">{renderRich(msg.content)}</div>
            )}
          </div>
        )}

        {/* So'rov xatosi */}
        {msg.queryError && (
          <div className="flex items-start gap-2 rounded-[12px] border border-[var(--gold)]/30 bg-[var(--gold)]/8 px-3.5 py-2.5 text-[13px] text-[var(--gold)]">
            <Warning2 size={16} variant="Bold" className="mt-px shrink-0" />
            <span>{msg.queryError}</span>
          </div>
        )}

        {/* Natija (jadval + diagramma + eksport) */}
        {msg.result && (
          <ResultBlock
            result={msg.result}
            chart={msg.chart}
            canExport={msg.canExport}
            querySpec={msg.querySpec}
          />
        )}

        {/* O'chirish tasdig'i */}
        {msg.danger && (
          <DeleteConfirm
            danger={msg.danger}
            busy={busy}
            onConfirm={() =>
              msg.danger?.where && onConfirmDelete(msg.danger.where, index)
            }
            onCancel={() => onCancelDelete(index)}
          />
        )}
      </div>
    </div>
  );
}

// ── Natija bloki: KPI + jadval (pagination) + diagramma + eksport ──
const PAGE_SIZE = 8;

function ResultBlock({
  result,
  chart,
  canExport,
  querySpec,
}: {
  result: ResultPayload;
  chart?: ChartSpec;
  canExport?: boolean;
  querySpec?: unknown;
}) {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<"table" | "chart">(chart ? "chart" : "table");

  const rows = result.rows;
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  async function doExport() {
    if (!querySpec) return;
    setExporting(true);
    try {
      const res = await fetch("/api/ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: querySpec, title: `AI-${result.model}` }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AI-${result.model}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/50 px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
          <Chart21 size={15} variant="Bold" className="text-[var(--trust-blue)]" />
          <span className="font-medium text-[var(--text)]">
            {result.total.toLocaleString("ru-RU")}
          </span>
          natija · {modelLabel(result.model)}
        </div>
        <div className="flex items-center gap-1.5">
          {chart && (
            <div className="flex rounded-[9px] border border-[var(--border)] bg-[var(--surface)] p-0.5">
              <SegBtn
                active={view === "chart"}
                onClick={() => setView("chart")}
                label="Diagramma"
              />
              <SegBtn
                active={view === "table"}
                onClick={() => setView("table")}
                label="Jadval"
              />
            </div>
          )}
          {canExport && querySpec ? (
            <button
              onClick={doExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-[9px] bg-gradient-to-b from-[var(--gold-soft)] to-[var(--gold)] px-3 py-1.5 text-[12px] font-medium text-white shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-gold)] disabled:opacity-50"
            >
              <DocumentDownload size={14} variant="Bold" />
              {exporting ? "..." : "Excel"}
            </button>
          ) : querySpec ? (
            <button
              onClick={doExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
            >
              <DocumentDownload size={14} />
              {exporting ? "..." : "Excel"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Diagramma */}
      {chart && view === "chart" && (
        <div className="p-4">
          {chart.title && (
            <p className="mb-2 text-[13px] font-medium text-[var(--text)]">
              {chart.title}
            </p>
          )}
          <GenericChart
            type={(["bar", "line", "area", "pie"].includes(chart.type)
              ? chart.type
              : "bar") as "bar" | "line" | "area" | "pie"}
            data={rows}
            xField={chart.xField}
            yField={chart.yField}
          />
        </div>
      )}

      {/* Jadval */}
      {(!chart || view === "table") && (
        <>
          <Table>
            <Thead>
              <tr>
                {result.columns.map((c) => (
                  <Th
                    key={c.key}
                    align={
                      c.type === "decimal" || c.type === "int" ? "right" : "left"
                    }
                  >
                    {c.label}
                  </Th>
                ))}
              </tr>
            </Thead>
            <tbody>
              {pageRows.map((r, i) => (
                <Tr key={i}>
                  {result.columns.map((c) => (
                    <Td
                      key={c.key}
                      align={
                        c.type === "decimal" || c.type === "int"
                          ? "right"
                          : "left"
                      }
                      mono={c.type === "decimal" || c.type === "int"}
                    >
                      {formatCell(r[c.key], c.type)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
          {rows.length > PAGE_SIZE && (
            <div className="border-t border-[var(--border)] px-3">
              <Pager
                page={page}
                total={rows.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-[var(--trust-blue)] text-white"
          : "text-[var(--text-muted)] hover:text-[var(--text)]",
      )}
    >
      {label}
    </button>
  );
}

function DeleteConfirm({
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  danger: DangerPayload;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (danger.error)
    return (
      <div className="rounded-[12px] border border-[var(--loss)]/25 bg-[var(--loss)]/8 px-4 py-3 text-[13px] text-[var(--loss)]">
        {danger.error}
      </div>
    );
  const items = danger.preview ?? [];
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--loss)]/30 bg-[var(--loss)]/[0.04]">
      <div className="flex items-center gap-2 border-b border-[var(--loss)]/20 px-4 py-3">
        <Danger size={18} variant="Bold" className="text-[var(--loss)]" />
        <span className="text-[13.5px] font-semibold text-[var(--loss)]">
          O&apos;chirishni tasdiqlang
        </span>
        <span className="ml-auto rounded-full bg-[var(--loss)]/15 px-2 py-0.5 text-[12px] font-semibold text-[var(--loss)]">
          {danger.count ?? items.length} ta
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="mb-2.5 text-[13px] text-[var(--text-muted)]">
          {danger.reason}. Bu amalni qaytarib bo&apos;lmaydi.
        </p>
        {items.length > 0 && (
          <div className="max-h-44 space-y-1 overflow-y-auto">
            {items.slice(0, 50).map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--surface)] px-3 py-1.5 text-[12.5px]"
              >
                <span className="truncate font-medium text-[var(--text)]">
                  {it.company}
                </span>
                <span className="shrink-0 text-[var(--text-muted)]">
                  {it.date.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={onConfirm}
            disabled={busy || items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-b from-[var(--loss-bright,#ef4444)] to-[var(--loss)] px-4 py-2 text-[13px] font-medium text-white shadow-[var(--shadow-sm)] transition-all hover:-translate-y-px disabled:opacity-50"
          >
            <Trash size={15} variant="Bold" />
            Ha, o&apos;chir
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <CloseCircle size={15} />
            Bekor
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCell(v: unknown, type: string): React.ReactNode {
  if (v === null || v === undefined || v === "")
    return <span className="text-[var(--text-muted)]">—</span>;
  if (type === "decimal") return formatMoney(Number(v));
  if (type === "int") return Number(v).toLocaleString("ru-RU");
  if (type === "date") {
    const s = String(v);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const pretty = `${m[3]}.${m[2]}.${m[1]}`;
      return (
        <span className="inline-flex items-center gap-1 rounded-[7px] bg-[var(--surface-2)] px-1.5 py-0.5 text-[12.5px] font-medium text-[var(--text)] ring-1 ring-inset ring-[var(--border)]">
          <Calendar size={12} variant="Bold" className="text-[var(--trust-blue)]" />
          {pretty}
        </span>
      );
    }
    return s;
  }
  if (type === "bool")
    return v ? (
      <TickCircle size={16} variant="Bold" className="inline text-[var(--profit)]" />
    ) : (
      <span className="text-[var(--text-muted)]">—</span>
    );
  return String(v);
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]"
      style={{ animationDelay: `${d}s` }}
    />
  );
}
