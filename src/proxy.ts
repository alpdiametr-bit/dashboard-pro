import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "dp_session";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "dev-secret-change-me-please-32chars-0123";
  return new TextEncoder().encode(s);
}

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // statik va public yo'llarni o'tkazib yuborish
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret(), { algorithms: ["HS256"] });
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    // API uchun 401, sahifa uchun login'ga redirect
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // tizimga kirgan bo'lsa /login -> /dashboard
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
