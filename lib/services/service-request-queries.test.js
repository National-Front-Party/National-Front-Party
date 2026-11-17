import assert from "node:assert/strict";
import test from "node:test";
import { getServiceRequest, listServiceRequests } from "./service-request-queries.js";

const id = "22222222-2222-4222-8222-222222222222";

test("lists service requests with all supported filters, stable ordering and safe selected fields", async () => {
  let findQuery;
  let countQuery;
  const db = {
    service_requests: {
      findMany: async (query) => {
        findQuery = query;
        return [{
          id, request_no: 456n, full_name: "Applicant", phone: "01012345678", status: "new",
          ministry: { id: 4, name_ar: "Ministry" },
          request_sector: { id: 3, name_ar: "Sector" },
          assigned_to: null, assigned_staff_user: null,
          created_at: new Date("2026-01-02T00:00:00.000Z"), updated_at: new Date("2026-01-02T00:00:00.000Z"),
        }];
      },
      count: async (query) => { countQuery = query; return 26; },
    },
  };
  const result = await listServiceRequests({
    page: 2, page_size: 25, name: "Ali", request_no: 456n, phone: "01012", status: "new",
    ministry_id: 4, sector_id: 3,
    assigned_to: "11111111-1111-4111-8111-111111111111",
    created_from: new Date("2026-01-01T00:00:00.000Z"),
    created_to: new Date("2026-01-31T23:59:59.999Z"),
  }, db);

  assert.deepEqual(findQuery.where, {
    full_name: { contains: "Ali", mode: "insensitive" },
    request_no: 456n,
    phone: { contains: "01012" },
    status: "new",
    ministry_id: 4,
    sector_id: 3,
    assigned_to: "11111111-1111-4111-8111-111111111111",
    created_at: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
  });
  assert.deepEqual(countQuery, { where: findQuery.where });
  assert.equal(findQuery.skip, 25);
  assert.equal(findQuery.take, 25);
  assert.deepEqual(findQuery.orderBy, [{ created_at: "desc" }, { request_no: "desc" }]);
  assert.equal(Object.hasOwn(findQuery.select, "submitted_ip"), false);
  assert.equal(result.service_requests[0].request_no, "456");
  assert.deepEqual(Object.keys(result.service_requests[0]), [
    "id", "request_no", "full_name", "phone", "status", "ministry", "request_sector",
    "assigned_to", "assigned_staff_user", "created_at", "updated_at",
  ]);
  assert.deepEqual(result.pagination, { page: 2, page_size: 25, total: 26, total_pages: 2 });
});

test("lists without filters and returns only the selected request fields", async () => {
  let query;
  const db = { service_requests: {
    findMany: async (value) => { query = value; return []; },
    count: async () => 0,
  } };
  const result = await listServiceRequests({ page: 1, page_size: 25 }, db);
  assert.deepEqual(query.where, {});
  assert.equal(query.orderBy[0].created_at, "desc");
  assert.equal(Object.hasOwn(query.select, "submitted_ip"), false);
  assert.deepEqual(result, {
    service_requests: [],
    pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 },
  });
});

test("returns service request details from an explicit allowlist and serializes request number", async () => {
  let query;
  const record = {
    id, request_no: 456n, full_name: "Applicant", phone: "01012345678",
    ministry: { id: 4, slug: "health", name_ar: "Ministry" },
    request_sector: { id: 3, code: "care", name_ar: "Sector" }, status: "new",
    assigned_to: null, assigned_staff_user: null, internal_notes: "Private note", source: "website",
    created_at: new Date("2026-01-02T00:00:00.000Z"), updated_at: new Date("2026-01-03T00:00:00.000Z"),
    submitted_ip: "192.0.2.1",
  };
  const db = { service_requests: { findUnique: async (value) => { query = value; return record; } } };
  const result = await getServiceRequest(id, db);
  assert.deepEqual(query.where, { id });
  assert.equal(Object.hasOwn(query.select, "submitted_ip"), false);
  assert.equal(result.request_no, "456");
  assert.equal(Object.hasOwn(result, "submitted_ip"), false);
  assert.equal(result.internal_notes, "Private note");
});

test("returns null when the requested service request does not exist", async () => {
  const db = { service_requests: { findUnique: async () => null } };
  assert.equal(await getServiceRequest(id, db), null);
});
