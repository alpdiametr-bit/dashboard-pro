import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({
  login: z.string().min(1, "Login kiriting"),
  password: z.string().min(1, "Parol kiriting"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Xato" },
      { status: 400 },
    );
  }

  const { login, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { login } });

  if (!admin || !admin.isActive) {
    return NextResponse.json(
      { error: "Login yoki parol noto'g'ri" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Login yoki parol noto'g'ri" },
      { status: 401 },
    );
  }

  await createSession({
    adminId: admin.id,
    login: admin.login,
    name: admin.name,
    role: admin.role,
  });

  return NextResponse.json({ ok: true });
}
