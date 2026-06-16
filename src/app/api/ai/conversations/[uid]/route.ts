import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bitta suhbatning barcha xabarlari (qayta yuklash uchun)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { uid } = await params;
  const conv = await prisma.aiConversation.findUnique({
    where: { uid },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          content: true,
          querySpec: true,
          result: true,
          chart: true,
          createdAt: true,
        },
      },
    },
  });
  if (!conv)
    return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

  return NextResponse.json({
    uid: conv.uid,
    title: conv.title,
    messages: conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
      querySpec: m.querySpec,
      result: m.result,
      chart: m.chart,
    })),
  });
}

// Suhbatni o'chirish
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { uid } = await params;
  await prisma.aiConversation.deleteMany({ where: { uid } });
  return NextResponse.json({ ok: true });
}
