import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAlerts, DEFAULT_ALERT_THRESHOLD } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const raw = Number(req.nextUrl.searchParams.get("threshold"));
  const threshold =
    Number.isFinite(raw) && raw > 0 ? Math.min(100, raw) : DEFAULT_ALERT_THRESHOLD;

  const result = await getAlerts(threshold);
  return NextResponse.json(result);
}
