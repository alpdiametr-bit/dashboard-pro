import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { detectFileKind, DOC_ALLOWED_EXT, DOC_MAX_SIZE } from "@/lib/constants";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

// Firma hujjatlari ro'yxati
export async function GET(
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

  const documents = await prisma.companyDocument.findMany({
    where: { companyId },
    orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, { createdAt: "desc" }],
    include: { uploadedBy: { select: { name: true, login: true } } },
  });

  return NextResponse.json({ documents });
}

// Firmaga qo'shimcha hujjat (rasm/excel/csv/pdf...) yuklash
export async function POST(
  req: NextRequest,
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fayl tanlanmagan" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!DOC_ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { error: `Ruxsat etilmagan format (.${ext}). Rasm, Excel, CSV, PDF yoki Word yuklang.` },
      { status: 400 },
    );
  }
  if (file.size > DOC_MAX_SIZE) {
    return NextResponse.json(
      { error: "Fayl 25 MB dan kichik bo'lsin" },
      { status: 400 },
    );
  }

  // Sarlavha: formdan, bo'lmasa fayl nomidan (kengaytmasiz)
  const rawTitle = String(form.get("title") || "").trim();
  const title = rawTitle || file.name.replace(/\.[^.]+$/, "");
  const description = String(form.get("description") || "").trim() || null;

  const safeBase = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "documents");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safeBase), buffer);
  const fileUrl = `/uploads/documents/${safeBase}`;

  const doc = await prisma.companyDocument.create({
    data: {
      companyId,
      title,
      description,
      fileName: file.name,
      fileUrl,
      kind: detectFileKind(file.name, file.type),
      mimeType: file.type || null,
      fileSize: file.size,
      uploadedById: session.adminId,
    },
    include: { uploadedBy: { select: { name: true, login: true } } },
  });

  await audit({
    action: "UPLOAD",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    companyName: company.name,
    message: `Hujjat yuklandi: ${file.name}`,
    meta: { kind: doc.kind, fileName: file.name, fileSize: file.size },
    req,
  });

  return NextResponse.json({ document: doc });
}
