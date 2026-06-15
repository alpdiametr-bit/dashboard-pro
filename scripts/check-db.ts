/* eslint-disable */
import { prisma } from "../src/lib/prisma";

async function main() {
  const companies = await prisma.company.findMany({
    include: {
      reports: {
        where: { status: "CONFIRMED" },
        orderBy: { reportDate: "asc" },
        select: { reportDate: true, fileName: true },
      },
    },
  });

  for (const c of companies) {
    const dates = c.reports.map((r) => r.reportDate.toISOString().slice(0, 10));
    console.log(`\n${c.name} — ${c.reports.length} ta tasdiqlangan hisobot`);
    console.log("  Sanalar:", dates.join(", "));
    // Dublikat sana
    const dup = dates.filter((d, i) => dates.indexOf(d) !== i);
    if (dup.length) console.log("  ⚠ DUBLIKAT:", [...new Set(dup)].join(", "));
  }

  // Audit log oxirgi yozuvlar
  const logs = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: { _all: true },
  });
  console.log("\nAudit jurnali:");
  for (const l of logs) console.log(`  ${l.action}: ${l._count._all}`);

  await prisma.$disconnect();
}
main();
