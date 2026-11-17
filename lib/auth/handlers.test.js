import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/auth_tests";
const {
  createChangePasswordHandler,
  createLoginHandler,
  createLogoutHandler,
  createMeHandler,
} = await import("./handlers.js");

function postRequest(body, { origin = "http://localhost:3000", contentType } = {}) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (contentType) headers.set("content-type", contentType);
  return new Request("http://localhost:3000/api/admin/auth/login", {
    method: "POST",
    headers,
    body,
  });
}

test("login rejects cross-origin, non-JSON, malformed, and invalid bodies", async () => {
  const handler = createLoginHandler({
    loginFn: async () => {
      throw new Error("login should not be called");
    },
  });

  assert.equal(
    (await handler(postRequest("{}", { origin: "https://attacker.example", contentType: "application/json" }))).status,
    403,
  );
  assert.equal((await handler(postRequest("{}", { contentType: "text/plain" }))).status, 415);
  assert.equal((await handler(postRequest("{", { contentType: "application/json" }))).status, 400);
  assert.equal(
    (await handler(postRequest(JSON.stringify({ email: "staff@example.test" }), { contentType: "application/json" }))).status,
    400,
  );
});

test("login maps invalid credentials, lockout, and rate limits to API responses", async () => {
  const credentials = createLoginHandler({
    loginFn: async () => ({ ok: false, code: "INVALID_CREDENTIALS" }),
  });
  const invalid = await credentials(
    postRequest(JSON.stringify({ email: "STAFF@example.test", password: "any" }), { contentType: "application/json" }),
  );
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), { error: "INVALID_CREDENTIALS" });

  for (const [code, expectedStatus] of [["ACCOUNT_LOCKED", 423], ["RATE_LIMITED", 429]]) {
    const handler = createLoginHandler({
      loginFn: async () => ({ ok: false, code, retryAfterSeconds: 120 }),
    });
    const response = await handler(
      postRequest(JSON.stringify({ email: "staff@example.test", password: "any" }), { contentType: "application/json" }),
    );
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get("retry-after"), "120");
    assert.deepEqual(await response.json(), {
      error: code,
      retryAfterSeconds: 120,
    });
  }
});

test("login sets an HTTP-only session cookie and returns no private account fields", async () => {
  let cookieCall;
  const handler = createLoginHandler({
    loginFn: async () => ({
      ok: true,
      staffId: "staff-handler-test",
      mustChangePassword: true,
      email: "private@example.test",
      role: "super_admin",
    }),
    createToken: async () => "signed-session-token",
    getCookieStore: async () => ({
      set: (...args) => {
        cookieCall = args;
      },
    }),
  });
  const response = await handler(
    postRequest(JSON.stringify({ email: "staff@example.test", password: "any" }), { contentType: "application/json" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mustChangePassword: true });
  assert.equal(cookieCall[0], "staff_session");
  assert.equal(cookieCall[1], "signed-session-token");
  assert.equal(cookieCall[2].httpOnly, true);
  assert.equal(cookieCall[2].sameSite, "lax");
});

test("logout clears the session cookie and rejects cross-origin requests", async () => {
  let cookieCall;
  const handler = createLogoutHandler({
    getCookieStore: async () => ({ set: (...args) => { cookieCall = args; } }),
  });
  const forbidden = await handler(
    postRequest("", { origin: "https://attacker.example", contentType: "application/json" }),
  );
  assert.equal(forbidden.status, 403);

  const response = await handler(postRequest("", { contentType: "application/json" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(cookieCall[0], "staff_session");
  assert.equal(cookieCall[2].maxAge, 0);
});

test("change-password handler allows forced password updates and reports errors safely", async () => {
  let guardOptions;
  let calledWith;
  const handler = createChangePasswordHandler({
    guard: async (_request, options) => {
      guardOptions = options;
      return { id: "staff-handler-test" };
    },
    changePasswordFn: async (...args) => {
      calledWith = args;
      return { ok: true };
    },
  });
  const response = await handler(
    postRequest(
      JSON.stringify({ currentPassword: "current", newPassword: "new" }),
      { contentType: "application/json" },
    ),
  );

  assert.deepEqual(guardOptions, { allowPasswordChange: true });
  assert.deepEqual(calledWith, ["staff-handler-test", "current", "new"]);
  assert.deepEqual(await response.json(), { ok: true });
});

test("me returns only the documented identity and password-change flag", async () => {
  const handler = createMeHandler({
    guard: async () => ({
      id: "staff-handler-test",
      full_name: "Staff Name",
      email: "staff@example.test",
      role: "super_admin",
      must_change_password: true,
      password_hash: "secret-hash",
      is_active: true,
      failed_login_count: 4,
    }),
  });
  const response = await handler(new Request("http://localhost:3000/api/admin/auth/me"));
  assert.deepEqual(await response.json(), {
    fullName: "Staff Name",
    email: "staff@example.test",
    role: "super_admin",
    mustChangePassword: true,
  });
});
