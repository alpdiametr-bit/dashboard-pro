import { UploadForm } from "./UploadForm";
import { Card } from "@/components/ui/Card";
import { InfoCircle } from "iconsax-reactjs";

export default function YuklashPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">
          Kunlik hisobot yuklash
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Firma uchun .xls hisobot faylini yuklang. Tizim avtomatik tahlil
          qilib, tasdiqlashdan oldin umumiy ma&apos;lumotni ko&apos;rsatadi.
        </p>
      </div>

      <Card className="p-3 flex items-start gap-3 bg-[var(--trust-blue)]/5 border-[var(--trust-blue)]/20">
        <InfoCircle size={18} className="text-[var(--trust-blue)] mt-0.5 shrink-0" />
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          Firma nomi va hisobot davri fayl ichidagi <b>CommonData</b> varog&apos;idan
          avtomatik olinadi. Sanani qo&apos;lda ham belgilashingiz mumkin
          (masalan, kechagi kun). Barcha 36 varaq to&apos;liq saqlanadi —
          hech qanday ma&apos;lumot yo&apos;qolmaydi.
        </p>
      </Card>

      <UploadForm />
    </div>
  );
}
