import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

// Firmani tepaga qadab qo'yish / olib tashlash
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isFinite(companyId))
    return NextResponse.json({ error: "Noto'g'ri id" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company)
    return NextResponse.json({ error: "Firma topilmadi" }, { status: 404 });

  const isPinned = !company.isPinned;
  await prisma.company.update({
    where: { id: companyId },
    data: { isPinned, pinnedAt: isPinned ? new Date() : null },
  });

  return NextResponse.json({ ok: true, isPinned });
}
