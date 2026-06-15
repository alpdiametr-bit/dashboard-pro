import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// Firmalar ro'yxati (qidiruv bilan)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const companies = await prisma.company.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { region: { contains: q } }] }
      : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ companies });
}

// Yangi firma qo'shish (logo + tavsif bilan)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

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

  if (!name) {
    return NextResponse.json({ error: "Firma nomi kiriting" }, { status: 400 });
  }

  const exists = await prisma.company.findUnique({ where: { name } });
  if (exists) {
    return NextResponse.json(
      { error: "Bu nomli firma allaqachon mavjud" },
      { status: 409 },
    );
  }

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (!ALLOWED.includes(image.type)) {
      return NextResponse.json(
        { error: "Faqat PNG, JPG, WEBP yoki SVG rasm" },
        { status: 400 },
      );
    }
    if (image.size > MAX_IMAGE) {
      return NextResponse.json({ error: "Rasm 4 MB dan kichik bo'lsin" }, { status: 400 });
    }
    const ext = image.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `company_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "companies");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(path.join(dir, fileName), buffer);
    imageUrl = `/uploads/companies/${fileName}`;
  }

  const company = await prisma.company.create({
    data: { name, region, inn, description, imageUrl },
  });

  await audit({
    action: "UPLOAD",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    companyName: name,
    message: `Yangi firma qo'shildi: ${name}`,
    req,
  });

  return NextResponse.json({ company });
}
