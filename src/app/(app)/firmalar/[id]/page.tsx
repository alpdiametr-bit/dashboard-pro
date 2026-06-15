import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { num, balanceValue } from "@/lib/queries";
import { formatMoney, formatDate, formatDecimal } from "@/lib/format";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/components/ui/KpiCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { FirmTabs } from "./FirmTabs";
import { ReportSelector } from "./ReportSelector";
import { SheetViewer } from "./SheetViewer";
import { NotesPanel } from "./NotesPanel";
import { LoanFilters } from "./LoanFilters";
import { Prisma } from "@prisma/client";
import {
  Building,
  Wallet3,
  Coin1,
  StatusUp,
  ReceiptText,
  DocumentDownload,
  Calendar,
} from "iconsax-reactjs";
import { LOAN_TYPE } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SP = {
  report?: string;
  tab?: string;
  q?: string;
  page?: string;
  size?: string;
  loanType?: string;
  overdue?: string;
};

export default async function FirmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const companyId = Number(id);
  if (!Number.isFinite(companyId)) notFound();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      reports: {
        orderBy: { reportDate: "desc" },
        select: { id: true, reportDate: true, status: true, isConsolidated: true },
      },
    },
  });
  if (!company) notFound();

  if (company.reports.length === 0) {
    return (
      <div className="space-y-5">
        <FirmHeader name={company.name} region={company.region} />
        <Card className="p-10 text-center text-[var(--text-muted)]">
          <Building size={32} className="mx-auto mb-3 opacity-50" />
          Bu firma uchun hisobot yuklanmagan.
          <div className="mt-4">
            <Link href="/yuklash">
              <Button variant="gold">Hisobot yuklash</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const selectedId = Number(sp.report) || company.reports[0].id;
  const tab = sp.tab || "umumiy";
  const base = `/firmalar/${companyId}`;

  const reportMeta = company.reports.find((r) => r.id === selectedId)!;

  return (
    <div className="space-y-5">
      <FirmHeader name={company.name} region={company.region} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[var(--text-muted)]" />
          <ReportSelector
            reports={company.reports.map((r) => ({
              id: r.id,
              status: r.status,
              label: formatDate(r.reportDate),
            }))}
            current={selectedId}
          />
          {reportMeta.status === "PENDING" && (
            <Badge tone="warning">Tasdiq kutilmoqda</Badge>
          )}
          {reportMeta.isConsolidated && <Badge tone="gold">Umumiy</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/api/reports/${selectedId}/export?type=all`}>
            <Button variant="secondary" size="sm">
              <DocumentDownload size={16} /> Excel (to&apos;liq)
            </Button>
          </Link>
        </div>
      </div>

      <FirmTabs base={base} active={tab} reportId={selectedId} />

      <TabContent companyId={companyId} reportId={selectedId} tab={tab} sp={sp} />
    </div>
  );
}

function FirmHeader({
  name,
  region,
}: {
  name: string;
  region: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid place-items-center h-12 w-12 rounded-[12px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)]">
        <Building size={24} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">{name}</h2>
        <p className="text-sm text-[var(--text-muted)]">{region ?? "—"}</p>
      </div>
    </div>
  );
}

// ─────────────────────── Tab content ───────────────────────

async function TabContent({
  companyId,
  reportId,
  tab,
  sp,
}: {
  companyId: number;
  reportId: number;
  tab: string;
  sp: SP;
}) {
  const page = Math.max(1, Number(sp.page) || 1);
  const size = Number(sp.size) || DEFAULT_PAGE_SIZE;
  const q = (sp.q || "").trim();

  // ───── Umumiy ─────
  if (tab === "umumiy") {
    const [balance, income, counts] = await Promise.all([
      prisma.balanceLine.findMany({
        where: { reportId },
        select: { code: true, value: true },
      }),
      prisma.incomeLine.findMany({
        where: { reportId },
        select: { code: true, value: true, label: true },
      }),
      prisma.report.findUnique({
        where: { id: reportId },
        select: {
          _count: {
            select: {
              loanItems: true,
              ledgerAccounts: true,
              borrowedFunds: true,
              sheets: true,
            },
          },
        },
      }),
    ]);

    const assets = balanceValue(balance, "120");
    const liabilities = balanceValue(balance, "280");
    const capital = balanceValue(balance, "360");
    const profit = income.find((i) => i.code === "1200")?.value ?? 0;
    const loanNet = balanceValue(balance, "52");

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Jami aktivlar" value={formatMoney(assets)} hint="ming so'm" tone="info" icon={<Wallet3 size={22} />} />
          <KpiCard label="Jami kapital" value={formatMoney(capital)} hint="ming so'm" tone="profit" icon={<Coin1 size={22} />} />
          <KpiCard label="Jami majburiyatlar" value={formatMoney(liabilities)} hint="ming so'm" icon={<ReceiptText size={22} />} />
          <KpiCard label="Sof foyda" value={formatMoney(num(profit))} hint="joriy yil" tone={num(profit) >= 0 ? "profit" : "loss"} trend={num(profit) >= 0 ? "up" : "down"} icon={<StatusUp size={22} />} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Kredit portfeli (sof)" value={formatMoney(loanNet)} />
          <MiniStat label="Kreditlar soni" value={counts?._count.loanItems.toLocaleString("ru-RU") ?? "0"} />
          <MiniStat label="Hisobvaraqlar" value={counts?._count.ledgerAccounts.toLocaleString("ru-RU") ?? "0"} />
          <MiniStat label="Saqlangan varaqlar" value={String(counts?._count.sheets ?? 0)} />
        </div>

        <NotesPanel reportId={reportId} />
      </div>
    );
  }

  // ───── Balans ─────
  if (tab === "balans") {
    const lines = await prisma.balanceLine.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balans hisoboti</CardTitle>
          <Link href={`/api/reports/${reportId}/export?type=balance`}>
            <Button variant="secondary" size="sm">
              <DocumentDownload size={16} /> Eksport
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Kod</Th>
                <Th>Ko&apos;rsatkich</Th>
                <Th align="right">Qiymat (ming so&apos;m)</Th>
              </Tr>
            </Thead>
            <tbody>
              {lines.map((l) => {
                const isTotal = ["120", "280", "360", "370"].includes(l.code ?? "");
                return (
                  <Tr key={l.id} className={isTotal ? "bg-[var(--surface-2)]/40 font-semibold" : ""}>
                    <Td mono className="text-[var(--text-muted)]">{l.code ?? ""}</Td>
                    <Td>{l.label}</Td>
                    <Td align="right" mono>{formatMoney(num(l.value))}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  // ───── Foyda-zarar ─────
  if (tab === "foyda") {
    const lines = await prisma.incomeLine.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moliyaviy natijalar (foyda-zarar)</CardTitle>
          <Link href={`/api/reports/${reportId}/export?type=income`}>
            <Button variant="secondary" size="sm">
              <DocumentDownload size={16} /> Eksport
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Kod</Th>
                <Th>Ko&apos;rsatkich</Th>
                <Th align="right">Qiymat (ming so&apos;m)</Th>
              </Tr>
            </Thead>
            <tbody>
              {lines.map((l) => {
                const isTotal = ["1200", "900", "600", "180", "270"].includes(l.code ?? "");
                return (
                  <Tr key={l.id} className={isTotal ? "bg-[var(--surface-2)]/40 font-semibold" : ""}>
                    <Td mono className="text-[var(--text-muted)]">{l.code ?? ""}</Td>
                    <Td>{l.label}</Td>
                    <Td align="right" mono>{formatMoney(num(l.value))}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  // ───── Kredit portfeli ─────
  if (tab === "kredit") {
    const where: Prisma.LoanItemWhereInput = { reportId };
    if (q)
      where.OR = [
        { borrowerName: { contains: q } },
        { pinfl: { contains: q } },
      ];
    if (sp.loanType) where.loanType = Number(sp.loanType);
    if (sp.overdue === "1") where.overduePrincipal = { gt: 0 };

    const [total, loans, sums] = await Promise.all([
      prisma.loanItem.count({ where }),
      prisma.loanItem.findMany({
        where,
        orderBy: { rowNo: "asc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.loanItem.aggregate({
        where,
        _sum: { amount: true, balance: true, overduePrincipal: true },
      }),
    ]);

    return (
      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <CardTitle>Kredit portfeli</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <SearchInput placeholder="Qarzdor / JSHSHIR..." />
            </div>
            <LoanFilters />
            <Link href={`/api/reports/${reportId}/export?type=loans`}>
              <Button variant="secondary" size="sm">
                <DocumentDownload size={16} /> Eksport
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border)]">
            <SumCell label="Topildi" value={total.toLocaleString("ru-RU")} />
            <SumCell label="Summa" value={formatMoney(num(sums._sum.amount))} />
            <SumCell label="Qoldiq" value={formatMoney(num(sums._sum.balance))} />
            <SumCell label="Muddati o'tgan" value={formatMoney(num(sums._sum.overduePrincipal))} tone="loss" />
          </div>
          <Table>
            <Thead>
              <Tr>
                <Th>№</Th>
                <Th>Qarzdor</Th>
                <Th>JSHSHIR</Th>
                <Th>Tur</Th>
                <Th align="right">Summa</Th>
                <Th align="right">Qoldiq</Th>
                <Th align="right">Foiz</Th>
                <Th>Berilgan</Th>
                <Th>Qaytarish</Th>
                <Th align="right">Muddati o&apos;tgan</Th>
              </Tr>
            </Thead>
            <tbody>
              {loans.map((l) => (
                <Tr key={l.id}>
                  <Td mono className="text-[var(--text-muted)]">{l.rowNo}</Td>
                  <Td className="max-w-[220px] truncate" title={l.borrowerName}>{l.borrowerName}</Td>
                  <Td mono className="text-[var(--text-muted)]">{l.pinfl}</Td>
                  <Td>
                    <Badge tone="neutral">{LOAN_TYPE[l.loanType ?? 0] ?? "—"}</Badge>
                  </Td>
                  <Td align="right" mono>{formatMoney(num(l.amount))}</Td>
                  <Td align="right" mono>{formatMoney(num(l.balance))}</Td>
                  <Td align="right" mono>{l.rate ? formatDecimal(num(l.rate)) : "—"}</Td>
                  <Td className="text-[var(--text-muted)]">{formatDate(l.issuedAt)}</Td>
                  <Td className="text-[var(--text-muted)]">{formatDate(l.dueAt)}</Td>
                  <Td align="right" mono className={num(l.overduePrincipal) > 0 ? "text-[var(--loss)] font-medium" : ""}>
                    {formatMoney(num(l.overduePrincipal))}
                  </Td>
                </Tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-[var(--text-muted)]">
                    Natija topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <div className="px-4 border-t border-[var(--border)]">
            <Pagination total={total} page={page} pageSize={size} />
          </div>
        </CardBody>
      </Card>
    );
  }

  // ───── Schotlar / Konsolidatsiya ─────
  if (tab === "schotlar") {
    const where: Prisma.LedgerAccountWhereInput = { reportId };
    if (q)
      where.OR = [{ accountNo: { contains: q } }, { name: { contains: q } }];

    const [total, accounts] = await Promise.all([
      prisma.ledgerAccount.count({ where }),
      prisma.ledgerAccount.findMany({
        where,
        orderBy: { orderIdx: "asc" },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);

    return (
      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <CardTitle>Schotlar (konsolidatsiya)</CardTitle>
          <div className="flex items-center gap-2">
            <div className="w-56">
              <SearchInput placeholder="Hisobvaraq / nomi..." />
            </div>
            <Link href={`/api/reports/${reportId}/export?type=ledger`}>
              <Button variant="secondary" size="sm">
                <DocumentDownload size={16} /> Eksport
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Hisobvaraq</Th>
                <Th>Nomi</Th>
                <Th align="right">Bosh. Debet</Th>
                <Th align="right">Bosh. Kredit</Th>
                <Th align="right">Oborot D</Th>
                <Th align="right">Oborot K</Th>
                <Th align="right">Oxir. Debet</Th>
                <Th align="right">Oxir. Kredit</Th>
              </Tr>
            </Thead>
            <tbody>
              {accounts.map((a) => (
                <Tr key={a.id}>
                  <Td mono className="text-[var(--text-muted)]">{a.accountNo}</Td>
                  <Td className="max-w-[280px] truncate" title={a.name}>{a.name}</Td>
                  <Td align="right" mono>{formatMoney(num(a.openDebit))}</Td>
                  <Td align="right" mono>{formatMoney(num(a.openCredit))}</Td>
                  <Td align="right" mono>{formatMoney(num(a.turnoverDebit))}</Td>
                  <Td align="right" mono>{formatMoney(num(a.turnoverCredit))}</Td>
                  <Td align="right" mono>{formatMoney(num(a.closeDebit))}</Td>
                  <Td align="right" mono>{formatMoney(num(a.closeCredit))}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="px-4 border-t border-[var(--border)]">
            <Pagination total={total} page={page} pageSize={size} />
          </div>
        </CardBody>
      </Card>
    );
  }

  // ───── Jalb etilgan ─────
  if (tab === "jalb") {
    const funds = await prisma.borrowedFund.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jalb etilgan mablag&apos;lar</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Kreditor</Th>
                <Th align="right">Summa</Th>
                <Th align="right">Qoldiq</Th>
              </Tr>
            </Thead>
            <tbody>
              {funds.map((f) => (
                <Tr key={f.id}>
                  <Td>{f.creditorName}</Td>
                  <Td align="right" mono>{formatMoney(num(f.amount))}</Td>
                  <Td align="right" mono>{formatMoney(num(f.balance))}</Td>
                </Tr>
              ))}
              {funds.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-[var(--text-muted)]">Ma&apos;lumot yo&apos;q</td></tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  // ───── Normativlar ─────
  if (tab === "normativ") {
    const norms = await prisma.norm.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prudensial normativlar</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Kod</Th>
                <Th>Ko&apos;rsatkich</Th>
                <Th>Me&apos;yor</Th>
                <Th>Amalda</Th>
              </Tr>
            </Thead>
            <tbody>
              {norms.map((n) => (
                <Tr key={n.id}>
                  <Td mono className="text-[var(--text-muted)]">{n.code}</Td>
                  <Td className="max-w-[420px]">{n.indicator}</Td>
                  <Td>{n.norm ?? "—"}</Td>
                  <Td><Badge tone={n.actual ? "info" : "neutral"}>{n.actual ?? "—"}</Badge></Td>
                </Tr>
              ))}
              {norms.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">Ma&apos;lumot yo&apos;q</td></tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  // ───── Varaqlar (xom) ─────
  if (tab === "varaqlar") {
    const sheets = await prisma.reportSheet.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
      select: { id: true, name: true, rowCount: true, colCount: true },
    });
    return <SheetViewer reportId={reportId} sheets={sheets} />;
  }

  // ───── Yuklangan fayllar ─────
  if (tab === "fayllar") {
    const reports = await prisma.report.findMany({
      where: { companyId },
      orderBy: { reportDate: "desc" },
      include: { uploadedBy: { select: { name: true, login: true } } },
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yuklangan hisobotlar</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Sana</Th>
                <Th>Fayl</Th>
                <Th>Holat</Th>
                <Th>Yuklagan</Th>
                <Th align="right">Hajm</Th>
                <Th align="right">Amal</Th>
              </Tr>
            </Thead>
            <tbody>
              {reports.map((r) => (
                <Tr key={r.id}>
                  <Td mono>{formatDate(r.reportDate)}</Td>
                  <Td className="max-w-[220px] truncate" title={r.fileName}>{r.fileName}</Td>
                  <Td>
                    {r.status === "CONFIRMED" ? (
                      <Badge tone="profit">Tasdiqlangan</Badge>
                    ) : (
                      <Badge tone="warning">Kutilmoqda</Badge>
                    )}
                    {r.isConsolidated && <Badge tone="gold">Umumiy</Badge>}
                  </Td>
                  <Td className="text-[var(--text-muted)]">{r.uploadedBy?.name ?? r.uploadedBy?.login ?? "—"}</Td>
                  <Td align="right" mono className="text-[var(--text-muted)]">
                    {r.fileSize ? `${(r.fileSize / 1024 / 1024).toFixed(1)} MB` : "—"}
                  </Td>
                  <Td align="right">
                    <Link href={`/api/reports/${r.id}/export?type=all`} className="text-[var(--trust-blue)] hover:underline text-[13px]">
                      Yuklab olish
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  return null;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tnum text-[var(--text)]">{value}</p>
    </Card>
  );
}

function SumCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "loss";
}) {
  return (
    <div className="bg-[var(--surface)] p-3">
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tnum ${tone === "loss" ? "text-[var(--loss)]" : "text-[var(--text)]"}`}>
        {value}
      </p>
    </div>
  );
}
