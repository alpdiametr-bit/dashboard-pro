import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
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

  await prisma.report.delete({ where: { id: reportId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
