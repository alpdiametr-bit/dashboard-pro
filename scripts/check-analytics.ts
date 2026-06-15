/* eslint-disable */
import { companyAnalytics } from "../src/lib/analytics";
import { prisma } from "../src/lib/prisma";

async function main() {
  const c = await prisma.company.findFirst({ where: { reports: { some: {} } } });
  if (!c) return console.log("firma yo'q");
  const a = await companyAnalytics(c.id);
  if (!a) return console.log("analitika yo'q");

  console.log(`\n=== ${a.company.name} ===`);
  console.log(`\nDEBET/KREDIT (oxirgi hisobot):`);
  console.log(`  Jami debet: ${a.ledger.totalDebit.toLocaleString("ru-RU")}`);
  console.log(`  Jami kredit: ${a.ledger.totalCredit.toLocaleString("ru-RU")}`);
  console.log(`  Farqi (raznitsa): ${a.ledger.diff.toLocaleString("ru-RU")}`);
  console.log(`\n  Eng katta raznitsali hisobvaraqlar (top 5):`);
  for (const r of a.ledger.topByDiff.slice(0, 5)) {
    console.log(`    ${r.accountNo} ${r.name.slice(0, 40).padEnd(40)} D=${r.debit.toLocaleString("ru-RU")} K=${r.credit.toLocaleString("ru-RU")} → ${r.diff.toLocaleString("ru-RU")}`);
  }

  console.log(`\nQARZ OLUVCHILAR: jami ${a.borrowers.total}, muddati o'tgan ${a.borrowers.overdueCount}`);
  console.log(`  Eng yirik qarzdorlar (top 5):`);
  for (const b of a.borrowers.top.slice(0, 5)) {
    console.log(`    ${b.name.slice(0, 35).padEnd(35)} ${b.pinfl} qoldiq=${b.balance.toLocaleString("ru-RU")} ${b.rate}%`);
  }
  if (a.borrowers.topOverdue.length) {
    console.log(`  Muddati o'tgan (top 3):`);
    for (const b of a.borrowers.topOverdue.slice(0, 3)) {
      console.log(`    ${b.name.slice(0, 35).padEnd(35)} muddati o'tgan=${b.overdue.toLocaleString("ru-RU")}`);
    }
  }

  // Trend: debet/kredit oborot bo'yicha
  console.log(`\nDEBET/KREDIT TREND (har kun):`);
  for (const p of a.series.slice(-5)) {
    console.log(`  ${p.label}  D=${p.turnoverDebit.toLocaleString("ru-RU")} K=${p.turnoverCredit.toLocaleString("ru-RU")} farq=${p.turnoverNet.toLocaleString("ru-RU")}`);
  }
  await prisma.$disconnect();
}
main();
