import { cn } from "@/lib/cn";

type Tone = "neutral" | "profit" | "loss" | "warning" | "info" | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  profit: "bg-[var(--profit)]/12 text-[var(--profit)]",
  loss: "bg-[var(--loss)]/12 text-[var(--loss)]",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
  info: "bg-[var(--trust-blue)]/12 text-[var(--trust-blue)]",
  gold: "bg-[var(--gold)]/15 text-[var(--gold)]",
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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
