import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(
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

  const report = await prisma.report
    .findUnique({ where: { id: reportId }, include: { company: true } })
    .catch(() => null);

  await prisma.report.delete({ where: { id: reportId } }).catch(() => {});

  await audit({
    action: "DELETE",
    adminId: session.adminId,
    login: session.login,
    adminName: session.name,
    reportId,
    companyName: report?.company.name ?? null,
    message: report
      ? `Hisobot o'chirildi: ${report.fileName}`
      : "Hisobot o'chirildi",
    meta: report
      ? {
          fileName: report.fileName,
          fileSize: report.fileSize,
          reportDate: report.reportDate.toISOString(),
          status: report.status,
        }
      : undefined,
    req: _req,
  });

  return NextResponse.json({ ok: true });
}
