import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { id } = await params;
  const reportId = Number(id);
  const sheetId = Number(req.nextUrl.searchParams.get("sheetId"));
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const size = Math.min(200, Number(req.nextUrl.searchParams.get("size")) || 50);

  if (!Number.isFinite(reportId) || !Number.isFinite(sheetId))
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });

  const sheet = await prisma.reportSheet.findFirst({
    where: { id: sheetId, reportId },
  });
  if (!sheet)
    return NextResponse.json({ error: "Varaq topilmadi" }, { status: 404 });

  const grid = (sheet.data as unknown as string[][]) ?? [];
  const total = grid.length;
  const rows = grid.slice((page - 1) * size, page * size);

  return NextResponse.json({
    name: sheet.name,
    colCount: sheet.colCount,
    total,
    rows,
  });
}
