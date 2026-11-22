import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/auth_tests";
process.env.SESSION_SECRET ??= "guard-test-session-secret-with-32-bytes";
const { requireStaff } = await import("./guard.js");
const { createSessionToken, SESSION_COOKIE_NAME } = await import("./session.js");

function requestFor(token, method = "GET", origin = "http://localhost:3000") {
  const headers = new Headers({ host: "localhost:3000" });
  if (origin) headers.set("origin", origin);
  const cookies = new Map(token ? [[SESSION_COOKIE_NAME, { value: token }]] : []);
  return {
    url: "http://localhost:3000/api/admin/protected",
    method,
    headers,
    cookies: { get: (name) => cookies.get(name) },
  };
}

function dbFor(staff) {
  return {
    staff_users: {
      async findUnique() {
        return staff;
      },
    },
  };
}

const baseStaff = {
  id: "staff-guard-test",
  full_name: "Test Staff",
  email: "staff@example.test",
  role: "super_admin",
  is_active: true,
  must_change_password: false,
};

test("requires a valid session cookie and clears malformed tokens", async () => {
  const missing = await requireStaff(requestFor(null), { db: dbFor(baseStaff) });
  assert.equal(missing.status, 401);

  const malformed = await requireStaff(
    requestFor("not-a-token"),
    { db: dbFor(baseStaff) },
  );
  assert.equal(malformed.status, 401);
  assert.match(malformed.headers.get("set-cookie"), /Max-Age=0/i);
});

test("reloads the staff record and blocks disabled staff immediately", async () => {
  const token = await createSessionToken(baseStaff.id);
  const disabled = await requireStaff(
    requestFor(token),
    { db: dbFor({ ...baseStaff, is_active: false }) },
  );
  assert.equal(disabled.status, 401);
  assert.match(disabled.headers.get("set-cookie"), /Max-Age=0/i);
});

test("enforces password change and permissions on every request", async () => {
  const token = await createSessionToken(baseStaff.id);
  const mustChange = await requireStaff(
    requestFor(token),
    { db: dbFor({ ...baseStaff, must_change_password: true }) },
  );
  assert.equal(mustChange.status, 403);
  assert.deepEqual(await mustChange.json(), { error: "PASSWORD_CHANGE_REQUIRED" });

  const allowed = await requireStaff(requestFor(token), {
    permission: "staff:manage",
    db: dbFor(baseStaff),
  });
  assert.equal(allowed.id, baseStaff.id);

  const forbidden = await requireStaff(requestFor(token), {
    permission: "staff:manage",
    db: dbFor({ ...baseStaff, role: "news_editor" }),
  });
  assert.equal(forbidden.status, 403);
});

test("requires same-origin requests for mutations", async () => {
  const token = await createSessionToken(baseStaff.id);
  const crossOrigin = await requireStaff(
    requestFor(token, "POST", "https://attacker.example"),
    { db: dbFor(baseStaff) },
  );
  assert.equal(crossOrigin.status, 403);

  const missingOrigin = await requireStaff(
    requestFor(token, "PATCH", null),
    { db: dbFor(baseStaff) },
  );
  assert.equal(missingOrigin.status, 403);
});
