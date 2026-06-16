import { getAlerts, DEFAULT_ALERT_THRESHOLD } from "@/lib/alerts";
import { AlertsPanel } from "./AlertsPanel";
import { NotificationBing } from "iconsax-reactjs";

export const dynamic = "force-dynamic";

export default async function SignallarPage() {
  const initial = await getAlerts(DEFAULT_ALERT_THRESHOLD);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Sarlavha */}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-[var(--trust-blue-bright,#2f53c4)] to-[var(--trust-blue)] text-white shadow-[var(--shadow-blue)]">
          <NotificationBing size={22} variant="Bold" />
        </span>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">
            Ogohlantirishlar
          </h1>
          <p className="text-[13px] text-[var(--text-muted)]">
            {"Kunlar oralig'idagi katta o'zgarishlar— "}
            {initial.scannedReports} hisobot, {initial.scannedCompanies} firma
            tahlil qilindi
          </p>
        </div>
      </div>

      <AlertsPanel initial={initial} />
    </div>
  );
}
