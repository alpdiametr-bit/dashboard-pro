/* eslint-disable */
// Barcha test fayllarni API orqali yuklab, tasdiqlaydi.
// Dev server http://localhost:3000 da ishlashi kerak.
import * as fs from "fs";
import * as path from "path";

const BASE = "http://localhost:3000";
const DL = path.join(__dirname, "..", "info", "test-reports");
const LOGIN = process.env.SEED_ADMIN_LOGIN || "admin";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";

let cookie = "";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
  });
  if (!res.ok) throw new Error("Login muvaffaqiyatsiz: " + res.status);
  cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  if (!cookie) throw new Error("Cookie olinmadi");
  console.log("✓ Login OK");
}

async function uploadOne(file: string, attempt = 1): Promise<boolean> {
  try {
    const buf = fs.readFileSync(path.join(DL, file));
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(buf)]), file);
    fd.append("force", "true"); // dublikat sana bo'lsa — almashtir

    const res = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: fd,
    });
    const data = await safeJson(res);
    if (!res.ok || !data) {
      throw new Error(data?.error ?? `status ${res.status}`);
    }
    const conf = await fetch(`${BASE}/api/reports/${data.reportId}/confirm`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    const s = data.summary;
    console.log(
      `  OK ${file.padEnd(24)} ${s.company.includes("CLEVER") ? "CLEVER" : "CashU "} ${new Date(s.reportDate).toISOString().slice(0, 10)} aktiv=${Math.round(s.assets / 1000)}mln loans=${s.loans}${conf.ok ? " [tasdiq]" : " [tasdiq XATO]"}`,
    );
    return true;
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800));
      return uploadOne(file, attempt + 1);
    }
    console.log(`  XATO ${file}: ${(e as Error).message}`);
    return false;
  }
}

async function main() {
  await login();
  const files = fs
    .readdirSync(DL)
    .filter((f) => /^\d{2}\.\d{2}\.\d{4} (Cash U|CLEVER|Clever)\.xls$/i.test(f))
    .sort();
  console.log(`\n${files.length} ta fayl yuklanmoqda...\n`);
  let ok = 0;
  for (const f of files) {
    if (await uploadOne(f)) ok++;
    await new Promise((r) => setTimeout(r, 300)); // dev serverni bo'shatish
  }
  console.log(`\nYAKUN: ${ok}/${files.length} yuklandi va tasdiqlandi`);
}

main().catch((e) => {
  console.error("XATO:", e.message);
  process.exit(1);
});
