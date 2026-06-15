import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { num, balanceValue } from "@/lib/queries";
import { companyAnalytics } from "@/lib/analytics";
import {
  formatMoney,
  formatDate,
  formatDecimal,
  weekday,
  formatDateLong,
  formatDateTime,
  timeAgo,
} from "@/lib/format";
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
import { PeriodFilter } from "./PeriodFilter";
import { FirmUpload } from "./FirmUpload";
import { DocumentsPanel } from "./DocumentsPanel";
import { ReportCalendar } from "./ReportCalendar";
import { DeleteCompanyButton } from "../DeleteCompanyButton";
import { EditCompanyButton } from "../EditCompanyButton";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { ReportDeleteButton } from "./ReportDeleteButton";
import { PinButton } from "@/components/PinButton";
import { StructureDonut, HBars, IncomeBars } from "@/components/charts/Charts";
import { Prisma } from "@prisma/client";
import {
  Building,
  Wallet3,
  Coin1,
  StatusUp,
  ReceiptText,
  DocumentDownload,
  DocumentText,
  Calendar,
  Star1,
  Clock,
  TickCircle,
  Eye,
  Location,
} from "iconsax-reactjs";
import { LOAN_TYPE, periodRange } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SP = {
  report?: string;
  tab?: string;
  q?: string;
  page?: string;
  size?: string;
  loanType?: string;
  overdue?: string;
  period?: string;
  month?: string;
  year?: string;
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
        orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, { reportDate: "desc" }],
        select: {
          id: true,
          reportDate: true,
          status: true,
          isConsolidated: true,
          isPinned: true,
        },
      },
    },
  });
  if (!company) notFound();

  if (company.reports.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <FirmHeader
            name={company.name}
            region={company.region}
            imageUrl={company.imageUrl}
            description={company.description}
          />
          <DeleteCompanyButton
            companyId={company.id}
            companyName={company.name}
            variant="labeled"
          />
          <EditCompanyButton
            company={{
              id: company.id,
              name: company.name,
              region: company.region,
              inn: company.inn,
              description: company.description,
              imageUrl: company.imageUrl,
            }}
          />
        </div>
        <Card className="p-6 text-center text-[var(--text-muted)]">
          <Building size={32} className="mx-auto mb-2 opacity-50" />
          <p>Bu firma uchun hali hisobot yuklanmagan.</p>
          <p className="text-[12px]">Quyidan birinchi hisobotni yuklang.</p>
        </Card>
        <FirmUpload companyId={company.id} companyName={company.name} />
      </div>
    );
  }

  // Tanlangan hisobot o'chirilgan bo'lsa (URL'da eski ?report= qolsa) —
  // birinchi mavjud hisobotga qaytamiz, 404/crash bo'lmasin.
  const selectedId =
    company.reports.find((r) => r.id === Number(sp.report))?.id ??
    company.reports[0].id;
  const tab = sp.tab || "umumiy";
  const base = `/firmalar/${companyId}`;

  const reportMeta = company.reports.find((r) => r.id === selectedId)!;

  return (
    <div className="space-y-5">
      <FirmHeader
        name={company.name}
        region={company.region}
        imageUrl={company.imageUrl}
        description={company.description}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-xs)]">
        <div className="flex flex-wrap items-center gap-2">
          <ReportSelector
            reports={company.reports.map((r) => ({
              id: r.id,
              status: r.status,
              date: formatDate(r.reportDate),
              weekday: weekday(r.reportDate),
              long: formatDateLong(r.reportDate),
              isPinned: r.isPinned,
              isConsolidated: r.isConsolidated,
            }))}
            current={selectedId}
          />
          {reportMeta.status === "PENDING" && (
            <Badge tone="warning">Tasdiq kutilmoqda</Badge>
          )}
          {reportMeta.isConsolidated && <Badge tone="gold">Umumiy</Badge>}
          {reportMeta.isPinned && (
            <Badge tone="gold">
              <Star1 size={12} variant="Bold" /> Qadalgan
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PinButton
            endpoint={`/api/reports/${selectedId}/pin`}
            pinned={reportMeta.isPinned}
            variant="labeled"
            size={16}
          />
          <Link href={`/api/reports/${selectedId}/export?type=all`}>
            <Button variant="secondary" size="sm">
              <DocumentDownload size={16} /> Excel (to&apos;liq)
            </Button>
          </Link>
          {/* Tahrirlash + o'chirish — yonma-yon ikonlar */}
          <div className="flex items-center gap-1 pl-1.5 ml-0.5 border-l border-[var(--border)]">
            <EditCompanyButton
              variant="icon"
              company={{
                id: company.id,
                name: company.name,
                region: company.region,
                inn: company.inn,
                description: company.description,
                imageUrl: company.imageUrl,
              }}
            />
            <DeleteCompanyButton
              variant="icon"
              companyId={company.id}
              companyName={company.name}
              reportCount={company.reports.length}
            />
          </div>
        </div>
      </div>

      <FirmTabs base={base} active={tab} reportId={selectedId} />

      <TabContent
        companyId={companyId}
        companyName={company.name}
        reportId={selectedId}
        tab={tab}
        sp={sp}
      />
    </div>
  );
}

function FirmHeader({
  name,
  region,
  imageUrl,
  description,
}: {
  name: string;
  region: string | null;
  imageUrl?: string | null;
  description?: string | null;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="grid place-items-center h-14 w-14 rounded-[16px] bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-blue)] ring-1 ring-white/15 overflow-hidden shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Building size={26} variant="Bold" />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="text-[22px] font-bold tracking-tight text-[var(--text)] leading-tight">
          {name}
        </h2>
        <div className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
          <Location size={14} variant="Bold" className="text-[var(--trust-blue)]" />
          {region ?? "—"}
        </div>
        {description && (
          <p className="text-[13px] text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────── Tab content ───────────────────────

async function TabContent({
  companyId,
  companyName,
  reportId,
  tab,
  sp,
}: {
  companyId: number;
  companyName: string;
  reportId: number;
  tab: string;
  sp: SP;
}) {
  const page = Math.max(1, Number(sp.page) || 1);
  const size = Number(sp.size) || DEFAULT_PAGE_SIZE;
  const q = (sp.q || "").trim();

  // ───── Yuklash (firma ichida) ─────
  if (tab === "yuklash") {
    return <FirmUpload companyId={companyId} companyName={companyName} />;
  }

  // ───── Analitika (chuqur — vaqt qatori, koeffitsientlar, o'zgarishlar) ─────
  if (tab === "analitika") {
    const analytics = await companyAnalytics(companyId);
    if (!analytics) return null;
    return <AnalyticsPanel data={analytics} />;
  }

  // ───── Kalendar (qaysi sanalarda hisobot bor / yo'q) ─────
  if (tab === "kalendar") {
    const reports = await prisma.report.findMany({
      where: { companyId },
      orderBy: { reportDate: "asc" },
      select: {
        id: true,
        reportDate: true,
        status: true,
        isPinned: true,
      },
    });

    const total = reports.length;
    const confirmed = reports.filter((r) => r.status === "CONFIRMED").length;
    const pending = total - confirmed;
    const first = reports[0]?.reportDate ?? null;
    const last = reports[total - 1]?.reportDate ?? null;

    // Qamrov: birinchi va oxirgi sana orasidagi kunlar bo'yicha foiz
    let coverage = 0;
    let gaps = 0;
    if (first && last) {
      const dayMs = 86400000;
      const spanDays =
        Math.round(
          (new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime() -
            new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime()) /
            dayMs,
        ) + 1;
      coverage = spanDays > 0 ? Math.round((total / spanDays) * 100) : 100;
      gaps = Math.max(0, spanDays - total);
    }

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Jami hisobot"
            value={String(total)}
            hint={`${confirmed} tasdiqlangan · ${pending} kutilmoqda`}
            tone="info"
            icon={<Calendar size={22} />}
          />
          <KpiCard
            label="Qamrov"
            value={`${coverage}%`}
            hint={first && last ? `${formatDate(first)} — ${formatDate(last)}` : "—"}
            tone={coverage >= 80 ? "profit" : coverage >= 40 ? "warning" : "loss"}
            icon={<StatusUp size={22} />}
          />
          <KpiCard
            label="Bo'sh kunlar"
            value={String(gaps)}
            hint="hisobot yuklanmagan"
            tone={gaps === 0 ? "profit" : "warning"}
            icon={<ReceiptText size={22} />}
          />
          <KpiCard
            label="Oxirgi hisobot"
            value={last ? formatDate(last) : "—"}
            hint={first ? `birinchi: ${formatDate(first)}` : "—"}
            tone="info"
            icon={<DocumentDownload size={22} />}
          />
        </div>

        {total === 0 ? (
          <Card className="p-6 text-center text-[var(--text-muted)]">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            Hali hisobot yuklanmagan.
          </Card>
        ) : (
          <ReportCalendar
            reports={reports.map((r) => ({
              id: r.id,
              date: r.reportDate.toISOString(),
              status: r.status,
              isPinned: r.isPinned,
            }))}
            base={`/firmalar/${companyId}`}
            selectedId={reportId}
          />
        )}
      </div>
    );
  }

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

    // Diagramma ma'lumotlari
    const structureData = [
      { name: "Kapital", value: capital },
      { name: "Majburiyatlar", value: liabilities },
    ];
    const incomeData = income.find((i) => i.code === "180")?.value ?? 0; // jami foizli daromad
    const incomeBarsData = [
      { name: "Foizli daromad", value: num(income.find((i) => i.code === "180")?.value ?? 0) },
      { name: "Foizli harajat", value: num(income.find((i) => i.code === "270")?.value ?? 0) },
      { name: "Operatsion harajat", value: num(income.find((i) => i.code === "780")?.value ?? 0) },
      { name: "Sof foyda", value: num(profit) },
    ].filter((d) => d.value !== 0);

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

        {/* Diagrammalar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Kapital tuzilishi</CardTitle>
            </CardHeader>
            <CardBody>
              <StructureDonut data={structureData} />
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Moliyaviy natijalar</CardTitle>
              <Badge tone="info">daromad / harajat / foyda</Badge>
            </CardHeader>
            <CardBody>
              {incomeData ? (
                <IncomeBars data={incomeBarsData} />
              ) : (
                <p className="h-[300px] grid place-items-center text-sm text-[var(--text-muted)]">
                  Moliyaviy natija ma&apos;lumoti yo&apos;q
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <NotesPanel
            entityType="company"
            entityId={companyId}
            title="Firma izohlari"
            placeholder="Firma haqida izoh (barcha hisobotlarga tegishli)..."
          />
          <NotesPanel
            entityType="report"
            entityId={reportId}
            reportId={reportId}
            title="Hisobot izohlari"
            placeholder="Shu hisobotga izoh qo'shing..."
          />
        </div>
      </div>
    );
  }

  // ───── Balans ─────
  if (tab === "balans") {
    const lines = await prisma.balanceLine.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });

    // Asosiy aktiv moddalari (sof qiymatlar) — diagramma uchun
    const assetCodes: Record<string, string> = {
      "10": "Kassa",
      "20": "Bank depozitlari",
      "30": "Hisoblangan foizlar",
      "52": "Kreditlar (sof)",
      "80": "Asosiy vositalar",
      "110": "Boshqa aktivlar",
    };
    const assetBars = lines
      .filter((l) => l.code && assetCodes[l.code])
      .map((l) => ({ name: assetCodes[l.code!], value: num(l.value) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return (
      <div className="space-y-5">
        {assetBars.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Aktivlar tarkibi</CardTitle>
              <Badge tone="info">asosiy moddalar</Badge>
            </CardHeader>
            <CardBody>
              <HBars data={assetBars} unitLabel="Aktiv" />
            </CardBody>
          </Card>
        )}
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
      </div>
    );
  }

  // ───── Foyda-zarar ─────
  if (tab === "foyda") {
    const lines = await prisma.incomeLine.findMany({
      where: { reportId },
      orderBy: { orderIdx: "asc" },
    });

    const val = (code: string) =>
      num(lines.find((l) => l.code === code)?.value ?? 0);
    const incomeBars = [
      { name: "Foizli daromad", value: val("180") },
      { name: "Foizli harajat", value: val("270") },
      { name: "Foizsiz daromad", value: val("470") },
      { name: "Operatsion harajat", value: val("780") },
      { name: "Sof foyda", value: val("1200") },
    ].filter((d) => d.value !== 0);

    return (
      <div className="space-y-5">
        {incomeBars.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Daromad va harajatlar</CardTitle>
              <Badge tone="info">asosiy ko&apos;rsatkichlar</Badge>
            </CardHeader>
            <CardBody>
              <IncomeBars data={incomeBars} />
            </CardBody>
          </Card>
        )}
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
      </div>
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

    // Diagrammalar uchun (butun hisobot bo'yicha) — aging + kredit turi
    const [agingAgg, byType] = await Promise.all([
      prisma.loanItem.aggregate({
        where: { reportId },
        _sum: {
          overdue1_30: true,
          overdue31_90: true,
          overdue91_180: true,
          overdue181: true,
        },
      }),
      prisma.loanItem.groupBy({
        by: ["loanType"],
        where: { reportId },
        _sum: { balance: true },
      }),
    ]);

    const agingData = [
      { name: "1–30 kun", value: num(agingAgg._sum.overdue1_30) },
      { name: "31–90 kun", value: num(agingAgg._sum.overdue31_90) },
      { name: "91–180 kun", value: num(agingAgg._sum.overdue91_180) },
      { name: "181+ kun", value: num(agingAgg._sum.overdue181) },
    ].filter((d) => d.value > 0);

    const typeData = byType
      .map((t) => ({
        name: LOAN_TYPE[t.loanType ?? 0] ?? "Boshqa",
        value: num(t._sum.balance),
      }))
      .filter((d) => d.value > 0);

    return (
      <div className="space-y-5">
        {(agingData.length > 0 || typeData.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle>Kredit turlari bo&apos;yicha qoldiq</CardTitle>
              </CardHeader>
              <CardBody>
                <StructureDonut data={typeData} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Muddati o&apos;tgan qarz (aging)</CardTitle>
                {agingData.length === 0 && (
                  <Badge tone="profit">Muddati o&apos;tgan yo&apos;q</Badge>
                )}
              </CardHeader>
              <CardBody>
                {agingData.length > 0 ? (
                  <HBars data={agingData} unitLabel="Muddati o'tgan" height={260} />
                ) : (
                  <p className="h-[260px] grid place-items-center text-sm text-[var(--profit)]">
                    Muddati o&apos;tgan qarz yo&apos;q ✓
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        )}
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
            {loans.length > 0 && (
              <TotalFoot>
                <Td className="font-bold" colSpan={4}>
                  ИТОГО ({total.toLocaleString("ru-RU")})
                </Td>
                <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.amount))}</Td>
                <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.balance))}</Td>
                <Td colSpan={3} />
                <Td align="right" mono className="font-bold text-[var(--loss)]">
                  {formatMoney(num(sums._sum.overduePrincipal))}
                </Td>
              </TotalFoot>
            )}
          </Table>
            <div className="px-4 border-t border-[var(--border)]">
              <Pagination total={total} page={page} pageSize={size} />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // ───── Schotlar / Konsolidatsiya ─────
  if (tab === "schotlar") {
    const where: Prisma.LedgerAccountWhereInput = { reportId };
    if (q)
      where.OR = [{ accountNo: { contains: q } }, { name: { contains: q } }];

    const [total, accounts, sums] = await Promise.all([
      prisma.ledgerAccount.count({ where }),
      prisma.ledgerAccount.findMany({
        where,
        orderBy: { orderIdx: "asc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.ledgerAccount.aggregate({
        where,
        _sum: {
          openDebit: true,
          openCredit: true,
          turnoverDebit: true,
          turnoverCredit: true,
          closeDebit: true,
          closeCredit: true,
        },
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
            <TotalFoot>
              <Td className="font-bold" colSpan={2}>
                ИТОГО ({total.toLocaleString("ru-RU")})
              </Td>
              <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.openDebit))}</Td>
              <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.openCredit))}</Td>
              <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.turnoverDebit))}</Td>
              <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.turnoverCredit))}</Td>
              <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.closeDebit))}</Td>
              <Td align="right" mono className="font-bold">{formatMoney(num(sums._sum.closeCredit))}</Td>
            </TotalFoot>
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

    // Bir xil kreditor (masalan "AO ANOR BANK") bir necha qatorda kelishi mumkin —
    // nom bo'yicha guruhlab, summa va qoldiqni jamlaymiz (har kreditor bitta).
    const groupedMap = new Map<
      string,
      { name: string; amount: number; balance: number; count: number }
    >();
    for (const f of funds) {
      const clean = f.creditorName.replace(/["']/g, "").trim();
      const key = clean.toLowerCase();
      const prev = groupedMap.get(key);
      if (prev) {
        prev.amount += num(f.amount);
        prev.balance += num(f.balance);
        prev.count += 1;
      } else {
        groupedMap.set(key, {
          name: clean,
          amount: num(f.amount),
          balance: num(f.balance),
          count: 1,
        });
      }
    }
    const grouped = [...groupedMap.values()].sort(
      (a, b) => (b.balance || b.amount) - (a.balance || a.amount),
    );

    const creditorBars = grouped
      .map((g) => ({
        name: g.name.slice(0, 22),
        value: g.balance || g.amount,
      }))
      .filter((d) => d.value > 0)
      .slice(0, 10);

    return (
      <div className="space-y-5">
        {creditorBars.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Kreditorlar bo&apos;yicha qoldiq</CardTitle>
              <Badge tone="info">top {creditorBars.length}</Badge>
            </CardHeader>
            <CardBody>
              <HBars data={creditorBars} unitLabel="Qoldiq" />
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Jalb etilgan mablag&apos;lar</CardTitle>
            <Badge tone="neutral">{grouped.length} ta kreditor</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Kreditor</Th>
                  <Th align="center">Shartnoma</Th>
                  <Th align="right">Summa</Th>
                  <Th align="right">Qoldiq</Th>
                </Tr>
              </Thead>
              <tbody>
                {grouped.map((g) => (
                  <Tr key={g.name}>
                    <Td>{g.name}</Td>
                    <Td align="center" className="text-[var(--text-muted)]">
                      {g.count > 1 ? `${g.count} ta` : "—"}
                    </Td>
                    <Td align="right" mono>{formatMoney(g.amount)}</Td>
                    <Td align="right" mono>{formatMoney(g.balance)}</Td>
                  </Tr>
                ))}
                {grouped.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">Ma&apos;lumot yo&apos;q</td></tr>
                )}
              </tbody>
              {grouped.length > 0 && (
                <TotalFoot>
                  <Td className="font-bold" colSpan={2}>
                    ИТОГО ({grouped.length})
                  </Td>
                  <Td align="right" mono className="font-bold">
                    {formatMoney(grouped.reduce((s, g) => s + g.amount, 0))}
                  </Td>
                  <Td align="right" mono className="font-bold">
                    {formatMoney(grouped.reduce((s, g) => s + g.balance, 0))}
                  </Td>
                </TotalFoot>
              )}
            </Table>
          </CardBody>
        </Card>
      </div>
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
    // Davr filtri: preset (period) yoki oy/yil
    const where: Prisma.ReportWhereInput = { companyId };
    const { from, to } = periodRange(sp.period || "all");
    if (from && to) where.reportDate = { gte: from, lte: to };
    if (sp.year) {
      const y = Number(sp.year);
      const ys = new Date(y, 0, 1);
      const ye = new Date(y, 11, 31, 23, 59, 59);
      where.reportDate = { gte: ys, lte: ye };
    }

    let reports = await prisma.report.findMany({
      where,
      orderBy: { reportDate: "desc" },
      include: { uploadedBy: { select: { name: true, login: true } } },
    });

    // Oy bo'yicha filtr (JS tomonda — DATE dan oy)
    if (sp.month) {
      const mo = Number(sp.month);
      reports = reports.filter((r) => r.reportDate.getMonth() + 1 === mo);
    }
    // "Kunlik (so'nggi)" — faqat eng so'nggi hisobot
    if ((sp.period || "all") === "daily") reports = reports.slice(0, 1);

    // Mavjud yillar (filtr dropdowni uchun)
    const allReports = await prisma.report.findMany({
      where: { companyId },
      select: { reportDate: true },
    });
    const years = [
      ...new Set(allReports.map((r) => r.reportDate.getFullYear())),
    ].sort((a, b) => b - a);

    // Pagination (filtrlangan natija ustida)
    const filesTotal = reports.length;
    const pageReports = reports.slice((page - 1) * size, page * size);

    const totalSize = reports.reduce((s, r) => s + (r.fileSize ?? 0), 0);
    const confirmedCount = reports.filter((r) => r.status === "CONFIRMED").length;

    return (
      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <CardTitle>Yuklangan hisobotlar</CardTitle>
            <Badge tone="info">{filesTotal} ta</Badge>
            {confirmedCount > 0 && (
              <Badge tone="profit">{confirmedCount} tasdiqlangan</Badge>
            )}
          </div>
          <PeriodFilter years={years} />
        </CardHeader>
        <CardBody className="p-0">
          <Table>
            <Thead>
              <Tr>
                <Th>Hisobot sanasi</Th>
                <Th>Fayl</Th>
                <Th>Yuklangan vaqt</Th>
                <Th>Holat</Th>
                <Th>Yuklagan</Th>
                <Th align="right">Hajm</Th>
                <Th align="center">Amal</Th>
              </Tr>
            </Thead>
            <tbody>
              {pageReports.map((r) => (
                <Tr key={r.id}>
                  {/* Hisobot sanasi + hafta kuni */}
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid place-items-center h-9 w-9 rounded-[9px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] shrink-0">
                        <Calendar size={17} variant="Bold" />
                      </span>
                      <div className="leading-tight">
                        <div className="font-semibold tnum text-[var(--text)]">
                          {formatDate(r.reportDate)}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {weekday(r.reportDate)}
                        </div>
                      </div>
                    </div>
                  </Td>
                  {/* Fayl nomi + Excel ikon */}
                  <Td>
                    <div className="flex items-center gap-2 max-w-[220px]">
                      <span className="grid place-items-center h-8 w-8 rounded-[8px] bg-[var(--profit)]/10 text-[var(--profit)] shrink-0">
                        <DocumentText size={16} variant="Bold" />
                      </span>
                      <span className="truncate text-[13px]" title={r.fileName}>
                        {r.fileName}
                      </span>
                    </div>
                  </Td>
                  {/* Yuklangan vaqt — sana + nisbiy */}
                  <Td>
                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <Clock size={14} />
                      <div className="leading-tight">
                        <div className="text-[12px] tnum text-[var(--text)]">
                          {formatDateTime(r.createdAt)}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {timeAgo(r.createdAt)}
                        </div>
                      </div>
                    </div>
                  </Td>
                  {/* Holat */}
                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      {r.status === "CONFIRMED" ? (
                        <Badge tone="profit">
                          <TickCircle size={12} variant="Bold" /> Tasdiqlangan
                        </Badge>
                      ) : (
                        <Badge tone="warning">Kutilmoqda</Badge>
                      )}
                      {r.isConsolidated && <Badge tone="gold">Umumiy</Badge>}
                      {r.isPinned && (
                        <Star1 size={13} variant="Bold" className="text-[var(--gold)]" />
                      )}
                    </div>
                  </Td>
                  {/* Yuklagan */}
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] text-[11px] font-semibold shrink-0">
                        {(r.uploadedBy?.name ?? r.uploadedBy?.login ?? "—")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="text-[13px] text-[var(--text)] truncate max-w-[120px]">
                        {r.uploadedBy?.name ?? r.uploadedBy?.login ?? "—"}
                      </span>
                    </div>
                  </Td>
                  {/* Hajm */}
                  <Td align="right" mono className="text-[var(--text-muted)]">
                    {r.fileSize
                      ? r.fileSize >= 1024 * 1024
                        ? `${(r.fileSize / 1024 / 1024).toFixed(1)} MB`
                        : `${(r.fileSize / 1024).toFixed(0)} KB`
                      : "—"}
                  </Td>
                  {/* Amal */}
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/firmalar/${companyId}?report=${r.id}&tab=umumiy`}
                        className="grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--trust-blue)] hover:border-[var(--trust-blue)]/40 transition-colors"
                        title="Ko'rish"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/api/reports/${r.id}/export?type=all`}
                        className="grid place-items-center h-8 w-8 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--profit)] hover:border-[var(--profit)]/40 transition-colors"
                        title="Yuklab olish (Excel)"
                      >
                        <DocumentDownload size={16} />
                      </Link>
                      <ReportDeleteButton
                        reportId={r.id}
                        companyId={companyId}
                        fileName={r.fileName}
                        reportDateLabel={formatDate(r.reportDate)}
                        status={r.status}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
              {filesTotal === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">
                    <Calendar size={28} className="mx-auto mb-2 opacity-40" />
                    Tanlangan davr uchun hisobot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
            {filesTotal > 0 && (
              <TotalFoot>
                <Td className="font-semibold" colSpan={5}>
                  ИТОГО ({filesTotal} ta hisobot)
                </Td>
                <Td align="right" mono className="font-semibold">
                  {totalSize >= 1024 * 1024
                    ? `${(totalSize / 1024 / 1024).toFixed(1)} MB`
                    : `${(totalSize / 1024).toFixed(0)} KB`}
                </Td>
                <Td />
              </TotalFoot>
            )}
          </Table>
          {filesTotal > 0 && (
            <div className="px-4 border-t border-[var(--border)]">
              <Pagination total={filesTotal} page={page} pageSize={size} />
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  // ───── Firma hujjatlari (qo'shimcha fayllar) ─────
  if (tab === "hujjatlar") {
    return <DocumentsPanel companyId={companyId} />;
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

/** Jadval pastidagi "ИТОГО" (jami) qatori — premium ko'rinishda */
function TotalFoot({ children }: { children: React.ReactNode }) {
  return (
    <tfoot className="sticky bottom-0 z-10">
      <tr className="border-t-2 border-[var(--trust-blue)]/30 bg-[var(--trust-blue)]/[0.07] text-[var(--text)] backdrop-blur">
        {children}
      </tr>
    </tfoot>
  );
}
