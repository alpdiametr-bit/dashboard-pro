import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { MODELS, isNumericField, fieldType, DEFAULT_SELECT } from "./ai-schema";

// ─────────────────────────────────────────────────────────────────────────
// XAVFSIZ so'rov bajaruvchi. AI bergan QuerySpec'ni WHITELIST bo'yicha
// tekshiradi va Prisma orqali READ-ONLY bajaradi. Ruxsat etilmagan model/
// maydon/operator — rad etiladi. Hech qachon eval yoki raw SQL ishlatmaydi.
// ─────────────────────────────────────────────────────────────────────────

export type Op =
  | "findMany"
  | "groupBy"
  | "aggregate"
  | "count"
  | "companyReport";

export type OrderBy = { field: string; dir: "asc" | "desc" };

/** Firma hisoboti uchun bitta ko'rsatkich (metrika) */
export type ReportMetric = {
  key: string; // natija ustun kaliti
  label?: string; // ustun sarlavhasi
  source: string; // balanceLine | incomeLine | loanItem | ledgerAccount | borrowedFund | norm
  agg: "value" | "sum" | "count"; // value=kod bo'yicha, sum=yig'indi, count=qator soni
  field?: string; // sum uchun raqamli maydon (amount, balance, value...)
  code?: string; // value uchun kod (1200, 120...)
};

export type QuerySpec = {
  model: string;
  operation: Op;
  where?: Record<string, unknown>;
  select?: string[];
  orderBy?: OrderBy[];
  take?: number;
  by?: string[]; // groupBy
  sum?: string[]; // _sum maydonlari
  avg?: string[]; // _avg maydonlari
  count?: boolean; // _count yoki count
  metrics?: ReportMetric[]; // companyReport uchun
};

const MAX_TAKE = 500;
const MAX_EXPORT_TAKE = 5000;

const ALLOWED_OPERATORS = new Set([
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "endsWith",
]);

export class QueryError extends Error {}

function coerceValue(
  type: ReturnType<typeof fieldType>,
  v: unknown,
): unknown {
  if (v === null) return null;
  if (type === "date" && typeof v === "string") {
    // yyyy-mm-dd yoki ISO — UTC yarim tun (@db.Date TZ-safe)
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d;
  }
  if ((type === "int" || type === "decimal") && typeof v === "string") {
    const n = Number(v);
    return isNaN(n) ? v : n;
  }
  return v;
}

/**
 * Maydonni model ichida (yoki relation orqali) topadi.
 * AI noto'g'ri joylashtirsa ham (masalan loanItem.reportDate yoki companyId)
 * relation zanjiri bo'ylab avtomatik topib, to'g'ri yo'lni qaytaradi.
 * @returns relation yo'li (masalan ["report"]) + maydon turi, yoki null.
 */
function resolveField(
  model: string,
  field: string,
  depth = 0,
): { path: string[]; type: ReturnType<typeof fieldType> } | null {
  if (depth > 3) return null;
  const def = MODELS[model];
  if (!def) return null;
  // To'g'ridan-to'g'ri maydon
  if (def.fields[field]) return { path: [], type: def.fields[field] };
  // Relationlar bo'ylab qidirish
  if (def.relations) {
    for (const [relKey, relModel] of Object.entries(def.relations)) {
      const found = resolveField(relModel, field, depth + 1);
      if (found) return { path: [relKey, ...found.path], type: found.type };
    }
  }
  return null;
}

/** path bo'yicha nested where obyekti yasaydi: ["report"], {x} -> {report:{x}} */
function nestWhere(
  path: string[],
  leaf: Record<string, unknown>,
): Record<string, unknown> {
  if (!path.length) return leaf;
  let obj: Record<string, unknown> = leaf;
  for (let i = path.length - 1; i >= 0; i--) obj = { [path[i]]: obj };
  return obj;
}

/** ikki where obyektini chuqur birlashtiradi (relation kalitlari ustma-ust) */
function mergeWhere(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [k, v] of Object.entries(source)) {
    if (
      k in target &&
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof target[k] === "object" &&
      target[k] !== null &&
      !Array.isArray(target[k])
    ) {
      mergeWhere(
        target[k] as Record<string, unknown>,
        v as Record<string, unknown>,
      );
    } else {
      target[k] = v;
    }
  }
}

/** maydon qiymatini (skalyar yoki operatorli) Prisma filtriga aylantiradi */
function buildLeaf(
  ftype: ReturnType<typeof fieldType>,
  raw: unknown,
): unknown {
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const filter: Record<string, unknown> = {};
    for (const [op, val] of Object.entries(raw as Record<string, unknown>)) {
      if (!ALLOWED_OPERATORS.has(op))
        throw new QueryError(`Ruxsat etilmagan operator: ${op}`);
      if (op === "in" || op === "notIn") {
        const list = Array.isArray(val) ? val : [val];
        filter[op] = list.map((x) => coerceValue(ftype, x));
      } else {
        filter[op] = coerceValue(ftype, val);
      }
    }
    return filter;
  }
  return coerceValue(ftype, raw);
}

/** where obyektini rekursiv tekshiradi va Prisma where ga aylantiradi */
function validateWhere(
  model: string,
  where: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth > 4) throw new QueryError("where juda chuqur");
  const def = MODELS[model];
  if (!def) throw new QueryError(`Noma'lum model: ${model}`);
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(where)) {
    // Mantiqiy operatorlar
    if (key === "AND" || key === "OR" || key === "NOT") {
      const arr = Array.isArray(raw) ? raw : [raw];
      out[key] = arr.map((w) =>
        validateWhere(model, w as Record<string, unknown>, depth + 1),
      );
      continue;
    }

    // Nuqtali yo'l: "report.companyId" -> relation zanjiri
    if (key.includes(".")) {
      const parts = key.split(".");
      const field = parts[parts.length - 1];
      const resolved = resolveField(model, field);
      if (!resolved)
        throw new QueryError(`Ruxsat etilmagan maydon: ${model}.${key}`);
      mergeWhere(out, nestWhere(resolved.path, { [field]: buildLeaf(resolved.type, raw) }));
      continue;
    }

    // Relation filtr (report / company)
    const rel = def.relations?.[key];
    if (rel) {
      const nested = validateWhere(
        rel,
        raw as Record<string, unknown>,
        depth + 1,
      );
      if (key in out)
        mergeWhere(out[key] as Record<string, unknown>, nested);
      else out[key] = nested;
      continue;
    }

    // Skalyar maydon — bevosita yoki relation orqali (avtomatik to'g'rilash)
    const ftype = def.fields[key];
    if (ftype) {
      out[key] = buildLeaf(ftype, raw);
      continue;
    }

    // Maydon bu modelda yo'q — relation orqali topishga urinish
    const resolved = resolveField(model, key);
    if (!resolved)
      throw new QueryError(`Ruxsat etilmagan maydon: ${model}.${key}`);
    mergeWhere(out, nestWhere(resolved.path, { [key]: buildLeaf(resolved.type, raw) }));
  }
  return out;
}

function validateNumeric(model: string, fields: string[] | undefined): string[] {
  if (!fields || !fields.length) return [];
  for (const f of fields)
    if (!isNumericField(model, f))
      throw new QueryError(`${model}.${f} raqamli emas (sum/avg uchun)`);
  return fields;
}

/** Prisma Decimal/Date ni JSON-xavfsiz qiymatga aylantirish (rekursiv) */
export function toPlain(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Prisma.Decimal) return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(toPlain);
  if (typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>))
      o[k] = toPlain(val);
    return o;
  }
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function delegate(model: string): any {
  const def = MODELS[model];
  if (!def) throw new QueryError(`Noma'lum model: ${model}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (prisma as any)[def.delegate];
  if (!d) throw new QueryError(`Delegate topilmadi: ${model}`);
  return d;
}

export type QueryResult = {
  operation: Op;
  model: string;
  rows: Record<string, unknown>[];
  total: number;
  /** aggregate/groupBy uchun raqamli maydonlar ro'yxati */
  numericFields: string[];
};

// companyReport uchun ruxsat etilgan manba modellar
const REPORT_SOURCES = new Set([
  "balanceLine",
  "incomeLine",
  "loanItem",
  "ledgerAccount",
  "borrowedFund",
  "norm",
]);

/**
 * FIRMA HISOBOTI — ko'p jadvalni birlashtiradi (company + income + loan + ...).
 * Har firma uchun [from..to] oralig'idagi ENG SO'NGGI tasdiqlangan hisobotdan
 * so'ralgan metrikalarni hisoblaydi. Snapshot data uchun to'g'ri yondashuv
 * (kunlik nusxalarni qo'shib yubormaslik uchun oxirgi holatni oladi).
 */
async function runCompanyReport(spec: QuerySpec): Promise<QueryResult> {
  const metrics = spec.metrics ?? [];
  if (!metrics.length)
    throw new QueryError("companyReport uchun 'metrics' kerak");

  // Sana oralig'i (where.reportDate yoki where ichidan)
  let from: Date | undefined;
  let to: Date | undefined;
  const rd = spec.where?.reportDate as Record<string, unknown> | undefined;
  if (rd) {
    if (rd.gte) from = coerceValue("date", rd.gte) as Date;
    if (rd.lte) to = coerceValue("date", rd.lte) as Date;
    if (rd.equals) {
      from = coerceValue("date", rd.equals) as Date;
      to = from;
    }
  }

  // Firma filtri (ixtiyoriy): where.companyId
  const companyWhere: Record<string, unknown> = {};
  const cid = spec.where?.companyId;
  if (typeof cid === "number") companyWhere.id = cid;
  else if (cid && typeof cid === "object") {
    const inList = (cid as Record<string, unknown>).in;
    if (Array.isArray(inList)) companyWhere.id = { in: inList.map(Number) };
  }

  const companies = await prisma.company.findMany({
    where: companyWhere,
    select: { id: true, name: true, region: true },
    orderBy: { name: "asc" },
  });

  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  const rows: Record<string, unknown>[] = [];
  for (const c of companies) {
    // Shu firma uchun oraliqdagi eng so'nggi CONFIRMED hisobot
    const report = await prisma.report.findFirst({
      where: {
        companyId: c.id,
        status: "CONFIRMED",
        ...(Object.keys(dateFilter).length ? { reportDate: dateFilter } : {}),
      },
      orderBy: { reportDate: "desc" },
      select: { id: true, reportDate: true },
    });

    const row: Record<string, unknown> = {
      company: c.name,
      region: c.region ?? "",
    };
    if (report) row.reportDate = report.reportDate.toISOString();

    for (const m of metrics) {
      if (!REPORT_SOURCES.has(m.source))
        throw new QueryError(`Ruxsat etilmagan manba: ${m.source}`);
      if (!report) {
        row[m.key] = 0;
        continue;
      }
      row[m.key] = await computeMetric(m, report.id);
    }
    rows.push(row);
  }

  // Saralash (metrika bo'yicha)
  if (spec.orderBy?.length) {
    const ob = spec.orderBy[0];
    rows.sort((a, b) => {
      const av = Number(a[ob.field] ?? 0);
      const bv = Number(b[ob.field] ?? 0);
      return ob.dir === "asc" ? av - bv : bv - av;
    });
  }

  return {
    operation: "companyReport",
    model: "company",
    rows,
    total: rows.length,
    numericFields: metrics.map((m) => m.key),
  };
}

/** Bitta metrikani bitta hisobot uchun hisoblaydi */
async function computeMetric(m: ReportMetric, reportId: number): Promise<number> {
  if (m.agg === "value") {
    // balanceLine/incomeLine — kod bo'yicha qiymat
    if (m.source !== "balanceLine" && m.source !== "incomeLine")
      throw new QueryError(`value faqat balanceLine/incomeLine uchun`);
    if (!m.code) throw new QueryError(`value uchun 'code' kerak`);
    const line = await delegate(m.source).findFirst({
      where: { reportId, code: m.code },
      select: { value: true },
    });
    return line ? Number(toPlain(line.value)) : 0;
  }
  if (m.agg === "count") {
    return delegate(m.source).count({ where: { reportId } });
  }
  // sum
  if (!m.field || !isNumericField(m.source, m.field))
    throw new QueryError(`${m.source}.${m.field} raqamli emas (sum uchun)`);
  const res = await delegate(m.source).aggregate({
    where: { reportId },
    _sum: { [m.field]: true },
  });
  return Number(toPlain(res._sum?.[m.field]) ?? 0);
}

/**
 * QuerySpec'ni tekshirib bajaradi (READ-ONLY).
 * @param forExport true bo'lsa take chegarasi kattaroq.
 */
export async function runQuery(
  spec: QuerySpec,
  opts?: { forExport?: boolean },
): Promise<QueryResult> {
  // Firma hisoboti — ko'p jadvalni birlashtiradi (model talab qilinmaydi)
  if (spec.operation === "companyReport") {
    return runCompanyReport(spec);
  }

  const def = MODELS[spec.model];
  if (!def) throw new QueryError(`Noma'lum model: ${spec.model}`);

  const where = spec.where ? validateWhere(spec.model, spec.where) : undefined;
  const cap = opts?.forExport ? MAX_EXPORT_TAKE : MAX_TAKE;
  const take = Math.min(Math.max(1, spec.take ?? cap), cap);

  if (spec.operation === "count") {
    const total = await delegate(spec.model).count({ where });
    return {
      operation: "count",
      model: spec.model,
      rows: [{ count: total }],
      total,
      numericFields: ["count"],
    };
  }

  if (spec.operation === "aggregate") {
    const sum = validateNumeric(spec.model, spec.sum);
    const avg = validateNumeric(spec.model, spec.avg);
    const args: Record<string, unknown> = { where };
    if (sum.length) args._sum = Object.fromEntries(sum.map((f) => [f, true]));
    if (avg.length) args._avg = Object.fromEntries(avg.map((f) => [f, true]));
    args._count = true;
    const res = await delegate(spec.model).aggregate(args);
    const row = toPlain(res) as Record<string, unknown>;
    return {
      operation: "aggregate",
      model: spec.model,
      rows: [row],
      total: 1,
      numericFields: [...sum, ...avg],
    };
  }

  if (spec.operation === "groupBy") {
    if (!spec.by?.length) throw new QueryError("groupBy uchun 'by' kerak");
    const sum = validateNumeric(spec.model, spec.sum);
    const avg = validateNumeric(spec.model, spec.avg);

    // Har bir 'by' maydonini hal qilish (bevosita yoki relation orqali)
    const byResolved = spec.by.map((f) => {
      const r = resolveField(spec.model, f);
      if (!r) throw new QueryError(`Ruxsat etilmagan maydon: ${spec.model}.${f}`);
      return { name: f, path: r.path };
    });
    const hasRelation = byResolved.some((b) => b.path.length > 0);

    // Relation maydoni bo'yicha guruhlash — Prisma groupBy qo'llamaydi,
    // shuning uchun findMany + JS agregatsiya (masalan firma bo'yicha jami).
    if (hasRelation) {
      const rows = await groupByJs(spec.model, where, byResolved, sum, avg);
      let res = rows;
      if (spec.orderBy?.length) {
        const ob = spec.orderBy[0];
        res = [...res].sort((a, b) => {
          const av = Number(a[ob.field] ?? a._count ?? 0);
          const bv = Number(b[ob.field] ?? b._count ?? 0);
          return ob.dir === "desc" ? bv - av : av - bv;
        });
      }
      return {
        operation: "groupBy",
        model: spec.model,
        rows: res.slice(0, take),
        total: res.length,
        numericFields: [...sum, ...avg],
      };
    }

    // Bevosita maydon(lar) bo'yicha — samarali Prisma groupBy
    const by = byResolved.map((b) => b.name);
    const args: Record<string, unknown> = { by, where };
    if (sum.length) args._sum = Object.fromEntries(sum.map((f) => [f, true]));
    if (avg.length) args._avg = Object.fromEntries(avg.map((f) => [f, true]));
    args._count = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res: any[] = await delegate(spec.model).groupBy(args);
    res = res.map((r) => toPlain(r) as Record<string, unknown>);
    if (spec.orderBy?.length) {
      const ob = spec.orderBy[0];
      res.sort((a, b) => {
        const av = pickSortable(a, ob.field);
        const bv = pickSortable(b, ob.field);
        return ob.dir === "desc" ? bv - av : av - bv;
      });
    }
    const total = res.length;
    return {
      operation: "groupBy",
      model: spec.model,
      rows: res.slice(0, take),
      total,
      numericFields: [...sum, ...avg],
    };
  }

  // findMany — select/orderBy relation maydonlarni ham qabul qiladi (avto-resolve)
  // select bo'sh yoki juda tor bo'lsa — model uchun "boy" standart ustunlar.
  let selectFields = spec.select ?? [];
  if (selectFields.length < 2 && DEFAULT_SELECT[spec.model])
    selectFields = DEFAULT_SELECT[spec.model];
  const selResolved = selectFields.map((f) => {
    const r = resolveField(spec.model, f);
    if (!r) throw new QueryError(`Ruxsat etilmagan maydon: ${spec.model}.${f}`);
    return { name: f, path: r.path, type: r.type };
  });

  const args: Record<string, unknown> = { where, take };
  if (selResolved.length) {
    args.select = buildSelect(
      selResolved.map((s) => ({ name: s.name, path: s.path })),
      [],
    );
  }

  // orderBy — bevosita yoki relation (report.reportDate) bo'yicha
  const orderBy: Record<string, unknown>[] = [];
  for (const o of spec.orderBy ?? []) {
    const r = resolveField(spec.model, o.field);
    if (!r) continue;
    if (r.path.length === 0) orderBy.push({ [o.field]: o.dir });
    else {
      let node: Record<string, unknown> = {};
      const top = node;
      for (let i = 0; i < r.path.length; i++) {
        const nn: Record<string, unknown> = {};
        node[r.path[i]] = i === r.path.length - 1 ? { [o.field]: o.dir } : nn;
        node = nn;
      }
      orderBy.push(top);
    }
  }
  if (orderBy.length) args.orderBy = orderBy;

  const [rawRows, total] = await Promise.all([
    delegate(spec.model).findMany(args),
    delegate(spec.model).count({ where }),
  ]);

  // Nested (relation) qiymatlarni yuqori darajaga tekislaymiz
  const rows = (rawRows as Record<string, unknown>[]).map((r) => {
    const plain = toPlain(r) as Record<string, unknown>;
    if (!selResolved.length) return plain;
    const flat: Record<string, unknown> = {};
    for (const s of selResolved) flat[s.name] = readByPath(plain, s.path, s.name);
    return flat;
  });

  return {
    operation: "findMany",
    model: spec.model,
    rows,
    total,
    numericFields: selResolved.length
      ? selResolved.filter((s) => s.type === "decimal" || s.type === "int").map((s) => s.name)
      : Object.keys(def.fields).filter((f) => isNumericField(spec.model, f)),
  };
}
// path bo'yicha nested qiymatni o'qish: row.report.companyId
function readByPath(
  row: Record<string, unknown>,
  path: string[],
  field: string,
): unknown {
  let cur: unknown = row;
  for (const p of path) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return undefined;
  }
  if (cur && typeof cur === "object")
    return (cur as Record<string, unknown>)[field];
  return undefined;
}

// relation path + maydonlardan Prisma select yasash
function buildSelect(
  byResolved: { name: string; path: string[] }[],
  numeric: string[],
): Record<string, unknown> {
  const select: Record<string, unknown> = {};
  // raqamli maydonlar (model ustida bevosita)
  for (const f of numeric) select[f] = true;
  // by maydonlari (relation orqali bo'lishi mumkin)
  for (const b of byResolved) {
    if (b.path.length === 0) {
      select[b.name] = true;
    } else {
      let node = select;
      for (const p of b.path) {
        if (!node[p] || typeof node[p] !== "object")
          node[p] = { select: {} as Record<string, unknown> };
        node = (node[p] as { select: Record<string, unknown> }).select;
      }
      node[b.name] = true;
    }
  }
  return select;
}

const MAX_GROUP_SCAN = 50000;

/** Relation maydoni bo'yicha JS agregatsiya (Prisma groupBy relation qo'llamaydi) */
async function groupByJs(
  model: string,
  where: Record<string, unknown> | undefined,
  byResolved: { name: string; path: string[] }[],
  sum: string[],
  avg: string[],
): Promise<Record<string, unknown>[]> {
  const numeric = [...new Set([...sum, ...avg])];
  const select = buildSelect(byResolved, numeric);
  const rows: Record<string, unknown>[] = await delegate(model).findMany({
    where,
    select,
    take: MAX_GROUP_SCAN,
  });

  type Acc = {
    keyVals: Record<string, unknown>;
    count: number;
    sums: Record<string, number>;
    avgN: Record<string, number>;
  };
  const groups = new Map<string, Acc>();

  for (const r of rows) {
    const keyVals: Record<string, unknown> = {};
    for (const b of byResolved)
      keyVals[b.name] = readByPath(r, b.path, b.name);
    const key = JSON.stringify(byResolved.map((b) => keyVals[b.name]));
    let g = groups.get(key);
    if (!g) {
      g = { keyVals, count: 0, sums: {}, avgN: {} };
      groups.set(key, g);
    }
    g.count++;
    for (const f of sum) g.sums[f] = (g.sums[f] ?? 0) + Number(toPlain(r[f]) ?? 0);
    for (const f of avg) g.avgN[f] = (g.avgN[f] ?? 0) + Number(toPlain(r[f]) ?? 0);
  }

  // companyId bo'yicha guruhlansa — firma nomini qo'shamiz
  const groupsByCompany = byResolved.some((b) => b.name === "companyId");
  let nameMap = new Map<number, string>();
  if (groupsByCompany) {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });
    nameMap = new Map(companies.map((c) => [c.id, c.name]));
  }

  const out: Record<string, unknown>[] = [];
  for (const g of groups.values()) {
    const row: Record<string, unknown> = {};
    for (const b of byResolved) {
      row[b.name] = toPlain(g.keyVals[b.name]);
      if (b.name === "companyId") {
        const id = Number(g.keyVals[b.name]);
        row.company = nameMap.get(id) ?? `#${id}`;
      }
    }
    for (const f of sum) row[f] = g.sums[f] ?? 0;
    for (const f of avg) row[f] = g.count ? (g.avgN[f] ?? 0) / g.count : 0;
    row.count = g.count;
    out.push(row);
  }
  return out;
}

// groupBy natijasidan saralash qiymatini ajratish (_sum.x yoki _count yoki maydon)
function pickSortable(row: Record<string, unknown>, field: string): number {
  if (field === "_count" || field === "count") {
    const c = row._count;
    return typeof c === "number" ? c : Number((c as Record<string, unknown>)?._all ?? 0);
  }
  const sum = row._sum as Record<string, unknown> | undefined;
  if (sum && field in sum) return Number(sum[field] ?? 0);
  const avg = row._avg as Record<string, unknown> | undefined;
  if (avg && field in avg) return Number(avg[field] ?? 0);
  const v = row[field];
  return typeof v === "number" ? v : Number(v ?? 0);
}

/**
 * O'CHIRISH — FAQAT report modeli (kaskad bilan barcha bog'liq yozuvlar).
 * Avval preview (nechta, qaysilar), keyin ruxsat bilan delete.
 */
export async function previewDelete(where: Record<string, unknown>) {
  const w = validateWhere("report", where);
  const reports = await prisma.report.findMany({
    where: w,
    select: {
      id: true,
      reportDate: true,
      fileName: true,
      status: true,
      company: { select: { name: true } },
    },
    orderBy: { reportDate: "desc" },
    take: 200,
  });
  return reports.map((r) => ({
    id: r.id,
    date: r.reportDate.toISOString(),
    fileName: r.fileName,
    status: r.status,
    company: r.company.name,
  }));
}

export async function executeDelete(
  where: Record<string, unknown>,
): Promise<{ count: number; ids: number[] }> {
  const w = validateWhere("report", where);
  const targets = await prisma.report.findMany({
    where: w,
    select: { id: true },
  });
  const ids = targets.map((t) => t.id);
  if (!ids.length) return { count: 0, ids: [] };
  const res = await prisma.report.deleteMany({ where: { id: { in: ids } } });
  return { count: res.count, ids };
}
