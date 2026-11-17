import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "staff_session";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    const error = new Error("SESSION_SECRET must contain at least 32 bytes.");
    error.code = "SESSION_SECRET_INVALID";
    throw error;
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(staffId) {
  if (typeof staffId !== "string" || staffId.length === 0) {
    throw new TypeError("A staff id is required to create a session.");
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(staffId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token) {
  if (typeof token !== "string" || token.length === 0) return null;
  const secret = getSecret();

  try {
    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    if (
      protectedHeader.alg !== "HS256" ||
      typeof payload.sub !== "string" ||
      Object.keys(payload).some((key) => !["sub", "iat", "exp"].includes(key))
    ) {
      return null;
    }
    return { staffId: payload.sub };
  } catch {
    return null;
  }
}
