import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../auth/password.js";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/auth_tests";
const { login, changePassword } = await import("./auth.js");

function makeDb(user, hooks = {}) {
  const state = { user: structuredClone(user), updates: [], failedUpdates: 0 };
  return {
    state,
    staff_users: {
      async findUnique() {
        return state.user ? structuredClone(state.user) : null;
      },
      async update({ data }) {
        state.updates.push(data);
        if (data.failed_login_count === 0) state.user.failed_login_count = 0;
        if ("locked_until" in data) state.user.locked_until = data.locked_until;
        if ("last_login_at" in data) state.user.last_login_at = data.last_login_at;
        if ("password_hash" in data) state.user.password_hash = data.password_hash;
        if ("must_change_password" in data) {
          state.user.must_change_password = data.must_change_password;
        }
        return { failed_login_count: state.user.failed_login_count };
      },
      async updateMany({ where, data }) {
        if (hooks.beforeSuccessfulUpdate) await hooks.beforeSuccessfulUpdate();
        if (!state.user || state.user.id !== where.id) return { count: 0 };
        if (where.is_active === true && !state.user.is_active) return { count: 0 };
        if (where.failed_login_count && state.user.failed_login_count >= where.failed_login_count.lt) {
          return { count: 0 };
        }
        if (where.OR && state.user.locked_until && state.user.locked_until.getTime() > where.OR[1].locked_until.lte.getTime()) {
          return { count: 0 };
        }
        state.updates.push(data);
        Object.assign(state.user, data);
        return { count: 1 };
      },
    },
    async $queryRaw(strings, ...values) {
      const id = values[0];
      const now = values[1];
      await hooks.beforeFailedUpdate?.();
      const current = state.user;
      if (
        !current || current.id !== id || !current.is_active ||
        current.failed_login_count >= 5 ||
        (current.locked_until && current.locked_until > now)
      ) return [];
      state.failedUpdates += 1;
      current.failed_login_count += 1;
      if (current.failed_login_count >= 5) {
        current.failed_login_count = 0;
        current.locked_until = new Date(now.getTime() + 15 * 60 * 1000);
      }
      return [{
        failed_login_count: current.failed_login_count,
        locked_until: current.locked_until,
      }];
    },
  };
}

async function createUser(overrides = {}) {
  return {
    id: "staff-auth-test",
    email: `auth-${crypto.randomUUID()}@example.test`,
    role: "super_admin",
    is_active: true,
    password_hash: await hashPassword("CorrectPassword123"),
    must_change_password: true,
    failed_login_count: 0,
    locked_until: null,
    ...overrides,
  };
}

test("logs in with a normalized email and resets lockout fields", async () => {
  const user = await createUser();
  const db = makeDb(user);
  const result = await login(
    `  ${user.email.toUpperCase()} `,
    "CorrectPassword123",
    "192.0.2.20",
    db,
    () => 1_700_000_000_000,
  );

  assert.deepEqual(result, {
    ok: true,
    staffId: user.id,
    mustChangePassword: true,
  });
  assert.equal(db.state.user.failed_login_count, 0);
  assert.equal(db.state.user.locked_until, null);
  assert.equal(db.state.user.last_login_at.getTime(), 1_700_000_000_000);
});

test("uses one generic credential error for unknown, inactive, and unknown-role accounts", async () => {
  const absentDb = makeDb(null);
  const absent = await login(
    "absent@example.test",
    "IncorrectPassword123",
    "192.0.2.21",
    absentDb,
  );
  assert.deepEqual(absent, { ok: false, code: "INVALID_CREDENTIALS" });

  for (const overrides of [
    { is_active: false },
    { role: "unknown_role" },
    { password_hash: null },
  ]) {
    const db = makeDb(await createUser(overrides));
    const result = await login(
      db.state.user.email,
      "IncorrectPassword123",
      `192.0.2.${22 + Math.floor(Math.random() * 100)}`,
      db,
    );
    assert.deepEqual(result, { ok: false, code: "INVALID_CREDENTIALS" });
  }
});

test("atomically increments failures and locks on the fifth wrong password", async () => {
  const user = await createUser();
  const db = makeDb(user);
  let result;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    result = await login(
      user.email,
      "WrongPassword123",
      "192.0.2.50",
      db,
      () => 1_700_000_000_000,
    );
  }

  assert.deepEqual(result, { ok: false, code: "INVALID_CREDENTIALS" });
  assert.equal(db.state.failedUpdates, 5);
  assert.equal(db.state.user.failed_login_count, 0);
  assert.equal(db.state.user.locked_until.getTime(), 1_700_000_900_000);
});

test("successful login cannot clear a lock set by the concurrent fifth failure", async () => {
  const user = await createUser({ failed_login_count: 4 });
  let successUpdateReached;
  let releaseSuccessUpdate;
  const reached = new Promise((resolve) => { successUpdateReached = resolve; });
  const release = new Promise((resolve) => { releaseSuccessUpdate = resolve; });
  const db = makeDb(user, {
    beforeSuccessfulUpdate: async () => {
      successUpdateReached();
      await release;
    },
  });
  const fixedNow = () => 1_700_000_000_000;
  const goodLogin = login(user.email, "CorrectPassword123", "192.0.2.151", db, fixedNow);
  await reached;
  const fifthFailure = await login(user.email, "WrongPassword123", "192.0.2.152", db, fixedNow);
  assert.equal(fifthFailure.code, "INVALID_CREDENTIALS");
  assert.ok(db.state.user.locked_until);
  releaseSuccessUpdate();
  const success = await goodLogin;
  assert.equal(success.ok, false);
  assert.equal(db.state.user.locked_until.getTime(), 1_700_000_900_000);
});

test("concurrent failed logins stop changing the account once locked", async () => {
  const user = await createUser({ failed_login_count: 3 });
  const db = makeDb(user);
  const fixedNow = () => 1_700_000_000_000;
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    login(user.email, "WrongPassword123", `198.51.100.${index + 1}`, db, fixedNow),
  ));
  assert.ok(results.some((result) => result.code === "INVALID_CREDENTIALS"));
  assert.equal(db.state.failedUpdates, 2);
  assert.equal(db.state.user.failed_login_count, 0);
  assert.equal(db.state.user.locked_until.getTime(), 1_700_000_900_000);
});

test("does not issue login success when the conditional update affects no row", async () => {
  const user = await createUser();
  const db = makeDb(user);
  db.staff_users.updateMany = async () => ({ count: 0 });
  const result = await login(user.email, "CorrectPassword123", "192.0.2.153", db);
  assert.deepEqual(result, { ok: false, code: "INVALID_CREDENTIALS" });
});

test("returns lock time even when the submitted password is correct", async () => {
  const user = await createUser({
    locked_until: new Date(1_700_000_120_000),
  });
  const db = makeDb(user);
  const result = await login(
    user.email,
    "CorrectPassword123",
    "192.0.2.60",
    db,
    () => 1_700_000_000_000,
  );
  assert.deepEqual(result, {
    ok: false,
    code: "ACCOUNT_LOCKED",
    retryAfterSeconds: 120,
  });
});

test("rate limits login attempts by IP and normalized email", async () => {
  const user = await createUser();
  const db = makeDb(user);
  let fifth;
  let sixth;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await login(
      user.email,
      "WrongPassword123",
      "192.0.2.70",
      db,
    );
    if (attempt === 4) fifth = result;
    if (attempt === 5) sixth = result;
  }
  assert.equal(fifth.code, "INVALID_CREDENTIALS");
  assert.equal(sixth.code, "RATE_LIMITED");
  assert.equal(sixth.retryAfterSeconds > 0, true);
});

test("IP rate limit takes precedence for unknown accounts without revealing existence", async () => {
  const db = makeDb(null);
  let last;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    last = await login(
      `unknown-${attempt}@example.test`,
      "IncorrectPassword123",
      "203.0.113.222",
      db,
    );
  }
  assert.equal(last.code, "RATE_LIMITED");
});

test("changes password only after current password and strength checks", async () => {
  const user = await createUser();
  const db = makeDb(user);

  assert.deepEqual(
    await changePassword(
      user.id,
      "WrongPassword123",
      "NewPassword456",
      db,
    ),
    { ok: false, code: "INVALID_CURRENT_PASSWORD" },
  );
  assert.deepEqual(
    await changePassword(user.id, "CorrectPassword123", "weak", db),
    { ok: false, code: "WEAK_PASSWORD", errors: [
      "كلمة المرور يجب أن تكون 10 أحرف على الأقل.",
      "كلمة المرور يجب أن تحتوي على رقم.",
    ] },
  );
  assert.deepEqual(
    await changePassword(
      user.id,
      "CorrectPassword123",
      "NewPassword456",
      db,
    ),
    { ok: true },
  );
  assert.equal(db.state.user.must_change_password, false);
  assert.equal(
    await verifyPassword("NewPassword456", db.state.user.password_hash),
    true,
  );
});
