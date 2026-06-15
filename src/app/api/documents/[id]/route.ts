import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { unlink } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// Hujjatni tepaga qadab qo'yish / olib tashlash (yoki sarlavha/izoh tahrirlash)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const docId = Number(id);
  if (!Number.isFinite(docId))
    return NextResponse.json({ error: "Noto'g'ri id" }, { status: 400 });

  const doc = await prisma.companyDocument.findUnique({ where: { id: docId } });
  if (!doc)
    return NextResponse.json({ error: "Hujjat topilmadi" }, { status: 404 });

  let body: { pin?: boolean; title?: string; description?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const data: Record<string, unknown> = {};
  if (typeof body.pin === "boolean") {
    data.isPinned = body.pin;
    data.pinnedAt = body.pin ? new Date() : null;
  }
  if (typeof body.title === "string" && body.title.trim())
    data.title = body.title.trim();
  if (body.description !== undefined)
    data.description = body.description?.toString().trim() || null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "O'zgartirish yo'q" }, { status: 400 });

  const updated = await prisma.companyDocument.update({
    where: { id: docId },
    data,
    include: { uploadedBy: { select: { name: true, login: true } } },
  });

  return NextResponse.json({ document: updated });
}

// Hujjatni o'chirish (fayl ham diskdan o'chiriladi)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const docId = Number(id);
  if (!Number.isFinite(docId))
    return NextResponse.json({ error: "Noto'g'ri id" }, { status: 400 });

  const doc = await prisma.companyDocument.findUnique({
    where: { id: docId },
    include: { company: { select: { name: true } } },
  });
  if (!doc)
    return NextResponse.json({ error: "Hujjat topilmadi" }, { status: 404 });

  await prisma.companyDocument.delete({ where: { id: docId } });

  // Diskdagi faylni ham o'chirish (xato bo'lsa e'tiborsiz)
  if (doc.fileUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", doc.fileUrl);
    await unlink(filePath).catch(() => {});
  }

  await audit({
    action: "DELETE",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    companyName: doc.company.name,
    message: `Hujjat o'chirildi: ${doc.fileName}`,
    req,
  });

  return NextResponse.json({ ok: true });
}
