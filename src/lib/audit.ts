import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

// Audit jurnali — har bir muhim amaliyot bazaga yoziladi.
// Bu jadval append-only: yozish bor, o'chirish/yangilash YO'Q.

export type AuditActionType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "UPLOAD"
  | "EXPORT"
  | "CONFIRM"
  | "DELETE";

type AuditInput = {
  action: AuditActionType;
  success?: boolean;
  adminId?: number | null;
  login?: string | null;
  adminName?: string | null;
  reportId?: number | null;
  companyName?: string | null;
  message?: string | null;
  meta?: Record<string, unknown> | null;
  req?: NextRequest | null;
};

/** So'rovdan IP manzilni aniqlash (proksi sarlavhalarini hisobga olib) */
function clientIp(req?: NextRequest | null): string | null {
  if (!req) return null;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

/**
 * Audit yozuvini bazaga qo'shadi. Log yozish ASOSIY amaliyotni
 * hech qachon to'xtatmasligi kerak — shu sabab xato yutiladi.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        success: input.success ?? true,
        adminId: input.adminId ?? null,
        login: input.login ?? null,
        adminName: input.adminName ?? null,
        reportId: input.reportId ?? null,
        companyName: input.companyName ?? null,
        message: input.message ?? null,
        meta: (input.meta ?? undefined) as never,
        method: input.req?.method ?? null,
        path: input.req?.nextUrl?.pathname ?? null,
        ip: clientIp(input.req),
        userAgent: input.req?.headers.get("user-agent") ?? null,
      },
    });
  } catch (e) {
    // Jurnalga yozib bo'lmasa ham asosiy oqim davom etsin
    console.error("[audit] yozishda xatolik:", (e as Error).message);
  }
}
