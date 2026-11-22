import assert from "node:assert/strict";
import test from "node:test";
import {
  createStaffAuditLogDeleteHandler,
  createStaffAuditLogHandler,
  createStaffCollectionHandlers,
  createStaffItemHandlers,
  createStaffResetPasswordHandler,
  createStaffStatusHandler,
} from "./handlers.js";

const superAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Admin",
  email: "admin@example.test",
  role: "super_admin",
};
const targetId = "22222222-2222-4222-8222-222222222222";
const safeStaff = {
  id: targetId,
  full_name: "Team Member",
  email: "team@example.test",
  role: "news_editor",
  is_active: true,
  must_change_password: true,
  created_at: "2026-11-17T00:00:00.000Z",
  last_login_at: null,
};

function request(method, url, body) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

function allowGuard(role = "super_admin") {
  return async () => role === "super_admin" ? superAdmin : Response.json({ error: "FORBIDDEN" }, { status: 403 });
}

test("all staff endpoints require the manage permission and reject non-admins", async () => {
  let requestedPermission;
  const guard = async (_request, options) => {
    requestedPermission = options.permission;
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  };
  const handlers = createStaffCollectionHandlers({ guard });
  const response = await handlers.GET(request("GET", "http://localhost:3000/api/admin/staff"));
  assert.equal(response.status, 403);
  assert.equal(requestedPermission, "staff:manage");
  const audit = createStaffAuditLogHandler({ guard });
  assert.equal((await audit(request("GET", "http://localhost:3000/api/admin/staff/audit-log"))).status, 403);
});

test("create validates, reports unique-email conflict, and never returns submitted password/hash", async () => {
  const handlers = createStaffCollectionHandlers({
    guard: allowGuard(),
    createFn: async (input) => {
      assert.equal(input.email, "new@example.test");
      return { ...safeStaff, email: input.email };
    },
  });
  const bad = await handlers.POST(request("POST", "http://localhost:3000/api/admin/staff", {
    full_name: "Staff",
    email: "x@example.test",
    role: "not_a_role",
    temporary_password: "StrongPassword1",
  }));
  assert.equal(bad.status, 400);

  const created = await handlers.POST(request("POST", "http://localhost:3000/api/admin/staff", {
    full_name: "Staff",
    email: " NEW@example.test ",
    role: "news_editor",
    temporary_password: "StrongPassword1",
  }));
  const text = await created.text();
  assert.equal(created.status, 201);
  assert.equal(text.includes("StrongPassword1"), false);
  assert.equal(text.includes("password_hash"), false);

  const duplicateHandlers = createStaffCollectionHandlers({
    guard: allowGuard(),
    createFn: async () => { const error = new Error(); error.code = "P2002"; throw error; },
  });
  const duplicate = await duplicateHandlers.POST(request("POST", "http://localhost:3000/api/admin/staff", {
    full_name: "Staff",
    email: "new@example.test",
    role: "news_editor",
    temporary_password: "StrongPassword1",
  }));
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: "EMAIL_ALREADY_EXISTS" });
});

test("staff list and detail endpoints paginate and return allowlisted staff fields", async () => {
  let listArgs;
  const collection = createStaffCollectionHandlers({
    guard: allowGuard(),
    listFn: async (args) => {
      listArgs = args;
      return { items: [safeStaff], ...args, total: 1 };
    },
  });
  const list = await collection.GET(request("GET", "http://localhost:3000/api/admin/staff?page=2&page_size=10"));
  assert.equal(list.status, 200);
  assert.deepEqual(listArgs, { page: 2, page_size: 10 });
  const listText = await list.text();
  assert.equal(listText.includes("password_hash"), false);
  assert.equal(listText.includes("failed_login_count"), false);

  const item = createStaffItemHandlers({ guard: allowGuard(), getFn: async () => safeStaff });
  const detail = await item.GET(request("GET", `http://localhost:3000/api/admin/staff/${targetId}`), {
    params: Promise.resolve({ id: targetId }),
  });
  assert.equal(detail.status, 200);
  assert.equal((await detail.text()).includes("password_hash"), false);
});

test("item patch can return only safe staff data and maps last-admin conflicts", async () => {
  const context = { params: Promise.resolve({ id: targetId }) };
  const handlers = createStaffItemHandlers({
    guard: allowGuard(),
    updateFn: async () => ({ ok: true, staff: safeStaff }),
  });
  const response = await handlers.PATCH(request("PATCH", "http://localhost:3000/api/admin/staff/id", { role: "news_reviewer" }), context);
  assert.equal(response.status, 200);
  assert.equal((await response.text()).includes("password_hash"), false);

  const protectedHandlers = createStaffItemHandlers({
    guard: allowGuard(),
    updateFn: async () => ({ ok: false, code: "LAST_ACTIVE_SUPER_ADMIN" }),
  });
  assert.equal((await protectedHandlers.PATCH(request("PATCH", "http://localhost:3000/api/admin/staff/id", { role: "news_reviewer" }), context)).status, 409);
});

test("item delete requires Super Admin authorization, valid id, and confirmation", async () => {
  const context = { params: Promise.resolve({ id: targetId }) };
  let deletedArgs;
  const handler = createStaffItemHandlers({
    guard: allowGuard(),
    deleteFn: async (...args) => {
      deletedArgs = args;
      return { ok: true };
    },
  });
  const allowed = await handler.DELETE(request("DELETE", `http://localhost:3000/api/admin/staff/${targetId}`, { confirm: true }), context);
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { ok: true });
  assert.deepEqual(deletedArgs, [targetId, superAdmin]);

  for (const role of ["news_editor", "news_reviewer"]) {
    const denied = createStaffItemHandlers({ guard: allowGuard(role) });
    assert.equal(
      (await denied.DELETE(request("DELETE", `http://localhost:3000/api/admin/staff/${targetId}`, { confirm: true }), context)).status,
      403,
    );
  }

  assert.equal(
    (await handler.DELETE(request("DELETE", "http://localhost:3000/api/admin/staff/not-a-uuid", { confirm: true }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    })).status,
    400,
  );
  assert.equal((await handler.DELETE(request("DELETE", `http://localhost:3000/api/admin/staff/${targetId}`, {}), context)).status, 400);
  assert.equal((await handler.DELETE(request("DELETE", `http://localhost:3000/api/admin/staff/${targetId}`, { confirm: false }), context)).status, 400);
});

test("item delete maps active, missing, self, and stale-actor failures", async () => {
  const context = { params: Promise.resolve({ id: targetId }) };
  const cases = [
    [{ ok: false, code: "ACTIVE_STAFF" }, 409, "ACTIVE_STAFF"],
    [{ ok: false, code: "NOT_FOUND" }, 404, "NOT_FOUND"],
    [{ ok: false, code: "SELF_DELETE_FORBIDDEN" }, 403, "SELF_DELETE_FORBIDDEN"],
    [{ ok: false, code: "FORBIDDEN" }, 403, "FORBIDDEN"],
  ];
  for (const [result, status, code] of cases) {
    const handler = createStaffItemHandlers({
      guard: allowGuard(),
      deleteFn: async () => result,
    });
    const response = await handler.DELETE(
      request("DELETE", `http://localhost:3000/api/admin/staff/${targetId}`, { confirm: true }),
      context,
    );
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: code });
  }
});

test("status, password reset, and paginated audit handlers expose safe results", async () => {
  const context = { params: Promise.resolve({ id: targetId }) };
  const status = createStaffStatusHandler({ guard: allowGuard(), setActiveFn: async () => ({ ok: true, staff: safeStaff }) });
  assert.equal((await status(request("PATCH", "http://localhost:3000/api/admin/staff/id/status", { is_active: false }), context)).status, 200);
  const reset = createStaffResetPasswordHandler({ guard: allowGuard(), resetFn: async () => safeStaff });
  const resetResponse = await reset(request("POST", "http://localhost:3000/api/admin/staff/id/reset-password", { temporary_password: "StrongPassword1" }), context);
  assert.equal(resetResponse.status, 200);
  assert.equal((await resetResponse.text()).includes("StrongPassword1"), false);

  const audit = createStaffAuditLogHandler({
    guard: allowGuard(),
    listFn: async ({ page, page_size }) => ({ items: [{ id: "1", action_type: "staff_created" }], page, page_size, total: 1 }),
    listActionTypesFn: async () => [{ value: "staff_created", label: "إنشاء حساب موظف" }],
  });
  const page = await audit(request("GET", "http://localhost:3000/api/admin/staff/audit-log?page=1&page_size=10"));
  assert.deepEqual(await page.json(), { items: [{ id: "1", action_type: "staff_created" }], page: 1, page_size: 10, total: 1, operation_types: [{ value: "staff_created", label: "إنشاء حساب موظف" }] });
});

test("audit handler validates dynamic operation type and passes it to the listing service", async () => {
  let received;
  const handler = createStaffAuditLogHandler({
    guard: allowGuard(),
    listActionTypesFn: async () => [{ value: "content_created", label: "إنشاء محتوى" }],
    listFn: async (filters) => { received = filters; return { items: [], page: filters.page, page_size: filters.page_size, total: 0 }; },
  });
  const valid = await handler(request("GET", "http://localhost:3000/api/admin/staff/audit-log?action_type=content_created"));
  assert.equal(valid.status, 200);
  assert.equal(received.action_type, "content_created");

  const invalid = await handler(request("GET", "http://localhost:3000/api/admin/staff/audit-log?action_type=not_supported"));
  assert.equal(invalid.status, 400);

  const newlyRecordedType = createStaffAuditLogHandler({
    guard: allowGuard(),
    listActionTypesFn: async () => [{ value: "future_action", label: "إجراء إداري آخر" }],
    listFn: async (filters) => ({ items: [], page: filters.page, page_size: filters.page_size, total: 0 }),
  });
  const futureResponse = await newlyRecordedType(request("GET", "http://localhost:3000/api/admin/staff/audit-log?action_type=future_action"));
  assert.equal(futureResponse.status, 200);
  assert.equal((await futureResponse.json()).operation_types[0].label, "إجراء إداري آخر");
});

test("audit deletion requires confirmation and admin password and maps failures safely", async () => {
  let requestedPermission;
  const guard = async (_request, options) => {
    requestedPermission = options.permission;
    return superAdmin;
  };
  let clearedPassword;
  let deletedArgs;
  const deleteUrl = "http://localhost:3000/api/admin/staff/audit-log";
  const body = { confirm: true, password: "StrongPassword1" };
  const handler = createStaffAuditLogDeleteHandler({
    guard,
    clearFn: async (password, staff) => {
      clearedPassword = password;
      assert.equal(staff.id, superAdmin.id);
      return { ok: true, deleted: 2 };
    },
    deleteFn: async (...args) => {
      deletedArgs = args;
      return { ok: true, deleted: 1 };
    },
  });

  const forbiddenGuard = async () => Response.json({ error: "FORBIDDEN" }, { status: 403 });
  assert.equal(
    (await createStaffAuditLogDeleteHandler({ guard: forbiddenGuard })(request("DELETE", deleteUrl, body))).status,
    403,
  );
  assert.equal(
    (await handler(request("DELETE", deleteUrl, { confirm: false, password: "StrongPassword1" }))).status,
    400,
  );

  const cleared = await handler(request("DELETE", deleteUrl, body));
  assert.equal(cleared.status, 200);
  assert.deepEqual(await cleared.json(), { ok: true, deleted: 2 });
  assert.equal(clearedPassword, "StrongPassword1");
  assert.equal(requestedPermission, "staff:manage");

  const item = await handler(request("DELETE", `${deleteUrl}/12`, body), {
    params: Promise.resolve({ id: "12" }),
  });
  assert.equal(item.status, 200);
  assert.deepEqual(deletedArgs, [12n, "StrongPassword1", superAdmin]);

  const invalidId = await handler(request("DELETE", `${deleteUrl}/abc`, body), {
    params: Promise.resolve({ id: "abc" }),
  });
  assert.equal(invalidId.status, 400);

  const wrongPassword = createStaffAuditLogDeleteHandler({
    guard,
    clearFn: async () => ({ ok: false, code: "INVALID_CURRENT_PASSWORD" }),
  });
  const wrongResponse = await wrongPassword(request("DELETE", deleteUrl, body));
  assert.equal(wrongResponse.status, 400);
  assert.deepEqual(await wrongResponse.json(), { error: "INVALID_CURRENT_PASSWORD" });

  const missing = createStaffAuditLogDeleteHandler({
    guard,
    deleteFn: async () => ({ ok: false, code: "NOT_FOUND" }),
  });
  assert.equal(
    (await missing(request("DELETE", `${deleteUrl}/12`, body), { params: Promise.resolve({ id: "12" }) })).status,
    404,
  );

  const nonAdmin = createStaffAuditLogDeleteHandler({
    guard,
    clearFn: async () => ({ ok: false, code: "FORBIDDEN" }),
  });
  assert.equal((await nonAdmin(request("DELETE", deleteUrl, body))).status, 403);

  const safeText = await handler(request("DELETE", deleteUrl, body)).then((response) => response.text());
  assert.equal(safeText.includes("StrongPassword1"), false);
});
