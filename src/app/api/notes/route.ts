import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  reportId: z.number().int().nullable().optional(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const entityType = sp.get("entityType") ?? undefined;
  const entityId = sp.get("entityId") ?? undefined;
  const reportIdRaw = sp.get("reportId");

  // entityType/entityId yetarli; reportId ixtiyoriy (firma izohlarida null bo'ladi)
  if (!entityType || !entityId)
    return NextResponse.json(
      { error: "entityType va entityId kerak" },
      { status: 400 },
    );

  const where: { entityType: string; entityId: string; reportId?: number } = {
    entityType,
    entityId,
  };
  if (reportIdRaw && Number.isFinite(Number(reportIdRaw)))
    where.reportId = Number(reportIdRaw);

  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { admin: { select: { name: true, login: true } } },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });

  const { reportId, entityType, entityId, text } = parsed.data;
  const note = await prisma.note.create({
    data: {
      reportId: reportId ?? null,
      entityType,
      entityId,
      text,
      adminId: session.adminId,
    },
    include: { admin: { select: { name: true, login: true } } },
  });
  return NextResponse.json({ note });
}
