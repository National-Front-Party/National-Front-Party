import assert from "node:assert/strict";
import test from "node:test";
import {
  createApplicationAssignmentHandler,
  createApplicationInternalNoteHandler,
  createApplicationStatusActionHandler,
} from "./action-handlers.js";

const staff = { id: "11111111-1111-4111-8111-111111111111", role: "membership_officer" };
const applicationId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ id: applicationId }) };

function request(method, url, body) {
  return new Request(url, {
    method,
    headers: {
      origin: "http://localhost",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("status action uses applications:update and returns a minimal response", async () => {
  let permission;
  let received;
  const handler = createApplicationStatusActionHandler({
    guard: async (_request, options) => { permission = options.permission; return staff; },
    changeStatusFn: async (...args) => {
      received = args;
      return { ok: true, status: "accepted", membershipNo: "123" };
    },
  });
  const response = await handler(request("PATCH", "http://localhost/api/admin/applications/id/status", { status: "accepted" }), context);
  assert.equal(permission, "applications:update");
  assert.deepEqual(received, [applicationId, "accepted", staff.id, undefined]);
  assert.deepEqual(await response.json(), { ok: true, status: "accepted", membership_no: "123" });
});

test("status action validates rejection payload and maps transition errors", async () => {
  const handler = createApplicationStatusActionHandler({
    guard: async () => staff,
    changeStatusFn: async () => ({ ok: false, code: "INVALID_STATUS" }),
  });
  const invalidBody = await handler(request("PATCH", "http://localhost/api/admin/applications/id/status", {
    status: "rejected",
    rejection_reason: " ",
  }), context);
  assert.equal(invalidBody.status, 400);

  const rejected = await handler(request("PATCH", "http://localhost/api/admin/applications/id/status", {
    status: "rejected",
    rejection_reason: "Incomplete application",
  }), context);
  assert.equal(rejected.status, 400);
  assert.deepEqual(await rejected.json(), { error: "INVALID_TRANSITION" });

  const conflictHandler = createApplicationStatusActionHandler({
    guard: async () => staff,
    changeStatusFn: async () => ({ ok: false, code: "CONFLICT" }),
  });
  assert.equal((await conflictHandler(request("PATCH", "http://localhost/api/admin/applications/id/status", { status: "accepted" }), context)).status, 409);
});

test("notes handler appends validated note content without returning it", async () => {
  let received;
  const handler = createApplicationInternalNoteHandler({
    guard: async (_request, options) => {
      assert.equal(options.permission, "applications:update");
      return staff;
    },
    addNoteFn: async (...args) => { received = args; return { ok: true }; },
  });
  const response = await handler(request("POST", "http://localhost/api/admin/applications/id/notes", { note: "  private note  " }), context);
  assert.deepEqual(received, [applicationId, "private note"]);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal((await handler(request("POST", "http://localhost/api/admin/applications/id/notes", { note: "  " }), context)).status, 400);
});

test("assignment validates UUID or null, maps missing assignee, and removes assignment", async () => {
  let assigned;
  let unassigned = false;
  const handler = createApplicationAssignmentHandler({
    guard: async () => staff,
    assignFn: async (...args) => { assigned = args; return { ok: false, code: "ASSIGNEE_NOT_FOUND" }; },
    unassignFn: async (...args) => { unassigned = args; return { ok: true, assignedTo: null }; },
  });
  const missingAssignee = await handler(request("PATCH", "http://localhost/api/admin/applications/id/assignment", {
    assigned_to: "33333333-3333-4333-8333-333333333333",
  }), context);
  assert.deepEqual(assigned, [applicationId, "33333333-3333-4333-8333-333333333333"]);
  assert.equal(missingAssignee.status, 404);

  const invalid = await handler(request("PATCH", "http://localhost/api/admin/applications/id/assignment", { assigned_to: "invalid" }), context);
  assert.equal(invalid.status, 400);
  const removed = await handler(request("PATCH", "http://localhost/api/admin/applications/id/assignment", { assigned_to: null }), context);
  assert.deepEqual(unassigned, [applicationId]);
  assert.deepEqual(await removed.json(), { ok: true, assigned_to: null });
});

test("unauthorized staff cannot perform any application action", async () => {
  const guard = async () => Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const status = createApplicationStatusActionHandler({ guard, changeStatusFn: async () => assert.fail("must not run") });
  const notes = createApplicationInternalNoteHandler({ guard, addNoteFn: async () => assert.fail("must not run") });
  const assignment = createApplicationAssignmentHandler({ guard, assignFn: async () => assert.fail("must not run") });
  assert.equal((await status(request("PATCH", "http://localhost/api/admin/applications/id/status", { status: "under_review" }), context)).status, 403);
  assert.equal((await notes(request("POST", "http://localhost/api/admin/applications/id/notes", { note: "note" }), context)).status, 403);
  assert.equal((await assignment(request("PATCH", "http://localhost/api/admin/applications/id/assignment", { assigned_to: null }), context)).status, 403);
});

test("unauthenticated actions return 401 and service errors do not expose details", async () => {
  const unauthenticatedHandler = createApplicationStatusActionHandler({
    guard: async () => Response.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    changeStatusFn: async () => { throw new Error("database details must stay private"); },
  });
  const response = await unauthenticatedHandler(
    request("PATCH", "http://localhost/api/admin/applications/id/status", { status: "accepted" }),
    context,
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "UNAUTHENTICATED" });

  const serverFailureHandler = createApplicationStatusActionHandler({
    guard: async () => staff,
    changeStatusFn: async () => { throw new Error("database details must stay private"); },
  });
  const serverFailure = await serverFailureHandler(
    request("PATCH", "http://localhost/api/admin/applications/id/status", { status: "accepted" }),
    context,
  );
  assert.equal(serverFailure.status, 500);
  assert.deepEqual(await serverFailure.json(), { error: "SERVER_ERROR" });

  const invalidId = await createApplicationStatusActionHandler({
    guard: async () => staff,
    changeStatusFn: async () => assert.fail("invalid ID must stop before service"),
  })(request("PATCH", "http://localhost/api/admin/applications/id/status", { status: "accepted" }), {
    params: Promise.resolve({ id: "not-a-uuid" }),
  });
  assert.equal(invalidId.status, 400);
});
