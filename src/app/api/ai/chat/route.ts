import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import {
  schemaText,
  buildCatalog,
  catalogText,
  fieldType,
  fieldLabel,
} from "@/lib/ai-schema";
import { runQuery, previewDelete, QueryError, type QuerySpec } from "@/lib/ai-query";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatCompact } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OpenAI-mos sozlama (.env):
//   AI_API_KEY (yoki OPENAI_API_KEY / GROQ_API_KEY) — majburiy
//   AI_BASE_URL — ixtiyoriy (default Groq: https://api.groq.com/openai/v1)
//   AI_MODEL    — ixtiyoriy (default openai/gpt-oss-120b)
const AI_API_KEY =
  process.env.AI_API_KEY ||
  process.env.GROQ_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "";
const AI_BASE_URL = (
  process.env.AI_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.groq.com/openai/v1"
).replace(/\/+$/, "");
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-oss-120b";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  conversationUid: z.string().min(8).max(64).optional(),
});

function systemPrompt(catalog: string): string {
  return `Sen "Dashboard Pro" mikromoliya (MFO) tahliliy platformasining AI yordamchisisan.
MUHIM QOIDA: Senga HECH QANDAY moliyaviy DATA berilmaydi. Sen faqat ma'lumotlar bazasi
TUZILMASI (Prisma model) va KATALOG (firma nomlari, mavjud sanalar) asosida ishlaysan.
Foydalanuvchi savoliga javob berish uchun kerakli MA'LUMOTNI BAZADAN olib kelishni
REJALASHTIRASAN — ya'ni qaysi modeldan, qaysi filtr/saralash bilan so'rov yuborishni
JSON ko'rinishida qaytarasan. Sonlarni O'ZING o'ylab topma — ularni baza qaytaradi.

=== BAZA TUZILMASI ===
${schemaText()}

=== KATALOG (real, joriy) ===
${catalog}

=== JAVOB FORMATI (qat'iy JSON) ===
{
  "reply": "Foydalanuvchiga 1-2 jumlalik o'zbekcha tabiiy javob: nima so'ralgani va nima olib kelinayotganini tushuntir. Aniq sonlarni server o'zi qo'shadi — sen umumiy izoh ber.",
  "query": {
    "model": "<model nomi>",
    "operation": "findMany | groupBy | aggregate | count | companyReport",
    "where": { },
    "select": ["field"],
    "orderBy": [{"field":"...","dir":"desc"}],
    "take": 50,
    "by": ["field"],
    "sum": ["numericField"],
    "avg": ["numericField"],
    "metrics": [ {"key":"netProfit","label":"Sof foyda","source":"incomeLine","agg":"value","code":"1200"} ]
  },
  "chart": { "type": "bar|line|area|pie", "xField": "...", "yField": "...", "title": "..." },
  "export": false,
  "danger": { "action": "delete", "where": { }, "reason": "Nima o'chiriladi" }
}

QOIDALAR:
- SANA: kontekstdagi "BUGUNGI SANA" ni ishlat (u tizimdan keladi). "Bu oy"=joriy
  yil-oy 01..oxirgi kun. Foydalanuvchi sana aytmasa, eng so'nggi mavjud sanani ol.
  ASLO o'zingdan sana o'ylab topma.
- where ichida har doim NESTED obyekt ishlat, nuqtali kalit EMAS. Sana/firma kabi
  maydonlar line modelda bo'lmasa ham bevosita yozaver — tizim avtomatik report
  relation ostiga joylaydi. Masalan incomeLine uchun:
  {"code":"1200","reportDate":{"gte":"2026-06-01","lte":"2026-06-30"},"companyId":{...}} — TO'G'RI.
- Aktiv=balanceLine code "120", kapital "360", kredit "50"; sof foyda=incomeLine code "1200".
- KO'P JADVALNI BIRLASHTIRGAN FIRMA HISOBOTI (masalan: har firma nomi+hududi+sof foyda+
  berilgan kredit summasi+mijozlar soni): operation="companyReport". Bu har firma uchun
  oraliqdagi eng so'nggi hisobotdan metrikalarni oladi. company+region ustunlari avtomatik.
  metrics[] manbalari: incomeLine/balanceLine (agg="value"+code), loanItem/ledgerAccount/
  borrowedFund (agg="sum"+field yoki agg="count"). Misol:
  {"operation":"companyReport","where":{"reportDate":{"gte":"2026-06-01","lte":"2026-06-14"}},
   "metrics":[
     {"key":"netProfit","label":"Sof foyda","source":"incomeLine","agg":"value","code":"1200"},
     {"key":"loansIssued","label":"Berilgan kredit","source":"loanItem","agg":"sum","field":"amount"},
     {"key":"borrowers","label":"Mijozlar soni","source":"loanItem","agg":"count"}
   ]}
- BITTA ko'rsatkich har firma bo'yicha: operation="groupBy", by=["companyId"],
  where={"code":"1200","reportDate":{oraliq}}, sum=["value"]. "company" ustuni avtomatik.
- Bir firma bir necha sana dinamikasi: model=balanceLine/incomeLine, operation="findMany",
  where={"code":"120","companyId":N,"reportDate":{oraliq}}, select=["value","reportDate"],
  orderBy=[{"field":"reportDate","dir":"asc"}]. chart: line/area, xField="reportDate", yField="value".
- Diagramma faqat son taqqoslash/dinamika bo'lsa qo'sh (vaqt qatori=line/area,
  firmalararo taqqoslash=bar, ulush=pie). xField/yField natija ustunlari nomi bo'lsin.
- findMany'da select'ni TO'LIQ ber (foydali ustunlar: firma, sana, nom, summa,
  qoldiq, foiz...). Bo'sh qoldirsang tizim standart boy ustunlarni qo'yadi.
- O'chirishni FAQAT foydalanuvchi ANIQ so'raganda "danger" ga qo'y.
- Baza so'rovi kerak bo'lmasa (oddiy suhbat), faqat "reply" qaytar.
- FAQAT JSON qaytar, boshqa matn yo'q.`;
}

/** aggregate/groupBy natijalarini tekis (flat) qatorlarga aylantirish */
function flattenRows(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (k === "_sum" || k === "_avg") {
        for (const [f, val] of Object.entries(v as Record<string, unknown>))
          out[f] = val;
      } else if (k === "_count") {
        out.count =
          typeof v === "number"
            ? v
            : ((v as Record<string, unknown>)?._all ?? 0);
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

type Column = { key: string; label: string; type: string };

function buildColumns(
  model: string,
  rows: Record<string, unknown>[],
  labels?: Record<string, string>,
): Column[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  // Birinchi bo'sh bo'lmagan qiymatni topish (tur aniqlash uchun)
  const sampleOf = (k: string): unknown => {
    for (const r of rows) if (r[k] !== null && r[k] !== undefined && r[k] !== "") return r[k];
    return rows[0][k];
  };
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  return keys.map((k) => {
    let type = fieldType(model, k) ?? "string";
    const sample = sampleOf(k);
    if (k === "count") type = "int";
    // ISO sana satrini avtomatik "date" deb belgilash (companyReport/groupBy uchun)
    if (typeof sample === "string" && ISO.test(sample)) type = "date";
    else if (type === "string" && typeof sample === "number") type = "decimal";
    const label = labels?.[k] ?? fieldLabel(k);
    return { key: k, label, type: String(type) };
  });
}

/**
 * Diagramma maydonlarini natijaga moslaydi. xField/yField mavjud bo'lmasa —
 * eng mantiqiy ustunlarni tanlaydi. Mos topilmasa null (diagramma chizilmaydi).
 */
function fixChart(
  chart: { type: string; xField: string; yField: string; title?: string },
  columns: Column[],
  numericFields: string[],
): { type: string; xField: string; yField: string; title?: string } | null {
  const keys = new Set(columns.map((c) => c.key));
  const numericKeys = columns
    .filter((c) => c.type === "decimal" || c.type === "int")
    .map((c) => c.key);
  const textKeys = columns
    .filter((c) => c.type !== "decimal" && c.type !== "int")
    .map((c) => c.key);

  let x = chart.xField;
  let y = chart.yField;

  // X o'qini to'g'rilash: companyId o'rniga "company" nomi afzal
  if (x === "companyId" && keys.has("company")) x = "company";
  if (!keys.has(x)) {
    // matnli/sana ustunni tanla (count va raqamlardan tashqari)
    x = textKeys.find((k) => k !== "count") ?? columns[0]?.key ?? x;
  }

  // Y o'qini to'g'rilash: raqamli ustun bo'lishi kerak
  if (!keys.has(y) || !numericKeys.includes(y)) {
    y =
      numericFields.find((f) => keys.has(f)) ??
      numericKeys.find((k) => k !== x && k !== "count") ??
      numericKeys[0] ??
      "";
  }

  if (!x || !y || !keys.has(x) || !keys.has(y)) return null;
  const type = ["bar", "line", "area", "pie"].includes(chart.type)
    ? chart.type
    : "bar";
  return { type, xField: x, yField: y, title: chart.title };
}

/**
 * Natijadan SERVER tomonda matnli xulosa yasaydi (AI ga DATA yubormasdan).
 * Jami, eng katta/kichik, o'rtacha, qator soni — chat dek qisqa javob.
 */
function summarize(
  result: {
    model: string;
    operation: string;
    columns: Column[];
    rows: Record<string, unknown>[];
    total: number;
    numericFields: string[];
  },
): string {
  const { rows, columns, total, numericFields } = result;
  if (!rows.length) return "Bu shartlarga mos ma'lumot topilmadi.";

  const parts: string[] = [];
  parts.push(`Jami **${total.toLocaleString("ru-RU")}** ta yozuv topildi.`);

  // Matnli yorliq ustuni (firma/qarzdor/kod) — eng katta qatorni nomlash uchun
  const labelKey =
    columns.find((c) => ["company", "name", "borrowerName", "creditorName", "label", "indicator", "accountNo"].includes(c.key))?.key ??
    columns.find((c) => c.type === "string")?.key ??
    null;

  // Asosiy raqamli ustun (sum/value/balance/amount...)
  const numKey =
    numericFields[0] ??
    columns.find((c) => c.type === "decimal")?.key ??
    columns.find((c) => c.type === "int" && c.key !== "id")?.key ??
    null;

  if (numKey) {
    const nums = rows
      .map((r) => Number(r[numKey] ?? 0))
      .filter((n) => !isNaN(n));
    if (nums.length) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = sum / nums.length;
      const maxIdx = nums.indexOf(Math.max(...nums));
      const label = fieldLabel(numKey);
      parts.push(`${label} jami: **${formatMoney(sum)}** (o'rtacha ${formatCompact(avg)}).`);
      if (labelKey && rows[maxIdx]) {
        const who = String(rows[maxIdx][labelKey] ?? "");
        if (who)
          parts.push(`Eng yuqori: **${who}** — ${formatMoney(nums[maxIdx])}.`);
      }
    }
  }

  return parts.join(" ");
}

/** Chat yozishmasini (savol + javob + natija) bazaga saqlaydi — har ehtimolga. */
async function persistChat(
  conversationUid: string | undefined,
  adminId: number | null,
  userText: string,
  assistant: {
    content: string;
    querySpec?: unknown;
    result?: unknown;
    chart?: unknown;
    model: string;
  },
): Promise<void> {
  try {
    const uid =
      conversationUid ||
      `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const conv = await prisma.aiConversation.upsert({
      where: { uid },
      create: { uid, adminId, title: userText.slice(0, 120) },
      update: { adminId },
    });

    // Natijani saqlashda hajmni cheklaymiz (max_allowed_packet'dan oshmasin) —
    // faqat ilk 200 qator + jami soni saqlanadi (UI qayta yuklash uchun yetarli).
    let storedResult: unknown = assistant.result;
    if (
      assistant.result &&
      typeof assistant.result === "object" &&
      Array.isArray((assistant.result as { rows?: unknown[] }).rows)
    ) {
      const r = assistant.result as {
        rows: unknown[];
        total?: number;
        [k: string]: unknown;
      };
      storedResult = { ...r, rows: r.rows.slice(0, 200) };
    }

    await prisma.aiMessage.createMany({
      data: [
        {
          conversationId: conv.id,
          role: "user",
          content: userText.slice(0, 8000),
        },
        {
          conversationId: conv.id,
          role: "assistant",
          content: assistant.content.slice(0, 8000),
          querySpec: (assistant.querySpec ?? undefined) as never,
          result: (storedResult ?? undefined) as never,
          chart: (assistant.chart ?? undefined) as never,
          model: assistant.model,
        },
      ],
    });
  } catch (e) {
    // saqlash asosiy oqimni to'xtatmasin, lekin loglaymiz
    console.error("AI chat saqlashda xato:", e);
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  if (!AI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI sozlanmagan. .env faylga AI_API_KEY qo'shing. Bepul kalitni https://console.groq.com/keys dan oling.",
        code: "NO_KEY",
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });

  const catalog = await buildCatalog();

  const aiRes = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(catalogText(catalog)) },
        ...parsed.data.messages,
      ],
    }),
  }).catch(() => null);

  if (!aiRes || !aiRes.ok) {
    const detail = aiRes ? await aiRes.text().catch(() => "") : "";
    return NextResponse.json(
      {
        error: "AI provayderga ulanib bo'lmadi.",
        status: aiRes?.status ?? 0,
        detail: detail.slice(0, 400),
      },
      { status: 502 },
    );
  }

  const aiJson = await aiRes.json().catch(() => null);
  const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
  let plan: {
    reply?: string;
    query?: QuerySpec;
    chart?: { type: string; xField: string; yField: string; title?: string };
    export?: boolean;
    danger?: { action: string; where: Record<string, unknown>; reason?: string };
  };
  try {
    plan = JSON.parse(content);
  } catch {
    return NextResponse.json({
      reply: content || "Javobni shakllantira olmadim. Savolni aniqroq bering.",
    });
  }

  const out: Record<string, unknown> = { reply: plan.reply || "" };
  const userText =
    [...parsed.data.messages].reverse().find((m) => m.role === "user")
      ?.content ?? "";

  // O'CHIRISH — preview qaytar (o'chirmaydi!)
  if (plan.danger?.action === "delete" && plan.danger.where) {
    try {
      const preview = await previewDelete(plan.danger.where);
      out.danger = {
        reason: plan.danger.reason ?? "Tanlangan hisobotlar o'chiriladi",
        where: plan.danger.where,
        preview,
        count: preview.length,
      };
    } catch (e) {
      out.danger = {
        error: e instanceof QueryError ? e.message : "O'chirish rejasi xato",
      };
    }
    await persistChat(parsed.data.conversationUid, session.adminId, userText, {
      content: String(out.reply || ""),
      querySpec: plan.danger,
      model: AI_MODEL,
    });
    return NextResponse.json(out);
  }

  // BAZA SO'ROVI — xavfsiz bajarish
  if (plan.query) {
    try {
      const result = await runQuery(plan.query);
      const rows = flattenRows(result.rows);
      // companyReport — metrika sarlavhalarini ustun nomi qilamiz
      const metricLabels: Record<string, string> = {
        company: "Firma",
        region: "Hudud",
      };
      if (plan.query.operation === "companyReport" && plan.query.metrics) {
        for (const m of plan.query.metrics)
          if (m.label) metricLabels[m.key] = m.label;
      }
      const columns = buildColumns(result.model, rows, metricLabels);
      const resultPayload = {
        model: result.model,
        operation: result.operation,
        columns,
        rows,
        total: result.total,
        numericFields: result.numericFields,
      };
      out.result = resultPayload;
      out.querySpec = plan.query;
      if (plan.chart && rows.length) {
        const fixed = fixChart(plan.chart, columns, result.numericFields);
        if (fixed) out.chart = fixed;
      }
      if (plan.export) out.export = true;

      // SERVER xulosasi (AI ga data yubormasdan) — chat dek matnli javob
      const summary = summarize(resultPayload);
      out.reply = plan.reply ? `${plan.reply}\n\n${summary}` : summary;
    } catch (e) {
      out.queryError =
        e instanceof QueryError
          ? e.message
          : "So'rovni bajarishda xatolik yuz berdi.";
    }
  }

  // Chat yozishmasini DB ga saqlash (har ehtimolga)
  await persistChat(parsed.data.conversationUid, session.adminId, userText, {
    content: String(out.reply || out.queryError || ""),
    querySpec: out.querySpec,
    result: out.result,
    chart: out.chart,
    model: AI_MODEL,
  });

  return NextResponse.json(out);
}
