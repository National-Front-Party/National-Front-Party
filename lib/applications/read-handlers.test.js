import assert from "node:assert/strict";
import test from "node:test";
import {
  createApplicationDetailHandler,
  createApplicationsListHandler,
} from "./read-handlers.js";

const staff = { id: "11111111-1111-4111-8111-111111111111", role: "super_admin" };
const applicationId = "22222222-2222-4222-8222-222222222222";

function getRequest(url) {
  return new Request(url, { method: "GET" });
}

test("applications list checks applications:read and returns paginated results", async () => {
  let permission;
  let receivedFilters;
  const handler = createApplicationsListHandler({
    guard: async (_request, options) => { permission = options.permission; return staff; },
    listFn: async (filters) => {
      receivedFilters = filters;
      return { applications: [], pagination: { page: filters.page, page_size: filters.page_size, total: 0, total_pages: 0 } };
    },
  });
  const response = await handler(getRequest("http://localhost/api/admin/applications?name=Ali&status=new"));
  assert.equal(permission, "applications:read");
  assert.equal(response.status, 200);
  assert.equal(receivedFilters.name, "Ali");
  assert.equal(receivedFilters.status, "new");
  assert.deepEqual(await response.json(), {
    applications: [],
    pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 },
  });
});

test("applications list rejects malformed, duplicate, and unknown query parameters", async () => {
  let calls = 0;
  const handler = createApplicationsListHandler({
    guard: async () => staff,
    listFn: async () => { calls += 1; return {}; },
  });
  for (const url of [
    "http://localhost/api/admin/applications?page=0",
    "http://localhost/api/admin/applications?status=unknown",
    "http://localhost/api/admin/applications?national_id=123",
    "http://localhost/api/admin/applications?not_a_filter=x",
    "http://localhost/api/admin/applications?page=1&page=2",
  ]) {
    assert.equal((await handler(getRequest(url))).status, 400);
  }
  assert.equal(calls, 0);
});

test("non-authorized staff cannot list or read application details", async () => {
  let permission;
  const guard = async (_request, options) => {
    permission = options.permission;
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  };
  const list = createApplicationsListHandler({ guard, listFn: async () => assert.fail("must not query") });
  assert.equal((await list(getRequest("http://localhost/api/admin/applications"))).status, 403);
  assert.equal(permission, "applications:read");
  const detail = createApplicationDetailHandler({ guard, getFn: async () => assert.fail("must not query") });
  assert.equal((await detail(getRequest("http://localhost/api/admin/applications/id"), {
    params: Promise.resolve({ id: applicationId }),
  })).status, 403);
});

test("application detail validates UUIDs and returns 404 when absent", async () => {
  const handler = createApplicationDetailHandler({
    guard: async () => staff,
    getFn: async () => null,
  });
  const invalid = await handler(getRequest("http://localhost/api/admin/applications/nope"), {
    params: Promise.resolve({ id: "nope" }),
  });
  assert.equal(invalid.status, 400);
  const missing = await handler(getRequest(`http://localhost/api/admin/applications/${applicationId}`), {
    params: Promise.resolve({ id: applicationId }),
  });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "NOT_FOUND" });
});
