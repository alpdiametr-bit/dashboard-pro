/* eslint-disable */
import { prisma } from "../src/lib/prisma";
const num = (v: any) => (v == null ? 0 : Number(v));
const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

async function main() {
  const reports = await prisma.report.findMany({
    where: { status: "CONFIRMED" },
    orderBy: [{ companyId: "asc" }, { reportDate: "asc" }],
    include: {
      company: { select: { name: true } },
      balanceLines: { where: { code: "120" }, select: { value: true } },
    },
  });
  console.log("FIRMA".padEnd(8) + "DB sana".padEnd(12) + "FAYL".padEnd(24) + "reportDay".padEnd(10) + "aktiv(120)");
  console.log("-".repeat(75));
  for (const r of reports) {
    const firma = r.company.name.includes("CLEVER") ? "CLEVER" : "CashU";
    const a = num(r.balanceLines[0]?.value);
    // reportDate raw (UTC) va local ko'rinishi
    const iso = r.reportDate.toISOString();
    console.log(
      firma.padEnd(8) +
        iso.slice(0, 10).padEnd(12) +
        (r.fileName || "—").padEnd(24) +
        String(r.reportDay ?? "—").padEnd(10) +
        fmt(a),
    );
  }
  await prisma.$disconnect();
}
main();
