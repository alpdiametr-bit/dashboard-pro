import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { balanceValue } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Building, ArrowRight2, DocumentText } from "iconsax-reactjs";

export const dynamic = "force-dynamic";

export default async function FirmalarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const companies = await prisma.company.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { region: { contains: q } }] }
      : undefined,
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
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text)]">Firmalar</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Jami {companies.length} ta firma
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput placeholder="Firma yoki hudud bo'yicha..." />
        </div>
      </div>

      {companies.length === 0 ? (
        <Card className="p-10 text-center text-[var(--text-muted)]">
          <Building size={32} className="mx-auto mb-3 opacity-50" />
          Firma topilmadi
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((c) => {
            const latest = c.reports[0];
            const assets = latest ? balanceValue(latest.balanceLines, "120") : 0;
            return (
              <Link key={c.id} href={`/firmalar/${c.id}`}>
                <Card className="p-5 h-full transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid place-items-center h-11 w-11 rounded-[10px] bg-[var(--trust-blue)]/10 text-[var(--trust-blue)] shrink-0">
                      <Building size={22} />
                    </div>
                    <Badge tone="neutral">
                      <DocumentText size={12} /> {c._count.reports}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text)] line-clamp-2">
                    {c.name}
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    {c.region ?? "—"}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Jami aktivlar
                      </p>
                      <p className="text-base font-semibold tnum text-[var(--text)]">
                        {formatMoney(assets)}
                      </p>
                      {latest && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {formatDate(latest.reportDate)} ·{" "}
                          {latest._count.loanItems} kredit
                        </p>
                      )}
                    </div>
                    <ArrowRight2 size={18} className="text-[var(--text-muted)]" />
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
