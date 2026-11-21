import assert from "node:assert/strict";
import test from "node:test";
import { verifyPassword } from "../auth/password.js";
import {
  createStaff,
  getAuditActionLabel,
  listStaffAuditActionTypes,
  listStaffAuditLog,
  resetStaffPassword,
  setStaffActive,
  updateStaff,
} from "./staff.js";

const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Admin User",
  email: "admin@example.test",
};
const adminA = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Admin A",
  email: "a@example.test",
  role: "super_admin",
  is_active: true,
  created_at: new Date("2026-01-01T00:00:00Z"),
  last_login_at: null,
  must_change_password: false,
};
const adminB = { ...adminA, id: "33333333-3333-4333-8333-333333333333", email: "b@example.test" };

function makeDb(initial = [], { failAudit = false } = {}) {
  const state = { staff: structuredClone(initial), audit: [], lockCalls: 0 };
  let lockQueue = Promise.resolve();
  const project = (row, select) => select
    ? Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, row[key]]))
    : row;
  function createTransactionClient(releaseLockRef) {
    return {
    $queryRaw: async () => {
      state.lockCalls += 1;
      let release;
      const previous = lockQueue;
      lockQueue = new Promise((resolve) => { release = resolve; });
      await previous;
      releaseLockRef.release = release;
      return [];
    },
    staff_users: {
      findUnique: async ({ where, select }) => {
        const row = state.staff.find((item) => item.id === where.id);
        return row ? project(row, select) : null;
      },
      findMany: async ({ skip, take, select }) => state.staff.slice(skip, skip + take).map((row) => project(row, select)),
      count: async ({ where } = {}) => state.staff.filter((row) =>
        !where || (row.role === where.role && row.is_active === where.is_active)
      ).length,
      create: async ({ data, select }) => {
        if (state.staff.some((row) => row.email === data.email)) {
          const error = new Error("unique");
          error.code = "P2002";
          throw error;
        }
        const row = { id: `new-${state.staff.length + 1}`, created_at: new Date(), last_login_at: null, ...data };
        state.staff.push(row);
        return project(row, select);
      },
      update: async ({ where, data, select }) => {
        const row = state.staff.find((item) => item.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return project(row, select);
      },
    },
    staff_audit_log: {
      create: async ({ data }) => {
        if (failAudit) throw new Error("audit insert failed");
        const item = { id: BigInt(state.audit.length + 1), occurred_at: new Date(), ...data };
        state.audit.push(item);
        return item;
      },
    },
    };
  }
  const tx = createTransactionClient({});
  const db = {
    ...tx,
    $transaction: async (callback) => {
      const releaseRef = {};
      const staffBefore = structuredClone(state.staff);
      const auditBefore = structuredClone(state.audit);
      try {
        return await callback(createTransactionClient(releaseRef));
      } catch (error) {
        state.staff.splice(0, state.staff.length, ...staffBefore);
        state.audit.splice(0, state.audit.length, ...auditBefore);
        throw error;
      } finally {
        releaseRef.release?.();
      }
    },
    staff_audit_log: {
      findMany: async ({ skip, take }) => state.audit.slice(skip, skip + take),
      count: async () => state.audit.length,
    },
  };
  return { db, state };
}

test("create stores only a password hash and audits in the same transaction", async () => {
  const { db, state } = makeDb();
  const created = await createStaff({
    full_name: "New Staff",
    email: "new@example.test",
    role: "news_editor",
    temporary_password: "StrongPassword1",
  }, actor, db);
  assert.equal(created.must_change_password, true);
  assert.equal(Object.hasOwn(created, "password_hash"), false);
  assert.equal(await verifyPassword("StrongPassword1", state.staff[0].password_hash), true);
  assert.equal(state.audit.length, 1);
  assert.equal(state.audit[0].action_type, "staff_created");
  assert.deepEqual(state.audit[0].details, { new_role: "news_editor", new_is_active: true });
});

test("combined profile and role patch emits both audit actions", async () => {
  const { db, state } = makeDb([adminA, adminB]);
  const result = await updateStaff(adminB.id, {
    full_name: "Updated Name",
    email: "updated@example.test",
    role: "news_reviewer",
  }, actor, db);
  assert.equal(result.ok, true);
  assert.equal(result.staff.full_name, "Updated Name");
  assert.deepEqual(state.audit.map((entry) => entry.action_type), ["staff_profile_updated", "staff_role_changed"]);
  assert.deepEqual(state.audit[0].details, { changed_fields: ["full_name", "email"] });
  assert.deepEqual(state.audit[1].details, { previous_role: "super_admin", new_role: "news_reviewer" });
});

test("concurrent role and status changes share the last-admin transaction lock", async () => {
  const { db, state } = makeDb([adminA, adminB]);
  const results = await Promise.all([
    updateStaff(adminA.id, { role: "news_reviewer" }, actor, db),
    setStaffActive(adminB.id, false, actor, db),
  ]);
  assert.equal(state.lockCalls, 2);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => result.code === "LAST_ACTIVE_SUPER_ADMIN").length, 1);
  assert.equal(state.staff.filter((row) => row.role === "super_admin" && row.is_active).length, 1);
});

test("reset password forces change and never includes the hash in its result or audit", async () => {
  const staff = { ...adminA, password_hash: "old-hash" };
  const { db, state } = makeDb([staff]);
  const result = await resetStaffPassword(staff.id, "AnotherStrong1", actor, db);
  assert.equal(result.must_change_password, true);
  assert.equal(Object.hasOwn(result, "password_hash"), false);
  assert.equal(await verifyPassword("AnotherStrong1", state.staff[0].password_hash), true);
  assert.equal(state.audit[0].action_type, "staff_password_reset");
  assert.deepEqual(state.audit[0].details, {});
});

test("staff changes roll back when the audit insert fails", async () => {
  const { db, state } = makeDb([adminA, adminB], { failAudit: true });
  await assert.rejects(
    updateStaff(adminB.id, { full_name: "Should Roll Back" }, actor, db),
    /audit insert failed/,
  );
  assert.equal(state.staff.find((row) => row.id === adminB.id).full_name, adminB.full_name);
  assert.equal(state.audit.length, 0);
});

test("audit listing paginates and serializes BigInt identifiers", async () => {
  const { db, state } = makeDb();
  state.audit.push({ id: 9n, actor_id: actor.id, occurred_at: new Date(), action_type: "staff_created" });
  const page = await listStaffAuditLog({ page: 1, page_size: 1 }, db);
  assert.equal(page.items[0].id, "9");
  assert.equal(page.total, 1);
});

test("audit operation types come from all distinct database values with safe labels", async () => {
  const seen = [];
  const options = await listStaffAuditActionTypes({
    staff_audit_log: {
      groupBy: async (query) => {
        seen.push(query);
        return [
          { action_type: "content_unpublished" },
          { action_type: "staff_created" },
          { action_type: "new_action_type" },
        ];
      },
    },
  });
  assert.deepEqual(seen, [{ by: ["action_type"], orderBy: { action_type: "asc" } }]);
  assert.deepEqual(options, [
    { value: "content_unpublished", label: "إلغاء نشر محتوى" },
    { value: "staff_created", label: "إنشاء حساب موظف" },
    { value: "new_action_type", label: "إجراء إداري آخر" },
  ]);
  assert.notEqual(getAuditActionLabel("future_action"), "future_action");
  for (const actionType of [
    "staff_created",
    "staff_profile_updated",
    "staff_role_changed",
    "staff_activated",
    "staff_deactivated",
    "staff_password_reset",
    "content_created",
    "content_updated",
    "content_published",
    "content_unpublished",
    "content_deleted",
  ]) {
    assert.notEqual(getAuditActionLabel(actionType), actionType);
  }
});

test("audit executor and action filters share the same database where for records and count", async () => {
  let findQuery;
  let countQuery;
  const where = { actor_id: actor.id, action_type: "content_created" };
  const db = {
    staff_audit_log: {
      findMany: async (query) => { findQuery = query; return []; },
      count: async (query) => { countQuery = query; return 0; },
    },
  };
  const filters = [
    [{ page: 1, page_size: 10, actor_id: actor.id }, { actor_id: actor.id }],
    [{ page: 1, page_size: 10, action_type: "content_created" }, { action_type: "content_created" }],
    [{ page: 2, page_size: 10, actor_id: actor.id, action_type: "content_created" }, where],
  ];
  for (const [query, expectedWhere] of filters) {
    await listStaffAuditLog(query, db);
    assert.deepEqual(findQuery.where, expectedWhere);
    assert.deepEqual(countQuery.where, expectedWhere);
  }
  assert.equal(findQuery.skip, 10);
  assert.equal(await listStaffAuditLog({ page: 1, page_size: 10, actor_id: actor.id, action_type: "content_created" }, db).then(({ total }) => total), 0);
});
