import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// Hisobotni tepaga qadab qo'yish / olib tashlash
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId))
    return NextResponse.json({ error: "Noto'g'ri id" }, { status: 400 });

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report)
    return NextResponse.json({ error: "Hisobot topilmadi" }, { status: 404 });

  const isPinned = !report.isPinned;
  await prisma.report.update({
    where: { id: reportId },
    data: { isPinned, pinnedAt: isPinned ? new Date() : null },
  });

  return NextResponse.json({ ok: true, isPinned });
}
