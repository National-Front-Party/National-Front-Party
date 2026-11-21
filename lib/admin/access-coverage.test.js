import assert from "node:assert/strict";
import test from "node:test";

import { loadAdminOverviewData } from "./overview-data.js";
import { canAccessPath } from "./permissions.js";
import { hasPermission } from "../auth/permissions.js";
import { createApplicationDeleteHandler } from "../applications/delete-handler.js";
import { createServiceRequestDeleteHandler } from "../service-requests/delete-handler.js";
import {
  createAdminPopupsCollectionHandlers,
} from "../content/handlers/popups.js";
import { createStaffAuditLogHandler } from "../staff/handlers.js";

const roles = ["super_admin", "news_editor", "news_reviewer"];
const sections = {
  "super_admin": ["overview", "applications", "service-requests", "news", "content", "news-sources", "catalogs", "staff", "audit-log", "account"],
  "news_editor": ["overview", "news", "account"],
  "news_reviewer": ["overview", "news", "account"],
};

function req(method, url, body) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

function deleteGuard(role) {
  return async () => ({ id: "staff-1", role, is_active: true });
}

const deleteCases = [
  ["Applications", createApplicationDeleteHandler, "http://localhost/api/admin/applications/1", { id: "1" }, { ok: true, id: "1", application_no: "A-1" }],
  ["Service Requests", createServiceRequestDeleteHandler, "http://localhost/api/admin/service-requests/1", { id: "1" }, { ok: true, id: "1", request_no: "S-1" }],
];

for (const [name, makeHandler, url, params, result] of deleteCases) {
  test(`${name} DELETE allows super_admin to reach its delete service`, async () => {
    let calls = 0;
    const handler = makeHandler({ guard: deleteGuard("super_admin"), deleteFn: async () => { calls += 1; return result; } });
    const response = await handler(req("DELETE", url, { confirm: true }), { params: Promise.resolve(params) });
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
  });

  for (const role of ["news_editor", "news_reviewer"]) {
    test(`${name} DELETE denies ${role} before its delete service`, async () => {
      let calls = 0;
      const handler = makeHandler({ guard: deleteGuard(role), deleteFn: async () => { calls += 1; return result; } });
      const response = await handler(req("DELETE", url, { confirm: true }), { params: Promise.resolve(params) });
      assert.equal(response.status, 403);
      assert.equal(calls, 0);
    });
  }
}

test("overview routes are role scoped and include protected content and audit pages", () => {
  for (const role of roles) {
    for (const [section, allowed] of Object.entries(sections)) {
      assert.equal(canAccessPath(role, `/admin/${section === "overview" ? "" : section}`), allowed.includes(section), `${role} /admin/${section}`);
    }
    assert.equal(canAccessPath(role, "/admin/content/central-secretariats"), role === "super_admin");
    assert.equal(canAccessPath(role, "/admin/audit-log/entry-1"), role === "super_admin");
  }
});

const statusConfigMap = { new: { label: "New" } };
const appKindLabels = { member: "Member" };
const fallbackLabels = { applicationType: "Application", reviewStatus: "Under review", serviceType: "Service request" };

function overviewFetchFor(role) {
  const calls = [];
  const adminFetch = async (url) => {
    calls.push(url);
    if (url.startsWith("/api/admin/applications?status=accepted")) return { total: 3 };
    if (url.startsWith("/api/admin/applications")) return { total: 10, applications: [{ id: "a1", full_name: "Applicant", type: "member", status: "new", created_at: "2026-01-01" }] };
    if (url.startsWith("/api/admin/service-requests?status=completed")) return { total: 2 };
    if (url.startsWith("/api/admin/service-requests")) return { total: 5, service_requests: [{ id: "s1", full_name: "Resident", status: "new", created_at: "2026-01-02" }] };
    if (url.startsWith("/api/admin/news")) return { total: 7 };
    if (url.startsWith("/api/admin/staff")) return { total: 4 };
    throw new Error(`Unexpected fetch ${role} ${url}`);
  };
  return { calls, adminFetch };
}

function overviewOptions(adminFetch, publicFetch) {
  return { adminFetch, publicFetch, statusConfigMap, appKindLabels, fallbackLabels };
}

test("super_admin overview receives existing administrative statistics", async () => {
  const { calls, adminFetch } = overviewFetchFor("super_admin");
  const data = await loadAdminOverviewData("super_admin", overviewOptions(adminFetch));
  assert.deepEqual(data.stats, { applicationsTotal: 10, serviceRequestsTotal: 5, publishedNewsTotal: 7, staffTotal: 4 });
  assert.equal(data.recentRequests.length, 2);
  assert.equal(data.completionRate, 33);
  assert.ok(calls.some((url) => url.startsWith("/api/admin/applications")));
  assert.ok(calls.some((url) => url.startsWith("/api/admin/service-requests")));
  assert.ok(calls.some((url) => url.startsWith("/api/admin/staff")));
});

for (const role of ["news_editor", "news_reviewer"]) {
  test(`${role} overview fetches News only and does not expose privileged data after failures`, async () => {
    const calls = [];
    const adminFetch = async (url) => {
      calls.push(url);
      if (url.startsWith("/api/admin/news")) return { total: 8 };
      throw new Error("restricted request should not be made");
    };
    const result = await loadAdminOverviewData(role, overviewOptions(adminFetch));
    assert.deepEqual(calls, ["/api/admin/news/articles?status=published&page=1&page_size=1"]);
    assert.deepEqual(result.stats, { applicationsTotal: null, serviceRequestsTotal: null, publishedNewsTotal: 8, staffTotal: null });
    assert.deepEqual(result.recentRequests, []);
    assert.equal(result.completionRate, 0);
  });
}

test("failed News fetch falls back only to public News totals", async () => {
  const calls = [];
  const adminFetch = async (url) => { calls.push(url); throw new Error("denied"); };
  const publicFetch = async (url) => {
    calls.push(url);
    return { json: async () => ({ pagination: { total: 6 } }) };
  };
  const data = await loadAdminOverviewData("news_editor", overviewOptions(adminFetch, publicFetch));
  assert.deepEqual(calls, ["/api/admin/news/articles?status=published&page=1&page_size=1", "/api/content/news?page=1&page_size=1"]);
  assert.deepEqual(data.stats, { applicationsTotal: null, serviceRequestsTotal: null, publishedNewsTotal: 6, staffTotal: null });
});

test("Content and Audit Log APIs reject Writer and Reviewer before protected data services", async () => {
  for (const role of ["news_editor", "news_reviewer"]) {
    let listCalls = 0;
    const content = createAdminPopupsCollectionHandlers({
      guard: async (_request, options) => hasPermission(role, options.permission)
        ? { id: `staff-${role}`, role, is_active: true }
        : Response.json({ error: "FORBIDDEN" }, { status: 403 }),
      listFn: async () => { listCalls += 1; return { items: [] }; },
    });
    assert.equal((await content.GET(req("GET", "http://localhost/api/admin/content/popups"))).status, 403);
    assert.equal(listCalls, 0);

    let auditCalls = 0;
    const audit = createStaffAuditLogHandler({
      guard: async (_request, options) => {
        assert.equal(options.permission, "staff:manage");
        return hasPermission(role, options.permission)
          ? { id: `staff-${role}`, role, is_active: true }
          : Response.json({ error: "FORBIDDEN" }, { status: 403 });
      },
      listFn: async () => { auditCalls += 1; return { items: [] }; },
    });
    assert.equal((await audit(req("GET", "http://localhost/api/admin/staff/audit-log"))).status, 403, role);
    assert.equal(auditCalls, 0);
  }
});
