/* eslint-disable */
import * as fs from "fs";
import * as path from "path";
import { parseWorkbook } from "../src/lib/excel";

const DL = path.join(__dirname, "..", "info", "test-reports");
const num = (v: any) => (v == null ? 0 : Number(v));

// Shubhali fayllar — Cash U 08-09 atrofidagilar
const suspects = [
  "07.05.2026 Cash U.xls",
  "08.05.2026 Cash U.xls",
  "09.06.2026 Cash U.xls",
  "08.06.2026 CLEVER.xls",
];

for (const f of suspects) {
  const fp = path.join(DL, f);
  if (!fs.existsSync(fp)) {
    console.log(`${f}: TOPILMADI`);
    continue;
  }
  const p = parseWorkbook(fs.readFileSync(fp));
  const a120 = num(p.balance.find((b) => b.code === "120")?.value);
  console.log(
    `${f.padEnd(24)} → CommonData firma: "${p.company.name}" | sana: ${p.meta.reportDate?.toISOString().slice(0, 10)} | aktiv(120)=${new Intl.NumberFormat("ru-RU").format(a120)} | loans=${p.loans.length}`,
  );
}
