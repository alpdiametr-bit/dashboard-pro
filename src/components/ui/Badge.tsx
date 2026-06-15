import { cn } from "@/lib/cn";

type Tone = "neutral" | "profit" | "loss" | "warning" | "info" | "gold";

const tones: Record<Tone, string> = {
  neutral:
    "bg-[var(--surface-2)] text-[var(--text-muted)] ring-[var(--border)]",
  profit: "bg-[var(--profit)]/12 text-[var(--profit)] ring-[var(--profit)]/20",
  loss: "bg-[var(--loss)]/12 text-[var(--loss)] ring-[var(--loss)]/20",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)] ring-[var(--warning)]/25",
  info: "bg-[var(--trust-blue)]/12 text-[var(--trust-blue)] ring-[var(--trust-blue)]/20",
  gold: "bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
