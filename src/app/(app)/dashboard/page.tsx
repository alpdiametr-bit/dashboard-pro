import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dashboardStats, companyAssetsSeries, balanceValue } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import { getLang } from "@/lib/lang";
import { translate } from "@/lib/i18n";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StructureDonut } from "@/components/charts/Charts";
import { CompanyAssetsChart } from "./CompanyAssetsChart";
import { DashboardFilters } from "./DashboardFilters";
import {
  Building,
  DocumentText,
  Wallet3,
  StatusUp,
  Coin1,
  ReceiptText,
  DocumentUpload,
  ArrowRight2,
  Chart2,
} from "iconsax-reactjs";

export const dynamic = "force-dynamic";

function rangeFromPeriod(period: string): { from?: Date; to?: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "today": {
      const from = new Date(y, m, now.getDate());
      return { from, to: now };
    }
    case "7d":
      return { from: new Date(now.getTime() - 7 * 864e5), to: now };
    case "30d":
      return { from: new Date(now.getTime() - 30 * 864e5), to: now };
    case "month":
      return { from: new Date(y, m, 1), to: now };
    case "year":
      return { from: new Date(y, 0, 1), to: now };
    default:
      return {};
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; company?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period || "all";
  const companyId = Number(sp.company) || undefined;
  const { from, to } = rangeFromPeriod(period);
  const lang = await getLang();
  const t = (k: string) => translate(lang, k);

  const [stats, companies] = await Promise.all([
    dashboardStats({ companyId, from, to }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const assetsSeries = await companyAssetsSeries({ companyId, from, to });

  const structureData = [
    { name: "Kapital", value: stats.totalCapital },
    { name: "Majburiyatlar", value: stats.totalLiabilities },
  ];

  const hasData = stats.latestReports.length > 0;

  return (
    <div className="space-y-6">
      {/* Sahifa sarlavhasi + filtrlar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-blue)] ring-1 ring-white/15">
            <Chart2 size={22} variant="Bold" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--text)]">
              Boshqaruv paneli
            </h1>
            <p className="text-[13px] text-[var(--text-muted)]">
              Firmalar bo&apos;yicha moliyaviy ko&apos;rsatkichlar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DashboardFilters companies={companies} />
          <Link href="/yuklash">
            <Button variant="gold" size="sm" title="Hisobot yuklash" aria-label="Hisobot yuklash">
              <DocumentUpload size={18} />
              <span className="hidden sm:inline">Yuklash</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI qatori */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Faol firmalar"
          value={String(stats.activeCompanies)}
          hint={`${stats.companyCount} jami`}
          tone="info"
          icon={<Building size={22} variant="Bold" />}
        />
        <KpiCard
          label="Jami aktivlar"
          value={formatMoney(stats.totalAssets)}
          hint="ming so'm"
          tone="info"
          icon={<Wallet3 size={22} variant="Bold" />}
        />
        <KpiCard
          label="Jami kapital"
          value={formatMoney(stats.totalCapital)}
          hint="ming so'm"
          tone="profit"
          icon={<Coin1 size={22} variant="Bold" />}
        />
        <KpiCard
          label="Sof foyda"
          value={formatMoney(stats.totalProfit)}
          hint="joriy yil"
          tone={stats.totalProfit >= 0 ? "profit" : "loss"}
          trend={stats.totalProfit >= 0 ? "up" : "down"}
          icon={<StatusUp size={22} variant="Bold" />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Jami majburiyatlar"
          value={formatMoney(stats.totalLiabilities)}
          hint="ming so'm"
          tone="warning"
          icon={<ReceiptText size={22} variant="Bold" />}
        />
        <KpiCard
          label="Yuklangan hisobotlar"
          value={String(stats.reportCount)}
          hint="jami fayllar"
          tone="info"
          icon={<DocumentText size={22} variant="Bold" />}
        />
        <KpiCard
          label="Tasdiq kutilmoqda"
          value={String(stats.pendingCount)}
          hint="hisobot"
          tone={stats.pendingCount > 0 ? "warning" : "profit"}
          icon={<DocumentText size={22} variant="Bold" />}
        />
      </div>

      {!hasData && (
        <Card className="p-10 text-center">
          <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-[var(--surface-2)] text-[var(--trust-blue)]">
            <DocumentUpload size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--text)]">
            Hali hisobot yuklanmagan
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Firma uchun kunlik .xls hisobotni yuklang. Tizim avtomatik tahlil
            qilib, dashboard va jadvallarni to&apos;ldiradi.
          </p>
          <Link href="/yuklash" className="inline-block mt-5">
            <Button variant="gold">
              <DocumentUpload size={18} /> Birinchi hisobotni yuklash
            </Button>
          </Link>
        </Card>
      )}

      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-[var(--shadow-md)]">
            <CardHeader>
              <CardTitle>{t("dash.assetsTitle")}</CardTitle>
              <Badge tone="info">{t("dash.assetsBadge")}</Badge>
            </CardHeader>
            <CardBody>
              <CompanyAssetsChart series={assetsSeries} />
            </CardBody>
          </Card>
          <Card className="shadow-[var(--shadow-md)]">
            <CardHeader>
              <CardTitle>{t("dash.capitalTitle")}</CardTitle>
            </CardHeader>
            <CardBody>
              <StructureDonut data={structureData} />
            </CardBody>
          </Card>
        </div>
      )}

      {/* So'nggi hisobotlar */}
      {stats.latestReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>So&apos;nggi tasdiqlangan hisobotlar</CardTitle>
            <Link
              href="/firmalar"
              className="text-[13px] text-[var(--trust-blue)] hover:underline flex items-center gap-1"
            >
              Barchasi <ArrowRight2 size={14} />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-[var(--border)]">
              {stats.latestReports.slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  href={`/firmalar/${r.companyId}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-[var(--surface-2)]/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {r.company.name}
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {formatDate(r.reportDate)} · {r._count.loanItems} kredit
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tnum text-[var(--text)]">
                      {formatMoney(balanceValue(r.balanceLines, "120"))}
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)]">aktiv</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
