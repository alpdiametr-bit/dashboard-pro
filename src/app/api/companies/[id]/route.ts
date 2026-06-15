import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_IMAGE = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// Firma ma'lumotlarini tahrirlash (nom, STIR, hudud, tavsif, rasm)
export async function PATCH(
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

  const name = String(form.get("name") || "").trim();
  const region = String(form.get("region") || "").trim() || null;
  const inn = String(form.get("inn") || "").trim() || null;
  const description = String(form.get("description") || "").trim() || null;
  const image = form.get("image");
  const removeImage = String(form.get("removeImage") || "") === "true";

  if (!name)
    return NextResponse.json({ error: "Firma nomi kiriting" }, { status: 400 });

  // Nom o'zgargan bo'lsa — boshqa firmada band emasligini tekshiramiz
  if (name !== company.name) {
    const dup = await prisma.company.findUnique({ where: { name } });
    if (dup)
      return NextResponse.json(
        { error: "Bu nomli firma allaqachon mavjud" },
        { status: 409 },
      );
  }

  let imageUrl: string | null | undefined = undefined; // undefined = o'zgartirmaymiz
  const oldImage = company.imageUrl;

  if (image instanceof File && image.size > 0) {
    if (!ALLOWED.includes(image.type))
      return NextResponse.json(
        { error: "Faqat PNG, JPG, WEBP yoki SVG rasm" },
        { status: 400 },
      );
    if (image.size > MAX_IMAGE)
      return NextResponse.json(
        { error: "Rasm 4 MB dan kichik bo'lsin" },
        { status: 400 },
      );
    const ext = image.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `company_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "companies");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(path.join(dir, fileName), buffer);
    imageUrl = `/uploads/companies/${fileName}`;
  } else if (removeImage) {
    imageUrl = null;
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      region,
      inn,
      description,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    },
  });

  // Eski rasmni o'chiramiz (almashtirilgan yoki olib tashlangan bo'lsa)
  if (
    imageUrl !== undefined &&
    oldImage &&
    oldImage !== imageUrl &&
    oldImage.startsWith("/uploads/")
  ) {
    try {
      await unlink(path.join(process.cwd(), "public", oldImage));
    } catch {
      // e'tiborsiz
    }
  }

  await audit({
    action: "UPLOAD",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    companyName: name,
    message: `Firma tahrirlandi: ${name}`,
    req,
  });

  return NextResponse.json({ company: updated });
}

// Firmani o'chirish — FAQAT hisoboti (datasi) bo'lmasa
export async function DELETE(
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

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: { select: { reports: true, documents: true } },
    },
  });
  if (!company)
    return NextResponse.json({ error: "Firma topilmadi" }, { status: 404 });

  // Hisobot (data) bo'lsa — o'chirishga ruxsat yo'q
  if (company._count.reports > 0) {
    return NextResponse.json(
      {
        error: `Bu firmada ${company._count.reports} ta hisobot mavjud. Avval hisobotlarni o'chiring.`,
      },
      { status: 409 },
    );
  }

  // Logo faylini ham o'chiramiz (bo'lsa)
  if (company.imageUrl && company.imageUrl.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", company.imageUrl));
    } catch {
      // fayl topilmasa — e'tiborsiz
    }
  }

  // documents (agar bo'lsa) cascade bilan o'chadi (schema onDelete: Cascade)
  await prisma.company.delete({ where: { id: companyId } });

  await audit({
    action: "DELETE",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    companyName: company.name,
    message: `Firma o'chirildi: ${company.name}`,
    req,
  });

  return NextResponse.json({ ok: true });
}
