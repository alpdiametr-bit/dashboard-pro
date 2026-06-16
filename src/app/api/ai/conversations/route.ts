import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Saqlangan AI suhbatlari ro'yxati (oxirgilari birinchi)
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const conversations = await prisma.aiConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      uid: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      uid: c.uid,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messageCount: c._count.messages,
    })),
  });
}
