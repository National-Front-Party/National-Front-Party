import { cookies } from "next/headers.js";
import { login, changePassword } from "../services/auth.js";
import {
  changePasswordSchema,
  loginSchema,
} from "../validation/auth.js";
import { requireStaff } from "./guard.js";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "./session.js";
import {
  getClientIp,
  isSameOrigin,
  jsonResponse,
  logAuthError,
  readJsonBody,
} from "./http.js";

function rateLimitedResponse(result) {
  return jsonResponse(
    { error: result.code, retryAfterSeconds: result.retryAfterSeconds },
    result.code === "ACCOUNT_LOCKED" ? 423 : 429,
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

function logFailure(error) {
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

export function createLoginHandler({
  loginFn = login,
  createToken = createSessionToken,
  getCookieStore = cookies,
  ipGetter = getClientIp,
} = {}) {
  return async function POST(request) {
    if (!isSameOrigin(request)) {
      return jsonResponse({ error: "FORBIDDEN" }, 403);
    }

    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const parsed = loginSchema.safeParse(body.value);
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      const result = await loginFn(
        parsed.data.email,
        parsed.data.password,
        ipGetter(request),
      );
      if (!result.ok) {
        if (["ACCOUNT_LOCKED", "RATE_LIMITED"].includes(result.code)) {
          return rateLimitedResponse(result);
        }
        if (result.code === "INVALID_CREDENTIALS") {
          return jsonResponse({ error: result.code }, 401);
        }
        return jsonResponse({ error: "SERVER_ERROR" }, 500);
      }

      const token = await createToken(result.staffId);
      const cookieStore = await getCookieStore();
      cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
      return jsonResponse(
        { mustChangePassword: result.mustChangePassword },
        200,
      );
    } catch (error) {
      return logFailure(error);
    }
  };
}

export function createLogoutHandler({ getCookieStore = cookies } = {}) {
  return async function POST(request) {
    if (!isSameOrigin(request)) {
      return jsonResponse({ error: "FORBIDDEN" }, 403);
    }
    try {
      const cookieStore = await getCookieStore();
      cookieStore.set(SESSION_COOKIE_NAME, "", {
        ...getSessionCookieOptions(),
        maxAge: 0,
      });
      return jsonResponse({ ok: true });
    } catch (error) {
      return logFailure(error);
    }
  };
}

export function createChangePasswordHandler({
  guard = requireStaff,
  changePasswordFn = changePassword,
} = {}) {
  return async function POST(request) {
    const staff = await guard(request, { allowPasswordChange: true });
    if (staff instanceof Response) return staff;

    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const parsed = changePasswordSchema.safeParse(body.value);
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      const result = await changePasswordFn(
        staff.id,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
      if (result.ok) return jsonResponse({ ok: true });
      if (result.code === "UNAUTHENTICATED") {
        return jsonResponse({ error: result.code }, 401);
      }
      if (result.code === "WEAK_PASSWORD") {
        return jsonResponse(
          { error: result.code, issues: result.errors },
          400,
        );
      }
      if (
        ["INVALID_CURRENT_PASSWORD", "PASSWORD_NOT_CHANGED"].includes(
          result.code,
        )
      ) {
        return jsonResponse({ error: result.code }, 400);
      }
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
    } catch (error) {
      return logFailure(error);
    }
  };
}

export function createMeHandler({ guard = requireStaff } = {}) {
  return async function GET(request) {
    const staff = await guard(request, { allowPasswordChange: true });
    if (staff instanceof Response) return staff;
    return jsonResponse({
      fullName: staff.full_name,
      email: staff.email,
      role: staff.role,
      mustChangePassword: staff.must_change_password,
    });
  };
}

export const loginHandler = createLoginHandler();
export const logoutHandler = createLogoutHandler();
export const changePasswordHandler = createChangePasswordHandler();
export const meHandler = createMeHandler();
