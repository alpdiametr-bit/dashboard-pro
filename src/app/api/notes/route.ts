import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  reportId: z.number().int(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const reportId = Number(req.nextUrl.searchParams.get("reportId"));
  const entityType = req.nextUrl.searchParams.get("entityType") ?? undefined;
  const entityId = req.nextUrl.searchParams.get("entityId") ?? undefined;
  if (!Number.isFinite(reportId))
    return NextResponse.json({ error: "reportId kerak" }, { status: 400 });

  const notes = await prisma.note.findMany({
    where: { reportId, entityType, entityId },
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

  const note = await prisma.note.create({
    data: { ...parsed.data, adminId: session.adminId },
    include: { admin: { select: { name: true, login: true } } },
  });
  return NextResponse.json({ note });
}
