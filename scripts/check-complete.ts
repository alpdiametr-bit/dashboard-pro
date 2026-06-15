/* eslint-disable */
import { prisma } from "../src/lib/prisma";

async function main() {
  const companies = await prisma.company.findMany({
    where: { reports: { some: {} } },
    include: {
      reports: {
        where: { status: "CONFIRMED" },
        orderBy: { reportDate: "asc" },
        select: {
          id: true,
          reportDate: true,
          _count: {
            select: {
              sheets: true,
              balanceLines: true,
              incomeLines: true,
              ledgerAccounts: true,
              loanItems: true,
              borrowedFunds: true,
              norms: true,
            },
          },
        },
      },
    },
  });

  let incompleteCount = 0;
  for (const c of companies) {
    console.log(`\n=== ${c.name} — ${c.reports.length} ta hisobot ===`);
    for (const r of c.reports) {
      const k = r._count;
      const bad: string[] = [];
      if (k.sheets < 30) bad.push(`sheets=${k.sheets}`);
      if (k.balanceLines < 30) bad.push(`bal=${k.balanceLines}`);
      if (k.incomeLines < 30) bad.push(`inc=${k.incomeLines}`);
      if (k.ledgerAccounts < 100) bad.push(`ledger=${k.ledgerAccounts}`);
      if (k.loanItems < 1) bad.push(`loans=${k.loanItems}`);
      if (k.borrowedFunds < 1) bad.push(`borr=${k.borrowedFunds}`);
      if (k.norms < 1) bad.push(`norm=${k.norms}`);
      const date = r.reportDate.toISOString().slice(0, 10);
      if (bad.length) {
        incompleteCount++;
        console.log(`  ⚠ ${date}  CHALA: ${bad.join(", ")}`);
      } else {
        console.log(
          `  ✓ ${date}  sheets=${k.sheets} bal=${k.balanceLines} inc=${k.incomeLines} ledger=${k.ledgerAccounts} loans=${k.loanItems} borr=${k.borrowedFunds} norm=${k.norms}`,
        );
      }
    }
  }

  console.log(
    `\n${incompleteCount === 0 ? "✅ HAMMA HISOBOT TO'LIQ — chala data yo'q" : `⚠ ${incompleteCount} ta chala hisobot`}`,
  );
  await prisma.$disconnect();
}
main();
