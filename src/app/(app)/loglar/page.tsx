import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/constants";
import {
  Clipboard,
  LoginCurve,
  CloseCircle,
  DocumentUpload,
} from "iconsax-reactjs";
import Link from "next/link";
import type { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<AuditAction, string> = {
  LOGIN_SUCCESS: "Kirish",
  LOGIN_FAILED: "Kirish (xato)",
  LOGOUT: "Chiqish",
  UPLOAD: "Yuklash",
  EXPORT: "Eksport",
  CONFIRM: "Tasdiqlash",
  DELETE: "O'chirish",
};

const ACTION_TONE: Record<
  AuditAction,
  "neutral" | "profit" | "loss" | "warning" | "info" | "gold"
> = {
  LOGIN_SUCCESS: "profit",
  LOGIN_FAILED: "loss",
  LOGOUT: "neutral",
  UPLOAD: "info",
  EXPORT: "gold",
  CONFIRM: "profit",
  DELETE: "loss",
};

const ACTIONS = Object.keys(ACTION_LABEL) as AuditAction[];

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export default async function LoglarPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = PAGE_SIZES.includes(Number(sp.size) as never)
    ? Number(sp.size)
    : DEFAULT_PAGE_SIZE;
  const actionFilter = ACTIONS.includes(sp.action as AuditAction)
    ? (sp.action as AuditAction)
    : null;

  const where = actionFilter ? { action: actionFilter } : {};

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, logs, todayCount, failedCount, uploadCount, exportCount] =
    await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.auditLog.count({ where: { action: "LOGIN_FAILED" } }),
      prisma.auditLog.count({ where: { action: "UPLOAD" } }),
      prisma.auditLog.count({ where: { action: "EXPORT" } }),
    ]);

  return (
    <div className="space-y-6">
      {/* KPI qatori */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Jami yozuvlar"
          value={total.toLocaleString("ru-RU")}
          hint="audit jurnali"
          tone="info"
          icon={<Clipboard size={22} />}
        />
        <KpiCard
          label="Bugun"
          value={todayCount.toLocaleString("ru-RU")}
          hint="so'nggi 24 soat"
          tone="info"
          icon={<LoginCurve size={22} />}
        />
        <KpiCard
          label="Xato kirishlar"
          value={failedCount.toLocaleString("ru-RU")}
          hint="muvaffaqiyatsiz urinish"
          tone={failedCount > 0 ? "loss" : "info"}
          icon={<CloseCircle size={22} />}
        />
        <KpiCard
          label="Yuklash / Eksport"
          value={`${uploadCount} / ${exportCount}`}
          hint="fayl operatsiyalari"
          tone="warning"
          icon={<DocumentUpload size={22} />}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clipboard size={18} className="text-[var(--text-muted)]" />
            <h2 className="font-semibold text-[var(--text)]">Audit jurnali</h2>
            <span className="text-[12px] text-[var(--text-muted)]">
              {"(o'chirib bo'lmaydi — faqat qo'shiladi)"}
            </span>
          </div>
          {/* Filtrlar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label="Hammasi" href="/loglar" active={!actionFilter} />
            {ACTIONS.map((a) => (
              <FilterChip
                key={a}
                label={ACTION_LABEL[a]}
                href={`/loglar?action=${a}`}
                active={actionFilter === a}
              />
            ))}
          </div>
        </div>

        <Table>
          <Thead>
            <Tr>
              <Th>Vaqt</Th>
              <Th>Amaliyot</Th>
              <Th>Foydalanuvchi</Th>
              <Th>Login</Th>
              <Th>Firma</Th>
              <Th>Izoh</Th>
              <Th>{"So'rov"}</Th>
              <Th>IP</Th>
            </Tr>
          </Thead>
          <tbody>
            {logs.length === 0 && (
              <Tr>
                <Td className="text-center text-[var(--text-muted)] py-8" colSpan={8}>
                  Yozuvlar topilmadi
                </Td>
              </Tr>
            )}
            {logs.map((log) => (
              <Tr key={log.id}>
                <Td mono className="whitespace-nowrap text-[var(--text-muted)]">
                  {fmtDateTime(log.createdAt)}
                </Td>
                <Td>
                  <Badge tone={ACTION_TONE[log.action]}>
                    {ACTION_LABEL[log.action]}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap">{log.adminName ?? "—"}</Td>
                <Td className="whitespace-nowrap">{log.login ?? "—"}</Td>
                <Td className="max-w-[180px] truncate" title={log.companyName ?? ""}>
                  {log.companyName ?? "—"}
                </Td>
                <Td className="max-w-[260px] truncate" title={log.message ?? ""}>
                  {log.message ?? "—"}
                </Td>
                <Td className="whitespace-nowrap text-[12px] text-[var(--text-muted)]">
                  {log.method ? `${log.method} ${log.path ?? ""}` : "—"}
                </Td>
                <Td mono className="text-[var(--text-muted)]">
                  {log.ip ?? "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>

        <Pagination total={total} page={page} pageSize={size} />
      </Card>
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "px-2.5 h-7 inline-flex items-center rounded-full text-[12px] font-medium transition-colors " +
        (active
          ? "bg-[var(--trust-blue)] text-white"
          : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]")
      }
    >
      {label}
    </Link>
  );
}
