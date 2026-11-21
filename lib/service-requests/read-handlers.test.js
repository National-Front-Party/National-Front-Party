import assert from "node:assert/strict";
import test from "node:test";
import { requireStaff } from "../auth/guard.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../auth/session.js";
import {
  createServiceRequestDetailHandler,
  createServiceRequestsListHandler,
} from "./read-handlers.js";

process.env.SESSION_SECRET ??= "service-request-test-session-secret-with-32-bytes";

const ids = {
  super_admin: "11111111-1111-4111-8111-111111111111",
  news_editor: "22222222-2222-4222-8222-222222222222",
  news_reviewer: "33333333-3333-4333-8333-333333333333",
};
const requestId = "44444444-4444-4444-8444-444444444444";

function dbFor(staff) {
  return { staff_users: { findUnique: async ({ where }) => staff[where.id] ?? null } };
}

function realGuard(staff) {
  return (request, options) => requireStaff(request, { ...options, db: dbFor(staff) });
}

async function getRequest(url, id) {
  const token = id ? await createSessionToken(id) : null;
  const headers = token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : undefined;
  return new Request(url, { method: "GET", headers });
}

function staffRecord(id, role, is_active = true) {
  return { id, full_name: "Test Staff", email: "staff@example.test", role, is_active, must_change_password: false };
}

test("only super_admin can list using the real guard and services:manage", async () => {
  const calls = [];
  const handler = createServiceRequestsListHandler({
    guard: realGuard({
      [ids.super_admin]: staffRecord(ids.super_admin, "super_admin"),
      [ids.news_editor]: staffRecord(ids.news_editor, "news_editor"),
    }),
    listFn: async () => { calls.push(true); return { service_requests: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 } }; },
  });

  for (const id of [ids.super_admin]) {
    const response = await handler(await getRequest("http://localhost/api/admin/service-requests", id));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).service_requests, []);
  }
  assert.equal(calls.length, 1);
});

test("real guard rejects a missing session, inactive staff and roles without services:manage", async () => {
  const staff = {
    [ids.super_admin]: staffRecord(ids.super_admin, "super_admin"),
    [ids.news_editor]: staffRecord(ids.news_editor, "news_editor", false),
    [ids.news_reviewer]: staffRecord(ids.news_reviewer, "news_reviewer"),
  };
  const handler = createServiceRequestsListHandler({
    guard: realGuard(staff),
    listFn: async () => assert.fail("unauthorized request must not query"),
  });
  assert.equal((await handler(await getRequest("http://localhost/api/admin/service-requests"))).status, 401);
  assert.equal((await handler(await getRequest("http://localhost/api/admin/service-requests", ids.news_editor))).status, 401);
  assert.equal((await handler(await getRequest("http://localhost/api/admin/service-requests", ids.news_reviewer))).status, 403);
});

test("list rejects invalid, duplicate and unknown query parameters", async () => {
  const staff = { [ids.super_admin]: staffRecord(ids.super_admin, "super_admin") };
  const handler = createServiceRequestsListHandler({
    guard: realGuard(staff),
    listFn: async () => assert.fail("invalid query must not query"),
  });
  for (const query of [
    "page=0",
    "page=10001",
    "page_size=101",
    "status=new&status=closed",
    "unknown=value",
    "created_from=2026-02-30",
    "created_from=2026-05-02&created_to=2026-05-01",
  ]) {
    const response = await handler(await getRequest(`http://localhost/api/admin/service-requests?${query}`, ids.super_admin));
    assert.equal(response.status, 400, query);
  }
});

test("detail validates UUID, returns an allowlisted record, and handles missing requests", async () => {
  const staff = {
    [ids.news_editor]: staffRecord(ids.news_editor, "news_editor"),
    [ids.super_admin]: staffRecord(ids.super_admin, "super_admin"),
  };
  let receivedId;
  const handler = createServiceRequestDetailHandler({
    guard: realGuard(staff),
    getFn: async (id) => {
      receivedId = id;
      return { id, request_no: "88", full_name: "Applicant", phone: "01012345678", status: "new" };
    },
  });
  const invalid = await handler(await getRequest("http://localhost/api/admin/service-requests/nope", ids.super_admin), {
    params: Promise.resolve({ id: "nope" }),
  });
  assert.equal(invalid.status, 400);

  for (const staffId of [ids.super_admin]) {
    const response = await handler(await getRequest(`http://localhost/api/admin/service-requests/${requestId}`, staffId), {
      params: Promise.resolve({ id: requestId }),
    });
    assert.equal(response.status, 200);
    assert.equal(receivedId, requestId);
    const body = await response.json();
    assert.deepEqual(body, {
      service_request: { id: requestId, request_no: "88", full_name: "Applicant", phone: "01012345678", status: "new" },
    });
    assert.equal(body.service_request.submitted_ip, undefined);
  }
});

test("detail returns 404 for a missing request and requires services:manage", async () => {
  let permission;
  const handler = createServiceRequestDetailHandler({
    guard: async (_request, options) => {
      permission = options.permission;
      return { id: ids.super_admin, role: "super_admin" };
    },
    getFn: async () => null,
  });
  const response = await handler(await getRequest(`http://localhost/api/admin/service-requests/${requestId}`), {
    params: Promise.resolve({ id: requestId }),
  });
  assert.equal(permission, "services:manage");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "NOT_FOUND" });
});
