"use client";

import { useRouter } from "next/navigation";
import { UploadForm } from "@/app/(app)/yuklash/UploadForm";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { DocumentUpload, InfoCircle } from "iconsax-reactjs";

export function FirmUpload({
  companyId,
  companyName,
}: {
  companyId: number;
  companyName: string;
}) {
  const router = useRouter();

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="p-3 flex items-start gap-3 bg-[var(--trust-blue)]/5 border-[var(--trust-blue)]/20">
        <InfoCircle size={18} className="text-[var(--trust-blue)] mt-0.5 shrink-0" />
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          Hisobot to&apos;g&apos;ridan-to&apos;g&apos;ri shu firma uchun
          yuklanadi. Sanani belgilang (masalan, kechagi kun), tahlildan keyin
          umumiy ma&apos;lumotni tasdiqlang. Barcha 36 varaq to&apos;liq
          saqlanadi.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <DocumentUpload size={18} /> Hisobot yuklash
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          <UploadForm
            embedded
            companies={[{ id: companyId, name: companyName }]}
            defaultCompanyId={companyId}
            lockCompany
            onDone={() => {
              router.replace(`/firmalar/${companyId}?tab=fayllar`);
              router.refresh();
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
