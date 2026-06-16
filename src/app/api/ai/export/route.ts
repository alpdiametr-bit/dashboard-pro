import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { runQuery, QueryError, type QuerySpec } from "@/lib/ai-query";
import { fieldLabel } from "@/lib/ai-schema";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 120;

/** aggregate/groupBy natijalarini tekis qatorga aylantirish */
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
      } else out[k] = v;
    }
    return out;
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    query?: QuerySpec;
    title?: string;
  } | null;
  if (!body?.query)
    return NextResponse.json({ error: "query kerak" }, { status: 400 });

  try {
    const result = await runQuery(body.query, { forExport: true });
    const rows = flattenRows(result.rows);
    if (!rows.length)
      return NextResponse.json({ error: "Ma'lumot topilmadi" }, { status: 404 });

    const keys = Object.keys(rows[0]);
    const header = keys.map((k) => fieldLabel(k));
    const aoa: (string | number)[][] = [header];
    for (const r of rows) {
      aoa.push(
        keys.map((k) => {
          const v = r[k];
          if (v === null || v === undefined) return "";
          if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v))
            return v.slice(0, 10);
          return v as string | number;
        }),
      );
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI hisobot");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const title = (body.title || "AI-hisobot").replace(/[\\/?*[\]:]/g, "_");
    const filename = `${title}.xlsx`;

    await audit({
      action: "EXPORT",
      adminId: session.adminId,
      login: session.login,
      adminName: session.name,
      message: `AI eksport: ${result.model} (${rows.length} qator)`,
      meta: { model: result.model, rows: rows.length, source: "ai" },
      req,
    });

    const asciiName = filename.replace(/[^\x20-\x7E]/g, "_");
    const encoded = encodeURIComponent(filename);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof QueryError ? e.message : "Eksport xatosi" },
      { status: 400 },
    );
  }
}
