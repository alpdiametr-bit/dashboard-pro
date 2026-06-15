import { UploadForm } from "./UploadForm";
import { Card } from "@/components/ui/Card";
import { InfoCircle } from "iconsax-reactjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function YuklashPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;
  const defaultCompanyId = Number(company) || undefined;

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">
          Kunlik hisobot yuklash
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Firma uchun .xls hisobot faylini yuklang. Tizim avtomatik tahlil
          qilib, tasdiqlashdan oldin umumiy ma&apos;lumotni ko&apos;rsatadi.
        </p>
      </div>

      <UploadForm companies={companies} defaultCompanyId={defaultCompanyId} />

      <Card className="p-3 flex items-start gap-3 bg-[var(--trust-blue)]/5 border-[var(--trust-blue)]/20">
        <InfoCircle size={18} className="text-[var(--trust-blue)] mt-0.5 shrink-0" />
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          Yuqoridagi ro&apos;yxatdan <b>firmani (filialni)</b> tanlashingiz mumkin.
          Tanlamasangiz, firma nomi fayl ichidagi <b>CommonData</b> varog&apos;idan
          avtomatik olinadi. Barcha 36 varaq to&apos;liq saqlanadi — hech qanday
          ma&apos;lumot yo&apos;qolmaydi.
        </p>
      </Card>
    </div>
  );
}
