import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationsExportHandler } from "./export-handlers.js";

const admin = { id: "11111111-1111-4111-8111-111111111111", role: "super_admin" };

function request(url) {
  return new Request(url, { method: "GET" });
}

test("export requires applications:export and passes shared filters without pagination", async () => {
  let permission;
  let filters;
  const handler = createApplicationsExportHandler({
    guard: async (_request, options) => { permission = options.permission; return admin; },
    exportFn: async (input) => { filters = input; return { rowCount: 0 }; },
  });
  const response = await handler(request("http://localhost/api/admin/applications/export?name=Ali&status=new&created_to=2026-11-17"));
  assert.equal(response.status, 200);
  assert.equal(permission, "applications:export");
  assert.equal(filters.name, "Ali");
  assert.equal(filters.status, "new");
  assert.equal(filters.created_to.toISOString(), "2026-11-17T23:59:59.999Z");
  assert.equal("page" in filters, false);
  assert.equal("page_size" in filters, false);
  assert.equal(response.headers.get("cache-control"), "no-store, private, max-age=0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(response.headers.get("content-disposition"), /^attachment; filename="applications-\d{4}-\d{2}-\d{2}\.csv"$/);
  const body = Buffer.from(await response.arrayBuffer());
  assert.deepEqual([...body.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});

test("rejects non-super-admin, malformed and duplicate query params without exporting", async () => {
  let exports = 0;
  let permission;
  const handler = createApplicationsExportHandler({
    guard: async (_request, options) => {
      permission = options.permission;
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    },
    exportFn: async () => { exports += 1; return { rowCount: 0 }; },
  });
  assert.equal((await handler(request("http://localhost/api/admin/applications/export"))).status, 403);
  assert.equal(permission, "applications:export");

  const allow = createApplicationsExportHandler({
    guard: async () => admin,
    exportFn: async () => { exports += 1; return { rowCount: 0 }; },
  });
  for (const url of [
    "http://localhost/api/admin/applications/export?status=invalid",
    "http://localhost/api/admin/applications/export?page=1",
    "http://localhost/api/admin/applications/export?name=a&name=b",
  ]) assert.equal((await allow(request(url))).status, 400);
  assert.equal(exports, 0);
});

test("returns clear 413 responses without partial files for row and byte limits", async () => {
  const tooMany = createApplicationsExportHandler({ guard: async () => admin, exportFn: async () => ({ tooManyRows: true }) });
  const rowResponse = await tooMany(request("http://localhost/api/admin/applications/export"));
  assert.equal(rowResponse.status, 413);
  assert.deepEqual(await rowResponse.json(), { error: "EXPORT_LIMIT_EXCEEDED" });
  assert.match(rowResponse.headers.get("content-type"), /application\/json/);
  assert.equal(rowResponse.headers.has("content-disposition"), false);

  const tooLarge = createApplicationsExportHandler({
    guard: async () => admin,
    exportFn: async (_filters, _db, onRow) => {
      onRow({ application_no: 1n, application_type: "member", status: "new", full_name: "x".repeat(10 * 1024 * 1024) });
      return { tooLarge: true };
    },
  });
  const byteResponse = await tooLarge(request("http://localhost/api/admin/applications/export"));
  assert.equal(byteResponse.status, 413);
  assert.deepEqual(await byteResponse.json(), { error: "EXPORT_SIZE_LIMIT_EXCEEDED" });
  assert.equal(byteResponse.headers.has("content-disposition"), false);
});

test("maps export service failures to a non-cached server error", async () => {
  const handler = createApplicationsExportHandler({ guard: async () => admin, exportFn: async () => { throw new Error("private details"); } });
  const response = await handler(request("http://localhost/api/admin/applications/export"));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "SERVER_ERROR" });
  assert.equal(response.headers.get("cache-control"), "no-store, private, max-age=0");
});
