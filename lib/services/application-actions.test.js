import assert from "node:assert/strict";
import test from "node:test";
import {
  addApplicationInternalNote,
  assignApplication,
  changeApplicationStatus,
  unassignApplication,
} from "./applications.js";

const applicationId = "22222222-2222-4222-8222-222222222222";
const reviewerId = "11111111-1111-4111-8111-111111111111";
const assigneeId = "33333333-3333-4333-8333-333333333333";

function makeActionDb({
  application = {
    id: applicationId,
    application_type: "member",
    status: "under_review",
    governorate_id: 4,
    internal_notes: null,
    assigned_to: null,
    reviewed_by: null,
    reviewed_at: null,
  },
  assignees = {},
  failMember = false,
  failHistory = false,
} = {}) {
  const state = {
    application: structuredClone(application),
    members: [],
    history: [],
    assignees: structuredClone(assignees),
    historyLockTail: Promise.resolve(),
    noteLockCalls: 0,
  };

  function txFor(releaseRef) {
    return {
      $queryRaw: async (strings, id) => {
        const query = strings.join("");
        if (query.includes('"internal_notes"')) {
          state.noteLockCalls += 1;
          let release;
          const previous = state.historyLockTail;
          state.historyLockTail = new Promise((resolve) => { release = resolve; });
          await previous;
          releaseRef.release = release;
          return state.application?.id === id
            ? [{ internal_notes: state.application.internal_notes }]
            : [];
        }
        if (query.includes('"staff_users"')) {
          const assignee = state.assignees[id];
          return assignee ? [{ role: assignee.role, is_active: assignee.is_active }] : [];
        }
        throw new Error("Unexpected raw query in test mock");
      },
      membership_applications: {
        findUnique: async ({ where }) =>
          state.application?.id === where.id
            ? structuredClone(state.application)
            : null,
        updateMany: async ({ where, data }) => {
          if (
            state.application?.id !== where.id ||
            (where.status !== undefined && state.application.status !== where.status)
          ) return { count: 0 };
          Object.assign(state.application, data);
          return { count: 1 };
        },
        update: async ({ where, data }) => {
          if (state.application?.id !== where.id) throw new Error("record not found");
          Object.assign(state.application, data);
          return { id: state.application.id };
        },
      },
      members: {
        create: async ({ data }) => {
          if (failMember) throw new Error("member insert failed");
          const member = { ...data, membership_no: 123n };
          state.members.push(member);
          return { membership_no: member.membership_no };
        },
      },
      application_status_history: {
        create: async ({ data }) => {
          if (failHistory) throw new Error("history insert failed");
          state.history.push(data);
          return data;
        },
      },
    };
  }

  const db = {
    $transaction: async (callback) => {
      const releaseRef = {};
      const before = structuredClone({
        application: state.application,
        members: state.members,
        history: state.history,
      });
      try {
        return await callback(txFor(releaseRef));
      } catch (error) {
        state.application = before.application;
        state.members = before.members;
        state.history = before.history;
        throw error;
      } finally {
        releaseRef.release?.();
      }
    },
  };
  return { db, state };
}

test("moves new applications to under_review and records reviewer and history", async () => {
  const { db, state } = makeActionDb({ application: { ...makeActionDb().state.application, status: "new" } });
  const result = await changeApplicationStatus(applicationId, "under_review", reviewerId, undefined, db);
  assert.deepEqual(result, { ok: true, status: "under_review", membershipNo: null });
  assert.equal(state.application.reviewed_by, reviewerId);
  assert.ok(state.application.reviewed_at instanceof Date);
  assert.deepEqual(state.history, [{
    application_id: applicationId,
    from_status: "new",
    to_status: "under_review",
    changed_by: reviewerId,
    note: null,
  }]);
});

test("accepts member, volunteer, and follower with the correct membership behavior", async (t) => {
  for (const applicationType of ["member", "volunteer", "follower"]) {
    await t.test(applicationType, async () => {
      const { db, state } = makeActionDb({
        application: { ...makeActionDb().state.application, application_type: applicationType },
      });
      const result = await changeApplicationStatus(applicationId, "accepted", reviewerId, undefined, db);
      assert.equal(result.ok, true);
      assert.equal(state.application.status, "accepted");
      assert.equal(state.history.length, 1);
      assert.equal(state.members.length, applicationType === "member" ? 1 : 0);
      assert.equal(result.membershipNo, applicationType === "member" ? "123" : null);
    });
  }
});

test("rejects with a required reason saved on the application and status history", async () => {
  const { db, state } = makeActionDb();
  const result = await changeApplicationStatus(applicationId, "rejected", reviewerId, "Missing documents", db);
  assert.deepEqual(result, { ok: true, status: "rejected", membershipNo: null });
  assert.equal(state.application.rejection_reason, "Missing documents");
  assert.equal(state.application.reviewed_by, reviewerId);
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].from_status, "under_review");
  assert.equal(state.history[0].to_status, "rejected");
  assert.equal(state.history[0].note, "Missing documents");
});

test("accepts the maximum rejection reason length", async () => {
  const { db, state } = makeActionDb();
  const reason = "r".repeat(1000);
  const result = await changeApplicationStatus(applicationId, "rejected", reviewerId, reason, db);
  assert.equal(result.ok, true);
  assert.equal(state.application.rejection_reason.length, 1000);
  assert.equal(state.history[0].note.length, 1000);
});

test("rejects invalid status transitions and invalid rejection reasons without history", async () => {
  for (const [status, target, reason] of [
    ["new", "accepted", undefined],
    ["accepted", "rejected", "reason"],
    ["rejected", "under_review", undefined],
  ]) {
    const { db, state } = makeActionDb({ application: { ...makeActionDb().state.application, status } });
    const result = await changeApplicationStatus(applicationId, target, reviewerId, reason, db);
    assert.equal(result.ok, false);
    assert.equal(result.code, "INVALID_STATUS");
    assert.equal(state.history.length, 0);
  }
  const { db } = makeActionDb();
  assert.equal((await changeApplicationStatus(applicationId, "rejected", reviewerId, "  ", db)).code, "INVALID_REJECTION_REASON");
  assert.equal((await changeApplicationStatus(applicationId, "rejected", reviewerId, "x".repeat(1001), db)).code, "INVALID_REJECTION_REASON");
});

test("only one concurrent transition can update a status and write history", async () => {
  const { db, state } = makeActionDb();
  const results = await Promise.all([
    changeApplicationStatus(applicationId, "accepted", reviewerId, undefined, db),
    changeApplicationStatus(applicationId, "rejected", reviewerId, "reason", db),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(state.history.length, 1);
  assert.equal(state.application.status, state.history[0].to_status);
});

test("membership and history failures roll back the complete acceptance", async (t) => {
  for (const option of ["failMember", "failHistory"]) {
    await t.test(option, async () => {
      const { db, state } = makeActionDb({ [option]: true });
      await assert.rejects(
        changeApplicationStatus(applicationId, "accepted", reviewerId, undefined, db),
        /insert failed/,
      );
      assert.equal(state.application.status, "under_review");
      assert.equal(state.members.length, 0);
      assert.equal(state.history.length, 0);
    });
  }
});

test("appends notes without status history and serializes concurrent appends", async () => {
  const firstNote = makeActionDb();
  assert.equal(
    (await addApplicationInternalNote(applicationId, "First note", firstNote.db)).ok,
    true,
  );
  assert.equal(firstNote.state.application.internal_notes, "First note");

  const { db, state } = makeActionDb({
    application: { ...makeActionDb().state.application, internal_notes: "Earlier note" },
  });
  const results = await Promise.all([
    addApplicationInternalNote(applicationId, "First addition", db),
    addApplicationInternalNote(applicationId, "Second addition", db),
  ]);
  assert.equal(results.every((result) => result.ok), true);
  assert.match(state.application.internal_notes, /^Earlier note\n/);
  assert.ok(state.application.internal_notes.includes("\n"));
  assert.ok(!state.application.internal_notes.includes("\\n"));
  assert.match(state.application.internal_notes, /First addition/);
  assert.match(state.application.internal_notes, /Second addition/);
  assert.equal(state.noteLockCalls, 2);
  assert.equal(state.history.length, 0);
  assert.equal((await addApplicationInternalNote(applicationId, "n".repeat(1000), db)).ok, true);
  assert.equal((await addApplicationInternalNote(applicationId, "  ", db)).code, "INVALID_NOTE");
  assert.equal((await addApplicationInternalNote(applicationId, "x".repeat(1001), db)).code, "INVALID_NOTE");
});

test("returns not found for a missing application on status, note, and assignment actions", async () => {
  const { db } = makeActionDb({ application: null, assignees: { [assigneeId]: { role: "super_admin", is_active: true } } });
  assert.equal((await changeApplicationStatus(applicationId, "under_review", reviewerId, undefined, db)).code, "NOT_FOUND");
  assert.equal((await addApplicationInternalNote(applicationId, "note", db)).code, "NOT_FOUND");
  assert.equal((await assignApplication(applicationId, assigneeId, db)).code, "NOT_FOUND");
  assert.equal((await unassignApplication(applicationId, db)).code, "NOT_FOUND");
});

test("assignment accepts active authorized staff, can be removed, and rejects ineligible staff", async () => {
  const { db, state } = makeActionDb({
    assignees: {
      [assigneeId]: { role: "super_admin", is_active: true },
      "44444444-4444-4444-8444-444444444444": { role: "news_editor", is_active: true },
      "55555555-5555-4555-8555-555555555555": { role: "super_admin", is_active: false },
    },
  });
  assert.deepEqual(await assignApplication(applicationId, assigneeId, db), { ok: true, assignedTo: assigneeId });
  assert.equal(state.application.assigned_to, assigneeId);
  assert.deepEqual(await unassignApplication(applicationId, db), { ok: true, assignedTo: null });
  assert.equal(state.application.assigned_to, null);
  assert.equal((await assignApplication(applicationId, "66666666-6666-4666-8666-666666666666", db)).code, "ASSIGNEE_NOT_FOUND");
  assert.equal((await assignApplication(applicationId, "55555555-5555-4555-8555-555555555555", db)).code, "ASSIGNEE_INACTIVE");
  assert.equal((await assignApplication(applicationId, "44444444-4444-4444-8444-444444444444", db)).code, "ASSIGNEE_UNAUTHORIZED");
  assert.equal(state.history.length, 0);
});
