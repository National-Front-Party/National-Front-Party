import assert from "node:assert/strict";
import test from "node:test";
import { decodeJwt } from "jose";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_DURATION_SECONDS,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "./session.js";

const previousSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-bytes";

test("creates an HS256 session token with only the staff id and expiry claims", async () => {
  const token = await createSessionToken("staff-123");
  const payload = decodeJwt(token);
  const verified = await verifySessionToken(token);

  assert.equal(payload.sub, "staff-123");
  assert.equal(payload.exp - payload.iat, SESSION_DURATION_SECONDS);
  assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "sub"]);
  assert.deepEqual(verified, { staffId: "staff-123" });
});

test("rejects tampered, malformed, and expired tokens", async () => {
  const token = await createSessionToken("staff-456");
  const [header, payload, signature] = token.split(".");
  const changedSignature = `${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.equal(await verifySessionToken(changedSignature), null);
  assert.equal(await verifySessionToken("not-a-token"), null);

  const { SignJWT } = await import("jose");
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("staff-456")
    .setExpirationTime(1)
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  assert.equal(await verifySessionToken(expired), null);
});

test("requires a 32-byte secret and uses secure, HTTP-only cookie settings", async () => {
  const saved = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "too-short";
  await assert.rejects(createSessionToken("staff-789"), {
    code: "SESSION_SECRET_INVALID",
  });
  process.env.SESSION_SECRET = saved;

  assert.equal(SESSION_COOKIE_NAME, "staff_session");
  const options = getSessionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, SESSION_DURATION_SECONDS);
});

test.after(() => {
  if (previousSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = previousSecret;
});
