/* eslint-disable */
import * as fs from "fs";
import * as path from "path";
import { parseWorkbook } from "../src/lib/excel";

const DL = path.join(__dirname, "..", "info", "test-reports");
const num = (v: any) => (v == null ? 0 : Number(v));
const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

const files = fs
  .readdirSync(DL)
  .filter((f) => /\.xls$/i.test(f))
  .sort();

console.log("FAYL".padEnd(26) + "CommonData firma".padEnd(12) + "sana".padEnd(12) + "aktiv(120)");
console.log("-".repeat(70));
for (const f of files) {
  const p = parseWorkbook(fs.readFileSync(path.join(DL, f)));
  const a120 = num(p.balance.find((b) => b.code === "120")?.value);
  const firma = p.company.name.includes("CLEVER") ? "CLEVER" : p.company.name.toLowerCase().includes("cash") ? "CashU" : "?";
  const date = p.meta.reportDate?.toISOString().slice(0, 10) ?? "—";
  // Fayl nomidagi firma vs CommonData firma mos kelmasa belgilash
  const fileFirma = /cash/i.test(f) ? "CashU" : /clever/i.test(f) ? "CLEVER" : "?";
  const mismatch = firma !== fileFirma ? "  ⚠ NOM-MOS EMAS!" : "";
  console.log(f.padEnd(26) + firma.padEnd(12) + date.padEnd(12) + fmt(a120) + mismatch);
}
