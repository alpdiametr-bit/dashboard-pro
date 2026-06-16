import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { previewDelete, executeDelete, QueryError } from "@/lib/ai-query";

export const runtime = "nodejs";

// AI yordamchi orqali O'CHIRISH — FAQAT foydalanuvchi tasdig'i bilan.
// confirm=true bo'lmasa hech narsa o'chmaydi (faqat preview qaytadi).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    where?: Record<string, unknown>;
    confirm?: boolean;
  } | null;
  if (!body?.where)
    return NextResponse.json({ error: "where kerak" }, { status: 400 });

  try {
    if (!body.confirm) {
      const preview = await previewDelete(body.where);
      return NextResponse.json({ preview, count: preview.length });
    }

    const { count, ids } = await executeDelete(body.where);
    await audit({
      action: "DELETE",
      adminId: session.adminId,
      login: session.login,
      adminName: session.name,
      message: `AI orqali ${count} ta hisobot o'chirildi`,
      meta: { ids, source: "ai", where: body.where },
      req,
    });
    return NextResponse.json({ deleted: count, ids });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof QueryError ? e.message : "O'chirish xatosi" },
      { status: 400 },
    );
  }
}
