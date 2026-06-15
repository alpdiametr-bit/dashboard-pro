import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { balanceValue } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { AddCompanyButton } from "./AddCompanyButton";
import { DeleteCompanyButton } from "./DeleteCompanyButton";
import { EditCompanyButton } from "./EditCompanyButton";
import { FirmFilters } from "./FirmFilters";
import { PinButton } from "@/components/PinButton";
import { Building, ArrowRight2, DocumentText, Star1 } from "iconsax-reactjs";

export const dynamic = "force-dynamic";

export default async function FirmalarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; sort?: string }>;
}) {
  const { q, region, sort } = await searchParams;

  const where: Prisma.CompanyWhereInput = {};
  if (q) where.OR = [{ name: { contains: q } }, { region: { contains: q } }];
  if (region) where.region = region;

  const companiesRaw = await prisma.company.findMany({
    where,
    include: {
      reports: {
        orderBy: { reportDate: "desc" },
        take: 1,
        include: {
          balanceLines: { select: { code: true, value: true } },
          _count: { select: { loanItems: true } },
        },
      },
      _count: { select: { reports: true } },
    },
    orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, { name: "asc" }],
  });

  // Hisoblanadigan qiymat (aktiv) bilan saralash uchun yordamchi
  const withMetrics = companiesRaw.map((c) => {
    const latest = c.reports[0];
    return {
      c,
      assets: latest ? balanceValue(latest.balanceLines, "120") : 0,
      loans: latest?._count.loanItems ?? 0,
      reportDate: latest?.reportDate ?? null,
    };
  });

  switch (sort) {
    case "name":
      withMetrics.sort((a, b) => a.c.name.localeCompare(b.c.name));
      break;
    case "assets_desc":
      withMetrics.sort((a, b) => b.assets - a.assets);
      break;
    case "assets_asc":
      withMetrics.sort((a, b) => a.assets - b.assets);
      break;
    case "loans_desc":
      withMetrics.sort((a, b) => b.loans - a.loans);
      break;
    case "reports_desc":
      withMetrics.sort((a, b) => b.c._count.reports - a.c._count.reports);
      break;
    case "date_desc":
      withMetrics.sort(
        (a, b) =>
          (b.reportDate?.getTime() ?? 0) - (a.reportDate?.getTime() ?? 0),
      );
      break;
    default:
      // "pinned" — DB tartibi (qadalgan birinchi) saqlanadi
      break;
  }

  const companies = withMetrics.map((m) => m.c);

  // Filtr dropdowni uchun bazadagi mavjud hududlar
  const regionRows = await prisma.company.findMany({
    where: { region: { not: null } },
    select: { region: true },
    distinct: ["region"],
  });
  const regions = regionRows
    .map((r) => r.region!)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text)]">
            Firmalar
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {companies.length} ta firma
            {region ? ` · ${region}` : " ro'yxatda"}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
            <SearchInput placeholder="Firma yoki hudud bo'yicha..." />
          </div>
          <AddCompanyButton />
        </div>
      </div>

      {/* Hudud + saralash filtri */}
      <FirmFilters regions={regions} />

      {companies.length === 0 ? (
        <Card className="p-10 text-center text-[var(--text-muted)]">
          <Building size={32} className="mx-auto mb-3 opacity-50" />
          <p>Firma topilmadi</p>
          <div className="mt-4 flex justify-center">
            <AddCompanyButton />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((c) => {
            const latest = c.reports[0];
            const assets = latest ? balanceValue(latest.balanceLines, "120") : 0;
            return (
              <Link key={c.id} href={`/firmalar/${c.id}`}>
                <Card className="lift sheen group p-5 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid place-items-center h-12 w-12 rounded-[14px] text-white bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] shadow-[var(--shadow-sm)] ring-1 ring-white/15 shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building size={22} variant="Bold" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.isPinned && (
                        <Badge tone="gold">
                          <Star1 size={12} variant="Bold" /> Qadalgan
                        </Badge>
                      )}
                      <Badge tone="neutral">
                        <DocumentText size={12} /> {c._count.reports}
                      </Badge>
                      <PinButton
                        endpoint={`/api/companies/${c.id}/pin`}
                        pinned={c.isPinned}
                        size={15}
                        stopNavigation
                      />
                      <EditCompanyButton
                        company={{
                          id: c.id,
                          name: c.name,
                          region: c.region,
                          inn: c.inn,
                          description: c.description,
                          imageUrl: c.imageUrl,
                        }}
                        variant="icon"
                        stopNavigation
                      />
                      {c._count.reports === 0 && (
                        <DeleteCompanyButton
                          companyId={c.id}
                          companyName={c.name}
                          stopNavigation
                        />
                      )}
                    </div>
                  </div>
                  <h3 className="mt-3.5 text-sm font-semibold text-[var(--text)] line-clamp-2 group-hover:text-[var(--trust-blue)] transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    {c.region ?? "—"}
                  </p>
                  {c.description && (
                    <p className="text-[12px] text-[var(--text-muted)] mt-2 line-clamp-2">
                      {c.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-[var(--border)] flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                        Jami aktivlar
                      </p>
                      <p className="text-[17px] font-bold tnum text-[var(--text)]">
                        {formatMoney(assets)}
                      </p>
                      {latest && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {formatDate(latest.reportDate)} ·{" "}
                          {latest._count.loanItems} kredit
                        </p>
                      )}
                    </div>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] transition-all duration-200 group-hover:bg-[var(--trust-blue)] group-hover:text-white">
                      <ArrowRight2 size={16} />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
