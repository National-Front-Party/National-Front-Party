import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  clearStaffAuditLog,
  createStaff,
  deleteStaff,
  deleteStaffAuditLog,
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
  const state = {
    staff: structuredClone(initial),
    audit: [],
    lockCalls: 0,
    rowLockCalls: 0,
    operations: [],
    deletedTables: [],
  };
  let lockQueue = Promise.resolve();
  const project = (row, select) => select
    ? Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, row[key]]))
    : row;
  function createTransactionClient(releaseLockRef) {
    return {
    $queryRaw: async (strings, ...values) => {
      const sql = strings.join("");
      if (sql.includes("pg_advisory_xact_lock")) {
        state.lockCalls += 1;
        state.operations.push("advisory_lock");
        let release;
        const previous = lockQueue;
        lockQueue = new Promise((resolve) => { release = resolve; });
        await previous;
        releaseLockRef.release = release;
        return [];
      }
      if (sql.includes("FOR UPDATE")) {
        state.rowLockCalls += 1;
        state.operations.push("target_row_lock");
        const row = state.staff.find((item) => item.id === values[0]);
        return row
          ? [{
              id: row.id,
              full_name: row.full_name,
              email: row.email,
              role: row.role,
              is_active: row.is_active,
            }]
          : [];
      }
      throw new Error(`Unexpected raw query: ${sql}`);
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
      delete: async ({ where }) => {
        const index = state.staff.findIndex((item) => item.id === where.id);
        if (index < 0) throw new Error("not found");
        state.deletedTables.push("staff_users");
        return state.staff.splice(index, 1)[0];
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

const deletionActor = {
  ...adminA,
  id: actor.id,
  full_name: actor.full_name,
  email: actor.email,
};
const inactiveWriter = { ...adminB, role: "news_editor", is_active: false };

test("inactive employee deletion records actor and target snapshots, then deletes only staff row", async () => {
  const { db, state } = makeDb([deletionActor, inactiveWriter]);
  const result = await deleteStaff(inactiveWriter.id, actor, db);

  assert.deepEqual(result, { ok: true });
  assert.equal(state.staff.some((staff) => staff.id === inactiveWriter.id), false);
  assert.equal(state.deletedTables.length, 1);
  assert.deepEqual(state.deletedTables, ["staff_users"]);
  assert.equal(state.audit.length, 1);
  assert.deepEqual(state.audit[0], {
    actor_id: deletionActor.id,
    actor_name: deletionActor.full_name,
    actor_email: deletionActor.email,
    actor_staff_user_id: deletionActor.id,
    target_id: inactiveWriter.id,
    target_name: inactiveWriter.full_name,
    target_email: inactiveWriter.email,
    target_staff_user_id: inactiveWriter.id,
    action_type: "staff_deleted",
    details: {},
    id: 1n,
    occurred_at: state.audit[0].occurred_at,
  });
  assert.equal(state.lockCalls, 1);
  assert.equal(state.rowLockCalls, 1);
  assert.deepEqual(state.operations, ["advisory_lock", "target_row_lock"]);
});

test("active, missing, self, and no-longer-authorized employee deletions are rejected", async () => {
  const activeTarget = { ...inactiveWriter, is_active: true };
  const activeDb = makeDb([deletionActor, activeTarget]);
  assert.deepEqual(await deleteStaff(activeTarget.id, actor, activeDb.db), {
    ok: false,
    code: "ACTIVE_STAFF",
  });
  assert.equal(activeDb.state.staff.some((staff) => staff.id === activeTarget.id), true);
  assert.equal(activeDb.state.audit.length, 0);

  const missingDb = makeDb([deletionActor]);
  assert.deepEqual(await deleteStaff(inactiveWriter.id, actor, missingDb.db), {
    ok: false,
    code: "NOT_FOUND",
  });

  const selfDb = makeDb([deletionActor]);
  assert.deepEqual(await deleteStaff(deletionActor.id, actor, selfDb.db), {
    ok: false,
    code: "SELF_DELETE_FORBIDDEN",
  });
  assert.equal(selfDb.state.staff.length, 1);

  for (const invalidActor of [
    null,
    { ...deletionActor, is_active: false },
    { ...deletionActor, role: "news_reviewer" },
  ]) {
    const records = [inactiveWriter];
    if (invalidActor) records.push(invalidActor);
    const invalidActorDb = makeDb(records);
    assert.deepEqual(await deleteStaff(inactiveWriter.id, actor, invalidActorDb.db), {
      ok: false,
      code: "FORBIDDEN",
    });
    assert.equal(invalidActorDb.state.staff.some((staff) => staff.id === inactiveWriter.id), true);
    assert.equal(invalidActorDb.state.audit.length, 0);
  }
});

test("deletion rolls back when its audit insert fails", async () => {
  const { db, state } = makeDb([deletionActor, inactiveWriter], { failAudit: true });
  await assert.rejects(deleteStaff(inactiveWriter.id, actor, db), /audit insert failed/);
  assert.equal(state.staff.some((staff) => staff.id === inactiveWriter.id), true);
  assert.equal(state.audit.length, 0);
});

test("deletion serializes with concurrent activation and role changes", async () => {
  const activationDb = makeDb([deletionActor, inactiveWriter]);
  const [deletion, activation] = await Promise.all([
    deleteStaff(inactiveWriter.id, actor, activationDb.db),
    setStaffActive(inactiveWriter.id, true, actor, activationDb.db),
  ]);
  assert.equal(activationDb.state.lockCalls, 2);
  if (deletion.ok) {
    assert.equal(activation.code, "NOT_FOUND");
    assert.equal(activationDb.state.staff.some((staff) => staff.id === inactiveWriter.id), false);
  } else {
    assert.equal(deletion.code, "ACTIVE_STAFF");
    assert.equal(activation.ok, true);
    assert.equal(activationDb.state.staff.find((staff) => staff.id === inactiveWriter.id).is_active, true);
  }

  const roleDb = makeDb([deletionActor, inactiveWriter]);
  const [roleDeletion, roleUpdate] = await Promise.all([
    deleteStaff(inactiveWriter.id, actor, roleDb.db),
    updateStaff(inactiveWriter.id, { role: "news_reviewer" }, actor, roleDb.db),
  ]);
  assert.equal(roleDb.state.lockCalls, 2);
  assert.equal(roleDeletion.ok, true);
  assert.ok(roleUpdate.ok || roleUpdate.code === "NOT_FOUND");
  assert.equal(roleDb.state.staff.some((staff) => staff.id === inactiveWriter.id), false);
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
    "staff_deleted",
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

async function makeAuditDeleteDb({ role = "super_admin", isActive = true } = {}) {
  const passwordHash = await hashPassword("StrongPassword1");
  const state = { audit: [{ id: 1n }, { id: 2n }] };
  const db = {
    staff_users: {
      findUnique: async () => ({
        id: actor.id,
        is_active: isActive,
        role,
        password_hash: passwordHash,
      }),
    },
    staff_audit_log: {
      deleteMany: async ({ where } = {}) => {
        if (!where || Object.keys(where).length === 0) {
          const count = state.audit.length;
          state.audit = [];
          return { count };
        }
        const before = state.audit.length;
        state.audit = state.audit.filter((item) => item.id !== where.id);
        return { count: before - state.audit.length };
      },
    },
  };
  return { db, state };
}

test("single audit deletion verifies password before deleting one record", async () => {
  const { db, state } = await makeAuditDeleteDb();
  assert.deepEqual(
    await deleteStaffAuditLog(1n, "WrongPassword1", actor, db),
    { ok: false, code: "INVALID_CURRENT_PASSWORD" },
  );
  assert.equal(state.audit.length, 2);
  assert.deepEqual(
    await deleteStaffAuditLog(1n, "StrongPassword1", actor, db),
    { ok: true, deleted: 1 },
  );
  assert.deepEqual(state.audit.map((item) => item.id), [2n]);
});

test("clearing audit records requires password and deletes all records", async () => {
  const { db, state } = await makeAuditDeleteDb();
  assert.deepEqual(
    await clearStaffAuditLog("WrongPassword1", actor, db),
    { ok: false, code: "INVALID_CURRENT_PASSWORD" },
  );
  assert.equal(state.audit.length, 2);
  assert.deepEqual(
    await clearStaffAuditLog("StrongPassword1", actor, db),
    { ok: true, deleted: 2 },
  );
  assert.equal(state.audit.length, 0);
});

test("non-super-admin and inactive sessions cannot delete audit records", async () => {
  const nonAdmin = await makeAuditDeleteDb({ role: "news_editor" });
  assert.deepEqual(
    await clearStaffAuditLog("StrongPassword1", actor, nonAdmin.db),
    { ok: false, code: "FORBIDDEN" },
  );
  assert.equal(nonAdmin.state.audit.length, 2);

  const inactive = await makeAuditDeleteDb({ isActive: false });
  assert.deepEqual(
    await clearStaffAuditLog("StrongPassword1", actor, inactive.db),
    { ok: false, code: "FORBIDDEN" },
  );
  assert.equal(inactive.state.audit.length, 2);
});
