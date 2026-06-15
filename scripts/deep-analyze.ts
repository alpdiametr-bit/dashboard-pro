/* eslint-disable */
// CHUQUR DATA-INTEGRITY TAHLILI
// Yuklangan hisobotlarni buxgalteriya tengliklari bo'yicha tekshiradi:
// parsing data yo'qotganmi/buzganmi — ichki identifikatorlar bilan aniqlanadi.
import { prisma } from "../src/lib/prisma";

const num = (v: any): number => (v == null ? 0 : Number(v));
const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

// nisbiy farq (%) — ikkita son orasidagi
function relDiff(a: number, b: number): number {
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return (Math.abs(a - b) / base) * 100;
}

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const reports = await prisma.report.findMany({
    where: { status: "CONFIRMED" },
    orderBy: [{ companyId: "asc" }, { reportDate: "asc" }],
    include: {
      company: { select: { name: true } },
      balanceLines: { select: { code: true, value: true } },
      incomeLines: { select: { code: true, value: true } },
    },
  });

  // Loan/borrowed agregatlari
  const loanAgg = await prisma.loanItem.groupBy({
    by: ["reportId"],
    _sum: { amount: true, balance: true, reserve: true, overduePrincipal: true },
    _count: { _all: true },
  });
  const borrowedAgg = await prisma.borrowedFund.groupBy({
    by: ["reportId"],
    _sum: { balance: true, amount: true },
    _count: { _all: true },
  });
  const loanMap = new Map(loanAgg.map((a) => [a.reportId, a]));
  const borrowedMap = new Map(borrowedAgg.map((a) => [a.reportId, a]));

  const bc = (lines: any[], code: string) =>
    num(lines.find((l) => l.code === code)?.value);

  let totalChecks = 0;
  let failedChecks = 0;
  const failures: string[] = [];

  // Kompaniya bo'yicha guruhlash (day-over-day uchun)
  const byCompany = new Map<string, typeof reports>();
  for (const r of reports) {
    const arr = byCompany.get(r.company.name) ?? [];
    arr.push(r);
    byCompany.set(r.company.name, arr as any);
  }

  for (const [cname, creports] of byCompany) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  ${cname} — ${creports.length} ta hisobot`);
    console.log("═".repeat(70));

    let prev: (typeof reports)[number] | null = null;
    for (const r of creports) {
      const b = r.balanceLines;
      const i = r.incomeLines;
      const la = loanMap.get(r.id);
      const ba = borrowedMap.get(r.id);
      const date = r.reportDate.toISOString().slice(0, 10);
      const checks: Check[] = [];

      // ── 1. BALANS bosh tenglik: 120 (aktiv) = 370 (majb+kapital) ──
      const a120 = bc(b, "120");
      const e370 = bc(b, "370");
      checks.push({
        name: "Balans tengligi (120=370)",
        ok: relDiff(a120, e370) < 0.01,
        detail: `aktiv=${fmt(a120)} majb+kap=${fmt(e370)}`,
      });

      // ── 2. 280 (jami majburiyat) + 360 (jami kapital) = 370 ──
      const l280 = bc(b, "280");
      const c360 = bc(b, "360");
      checks.push({
        name: "280+360=370",
        ok: relDiff(l280 + c360, e370) < 0.01,
        detail: `${fmt(l280)}+${fmt(c360)}=${fmt(l280 + c360)} vs ${fmt(e370)}`,
      });

      // ── 3. Aktiv komponentlari yig'indisi = 120 ──
      // 10+20+30+42+52+62+72+80+90+102+110
      const comp =
        bc(b, "10") + bc(b, "20") + bc(b, "30") + bc(b, "42") + bc(b, "52") +
        bc(b, "62") + bc(b, "72") + bc(b, "80") + bc(b, "90") + bc(b, "102") +
        bc(b, "110");
      checks.push({
        name: "Aktiv komponentlari = 120",
        ok: relDiff(comp, a120) < 0.1,
        detail: `Σ=${fmt(comp)} vs 120=${fmt(a120)}`,
      });

      // ── 4. Majburiyat komponentlari = 280 (210..270) ──
      const lcomp =
        bc(b, "210") + bc(b, "220") + bc(b, "230") + bc(b, "240") +
        bc(b, "250") + bc(b, "260") + bc(b, "270");
      checks.push({
        name: "Majburiyat komp. = 280",
        ok: relDiff(lcomp, l280) < 0.1,
        detail: `Σ=${fmt(lcomp)} vs 280=${fmt(l280)}`,
      });

      // ── 5. Kapital komponentlari = 360 (310+320+330+340+350) ──
      const ccomp = bc(b, "310") + bc(b, "320") + bc(b, "330") + bc(b, "340") + bc(b, "350");
      checks.push({
        name: "Kapital komp. = 360",
        ok: relDiff(ccomp, c360) < 0.1,
        detail: `Σ=${fmt(ccomp)} vs 360=${fmt(c360)}`,
      });

      // ── 6. Kredit, sof (52) = brutto (50) - zaxira (51) ──
      const net52 = bc(b, "52");
      checks.push({
        name: "Kredit sof (52=50-51)",
        ok: relDiff(net52, bc(b, "50") - bc(b, "51")) < 0.1,
        detail: `52=${fmt(net52)} 50-51=${fmt(bc(b, "50") - bc(b, "51"))}`,
      });

      // ── 7. Kredit portfeli (loanItem) qoldig'i ≈ balans 50/52 ──
      const loanBalSum = num(la?._sum.balance);
      const loanCnt = la?._count._all ?? 0;
      // qoldiq odatda 52 (sof) yoki 50 (brutto) ga yaqin
      const closeToGross = relDiff(loanBalSum, bc(b, "50"));
      const closeToNet = relDiff(loanBalSum, net52);
      checks.push({
        name: "Loan portfeli ≈ balans(50/52)",
        ok: Math.min(closeToGross, closeToNet) < 5,
        detail: `Σqoldiq=${fmt(loanBalSum)} (${loanCnt} kredit) | 50=${fmt(bc(b, "50"))} 52=${fmt(net52)} | farq ${Math.min(closeToGross, closeToNet).toFixed(1)}%`,
      });

      // ── 8. Loan zaxira yig'indisi ≈ balans 51 ──
      const loanResSum = num(la?._sum.reserve);
      checks.push({
        name: "Loan zaxira ≈ balans(51)",
        ok: relDiff(loanResSum, bc(b, "51")) < 15 || (loanResSum === 0 && bc(b, "51") === 0),
        detail: `Σzaxira=${fmt(loanResSum)} vs 51=${fmt(bc(b, "51"))}`,
      });

      // ── 9. Jalb etilgan (borrowedFund) qoldig'i ≈ balans 210 ──
      const borrSum = num(ba?._sum.balance);
      const borrCnt = ba?._count._all ?? 0;
      checks.push({
        name: "Jalb etilgan ≈ balans(210)",
        ok: relDiff(borrSum, bc(b, "210")) < 10 || (borrSum === 0 && bc(b, "210") === 0),
        detail: `Σqoldiq=${fmt(borrSum)} (${borrCnt}) vs 210=${fmt(bc(b, "210"))}`,
      });

      // ── 10. Foyda-zarar zanjiri: sof foizli (310=180-270) ──
      const inc310 = bc(i, "310");
      checks.push({
        name: "Sof foizli (310=180-270)",
        ok: relDiff(inc310, bc(i, "180") - bc(i, "270")) < 0.5,
        detail: `310=${fmt(inc310)} 180-270=${fmt(bc(i, "180") - bc(i, "270"))}`,
      });

      // ── 11. Sof foyda (1200) > 0 va balans 350 (joriy yil foydasi) bilan bog'liq ──
      const profit1200 = bc(i, "1200");
      checks.push({
        name: "Sof foyda (1200) mavjud",
        ok: profit1200 !== 0,
        detail: `1200=${fmt(profit1200)} | balans 350=${fmt(bc(b, "350"))}`,
      });

      // ── 12. Day-over-day: aktiv keskin sakramaganmi (<25%) ──
      if (prev) {
        const prevA = bc(prev.balanceLines, "120");
        const jump = relDiff(a120, prevA);
        checks.push({
          name: "Kunlik o'zgarish (<25%)",
          ok: jump < 25,
          detail: `${fmt(prevA)} → ${fmt(a120)} (${jump.toFixed(1)}%)`,
        });
      }

      // Natijani chiqarish
      const bad = checks.filter((c) => !c.ok);
      totalChecks += checks.length;
      failedChecks += bad.length;
      if (bad.length === 0) {
        console.log(`  ✓ ${date}  ${checks.length}/${checks.length} tekshiruv OK · aktiv=${fmt(a120)}`);
      } else {
        console.log(`  ✗ ${date}  ${checks.length - bad.length}/${checks.length} OK — MUAMMO:`);
        for (const c of bad) {
          console.log(`       ⚠ ${c.name}: ${c.detail}`);
          failures.push(`${cname} ${date}: ${c.name} (${c.detail})`);
        }
      }
      prev = r;
    }
  }

  console.log(`\n${"━".repeat(70)}`);
  console.log(`YAKUNIY: ${totalChecks - failedChecks}/${totalChecks} tekshiruv o'tdi`);
  if (failedChecks === 0) {
    console.log("✅ DATA TO'LIQ TO'G'RI — barcha buxgalteriya tengliklari mos keldi");
  } else {
    console.log(`⚠ ${failedChecks} ta nomuvofiqlik:`);
    for (const f of failures.slice(0, 30)) console.log("  - " + f);
  }
  await prisma.$disconnect();
}
main();
