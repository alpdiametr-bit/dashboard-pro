import Link from "next/link";
import { dashboardStats, balanceValue } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CompanyBar, StructureDonut } from "@/components/charts/Charts";
import {
  Building,
  DocumentText,
  Wallet3,
  StatusUp,
  Coin1,
  ReceiptText,
  DocumentUpload,
  ArrowRight2,
} from "iconsax-reactjs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await dashboardStats();

  const companyBarData = stats.latestReports
    .map((r) => ({
      name: r.company.name.replace(/MIKROMOLIYA TASHKILOTI|MCHJ|"/gi, "").trim().slice(0, 14),
      value: balanceValue(r.balanceLines, "120"),
    }))
    .filter((d) => d.value > 0)
    .slice(0, 8);

  const structureData = [
    { name: "Kapital", value: stats.totalCapital },
    { name: "Majburiyatlar", value: stats.totalLiabilities },
  ];

  const hasData = stats.reportCount > 0;

  return (
    <div className="space-y-6">
      {/* KPI qatori */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Firmalar"
          value={String(stats.companyCount)}
          hint="Ro'yxatdan o'tgan"
          tone="info"
          icon={<Building size={22} />}
        />
        <KpiCard
          label="Jami aktivlar"
          value={formatMoney(stats.totalAssets)}
          hint="ming so'm"
          tone="info"
          icon={<Wallet3 size={22} />}
        />
        <KpiCard
          label="Jami kapital"
          value={formatMoney(stats.totalCapital)}
          hint="ming so'm"
          tone="profit"
          icon={<Coin1 size={22} />}
        />
        <KpiCard
          label="Sof foyda"
          value={formatMoney(stats.totalProfit)}
          hint="joriy yil"
          tone={stats.totalProfit >= 0 ? "profit" : "loss"}
          trend={stats.totalProfit >= 0 ? "up" : "down"}
          icon={<StatusUp size={22} />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Jami majburiyatlar"
          value={formatMoney(stats.totalLiabilities)}
          hint="ming so'm"
          icon={<ReceiptText size={22} />}
        />
        <KpiCard
          label="Yuklangan hisobotlar"
          value={String(stats.reportCount)}
          hint="jami"
          icon={<DocumentText size={22} />}
        />
        <KpiCard
          label="Tasdiq kutilmoqda"
          value={String(stats.pendingCount)}
          hint="hisobot"
          tone={stats.pendingCount > 0 ? "warning" : "info"}
          icon={<DocumentText size={22} />}
        />
        <Card className="p-5 flex flex-col justify-between">
          <p className="text-[13px] font-medium text-[var(--text-muted)]">
            Yangi hisobot
          </p>
          <Link href="/yuklash" className="mt-3">
            <Button variant="gold" className="w-full">
              <DocumentUpload size={18} />
              Hisobot yuklash
            </Button>
          </Link>
        </Card>
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Firmalar bo&apos;yicha aktivlar</CardTitle>
              <Badge tone="info">so&apos;nggi hisobotlar</Badge>
            </CardHeader>
            <CardBody>
              <CompanyBar data={companyBarData} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kapital tuzilishi</CardTitle>
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
