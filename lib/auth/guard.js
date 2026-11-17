import { NextResponse } from "next/server.js";
import { ROLE_PERMISSIONS } from "./permissions.js";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "./session.js";
import { isSameOrigin, logAuthError } from "./http.js";

function errorResponse(code, status, clearCookie = false) {
  const response = NextResponse.json(
    { error: code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  if (clearCookie) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...getSessionCookieOptions(),
      maxAge: 0,
    });
  }
  return response;
}

function getCookieValue(request) {
  const cookie = request.cookies?.get?.(SESSION_COOKIE_NAME);
  if (cookie?.value) return cookie.value;

  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === SESSION_COOKIE_NAME) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function logAndReturnServerError(error) {
  logAuthError(error);
  return errorResponse("SERVER_ERROR", 500);
}

export async function requireStaff(
  request,
  { permission, allowPasswordChange = false, db } = {},
) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    if (!isSameOrigin(request)) return errorResponse("FORBIDDEN", 403);
  }

  const token = getCookieValue(request);
  if (!token) return errorResponse("UNAUTHENTICATED", 401);

  let session;
  try {
    session = await verifySessionToken(token);
  } catch (error) {
    if (error?.code === "SESSION_SECRET_INVALID") {
      return logAndReturnServerError(error);
    }
    return errorResponse("UNAUTHENTICATED", 401, true);
  }
  if (!session?.staffId) return errorResponse("UNAUTHENTICATED", 401, true);

  let staff;
  try {
    const database = db ?? (await import("../db.js")).prisma;
    staff = await database.staff_users.findUnique({
      where: { id: session.staffId },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
        must_change_password: true,
      },
    });
  } catch (error) {
    return logAndReturnServerError(error);
  }

  if (!staff || staff.is_active !== true) {
    return errorResponse("UNAUTHENTICATED", 401, true);
  }
  if (!Object.hasOwn(ROLE_PERMISSIONS, staff.role)) {
    return errorResponse("FORBIDDEN", 403);
  }
  if (staff.must_change_password && !allowPasswordChange) {
    return errorResponse("PASSWORD_CHANGE_REQUIRED", 403);
  }
  if (permission && !ROLE_PERMISSIONS[staff.role].includes(permission)) {
    return errorResponse("FORBIDDEN", 403);
  }

  return staff;
}
