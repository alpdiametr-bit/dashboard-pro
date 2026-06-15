/* eslint-disable */
// Test harness — Downloads'dagi MFO Excel fayllarini parse qilib,
// chala (incomplete) ma'lumotni aniqlaydi. tsx bilan ishga tushiriladi.
import * as fs from "fs";
import * as path from "path";
import { parseWorkbook } from "../src/lib/excel";

const DL = path.join(__dirname, "..", "info", "test-reports");

function pad(s: string, n: number) {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

const files = fs
  .readdirSync(DL)
  .filter((f) => /^\d{2}\.\d{2}\.\d{4} (Cash U|CLEVER|Clever)\.xls$/i.test(f))
  .sort();

console.log(`Topildi: ${files.length} ta fayl\n`);
console.log(
  pad("FAYL", 26) +
    pad("FIRMA", 10) +
    pad("SANA", 12) +
    pad("sheets", 7) +
    pad("bal", 5) +
    pad("inc", 5) +
    pad("ledger", 8) +
    pad("loans", 7) +
    pad("borr", 6) +
    pad("norm", 6) +
    "OGOHLANTIRISH",
);
console.log("-".repeat(120));

type Issue = { file: string; problems: string[] };
const issues: Issue[] = [];

for (const f of files) {
  const buf = fs.readFileSync(path.join(DL, f));
  let p;
  try {
    p = parseWorkbook(buf);
  } catch (e) {
    issues.push({ file: f, problems: ["PARSE XATO: " + (e as Error).message] });
    console.log(pad(f, 26) + "PARSE XATO: " + (e as Error).message);
    continue;
  }

  const problems: string[] = [];
  if (!p.company.name) problems.push("firma nomi YO'Q");
  if (!p.meta.reportDate) problems.push("sana YO'Q");
  if (p.balance.length === 0) problems.push("balans BO'SH");
  if (p.income.length === 0) problems.push("foyda-zarar BO'SH");
  if (p.ledger.length === 0) problems.push("konsolidatsiya BO'SH");
  if (p.loans.length === 0) problems.push("kredit portfeli BO'SH");
  if (p.borrowed.length === 0) problems.push("jalb etilgan BO'SH");
  if (p.norms.length === 0) problems.push("normativlar BO'SH");

  // Balans: jami aktivlar (120) topiladimi va > 0 mi?
  const assets = p.balance.find((b) => b.code === "120")?.value ?? 0;
  const liab = p.balance.find((b) => b.code === "280")?.value ?? 0;
  const cap = p.balance.find((b) => b.code === "360")?.value ?? 0;
  const eq370 = p.balance.find((b) => b.code === "370")?.value ?? 0;
  if (assets <= 0) problems.push("aktiv(120)=0");
  // Balans tenglik: 120 (aktiv) == 370 (majb+kapital)
  if (assets > 0 && eq370 > 0 && Math.abs(assets - eq370) > 1)
    problems.push(`balans teng EMAS 120=${assets} 370=${eq370}`);
  // 280+360 == 370
  if (eq370 > 0 && Math.abs(liab + cap - eq370) > 1)
    problems.push(`280+360≠370 (${liab}+${cap}≠${eq370})`);

  // Foyda: sof foyda (1200) topiladimi?
  const profit = p.income.find((i) => i.code === "1200");
  if (!profit) problems.push("sof foyda(1200) YO'Q");

  // Kredit portfeli: balanssiz qator (qarzdor bor, summa 0) ko'pmi?
  const zeroAmt = p.loans.filter((l) => l.amount === 0 && l.balance === 0).length;
  if (p.loans.length > 0 && zeroAmt / p.loans.length > 0.5)
    problems.push(`loans ${zeroAmt}/${p.loans.length} summa=0`);
  // Qarzdor nomsiz qator
  const noName = p.loans.filter((l) => !l.borrowerName || l.borrowerName.length < 3).length;
  if (noName > 0) problems.push(`${noName} loan nomsiz`);
  // Sana parse: berilgan sana yo'qlar ulushi
  const noDate = p.loans.filter((l) => !l.issuedAt).length;
  if (p.loans.length > 0 && noDate / p.loans.length > 0.3)
    problems.push(`${noDate}/${p.loans.length} loan sanasiz`);

  const firmaShort = p.company.name.includes("CLEVER")
    ? "CLEVER"
    : p.company.name.toLowerCase().includes("cash")
      ? "CashU"
      : p.company.name.slice(0, 8);

  console.log(
    pad(f, 26) +
      pad(firmaShort, 10) +
      pad(
        p.meta.reportDate ? p.meta.reportDate.toISOString().slice(0, 10) : "—",
        12,
      ) +
      pad(String(p.sheets.length), 7) +
      pad(String(p.balance.length), 5) +
      pad(String(p.income.length), 5) +
      pad(String(p.ledger.length), 8) +
      pad(String(p.loans.length), 7) +
      pad(String(p.borrowed.length), 6) +
      pad(String(p.norms.length), 6) +
      (problems.length ? "⚠ " + problems.join("; ") : "✓ to'liq"),
  );

  if (problems.length) issues.push({ file: f, problems });
}

console.log("\n" + "=".repeat(60));
if (issues.length === 0) {
  console.log("✅ HAMMA FAYL TO'LIQ — chala data yo'q");
} else {
  console.log(`⚠ ${issues.length}/${files.length} faylda muammo:`);
  for (const i of issues) {
    console.log(`  ${i.file}: ${i.problems.join("; ")}`);
  }
}
