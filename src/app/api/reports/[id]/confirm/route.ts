import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId))
    return NextResponse.json({ error: "Noto'g'ri id" }, { status: 400 });

  // Modalda konsolidatsiya belgisi o'zgartirilishi mumkin
  let isConsolidated: boolean | undefined;
  try {
    const body = await _req.json();
    if (typeof body?.isConsolidated === "boolean")
      isConsolidated = body.isConsolidated;
  } catch {
    // tana bo'sh bo'lsa — eski qiymat saqlanadi
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      ...(isConsolidated !== undefined ? { isConsolidated } : {}),
    },
    include: { company: true },
  });

  await audit({
    action: "CONFIRM",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    reportId: report.id,
    companyName: report.company.name,
    message: "Hisobot tasdiqlandi",
    req: _req,
  });

  return NextResponse.json({ ok: true, companyId: report.companyId });
}
