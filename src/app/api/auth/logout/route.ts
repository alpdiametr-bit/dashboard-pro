import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  await destroySession();

  if (session) {
    await audit({
      action: "LOGOUT",
      adminId: session.adminId,
      login: session.login,
      adminName: session.name,
      message: "Tizimdan chiqdi",
      req,
    });
  }

  return NextResponse.json({ ok: true });
}
