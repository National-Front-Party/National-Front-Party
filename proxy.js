import { NextResponse } from "next/server.js";
import { SESSION_COOKIE_NAME } from "./lib/auth/session.js";

const publicAdminPaths = new Set([
  "/admin/login",
  "/api/admin/auth/login",
]);

export function proxy(request) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (publicAdminPaths.has(pathname)) return NextResponse.next();
  if (!request.cookies.get(SESSION_COOKIE_NAME)?.value) {
    if (!pathname.startsWith("/api/")) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(unauthorizedUrl);
    }

    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
