import assert from "node:assert/strict";
import test from "node:test";
import { serviceRequestsListQuerySchema } from "./service-request-query.js";

test("service request query supports filters, normalized phone and bounded pagination", () => {
  const parsed = serviceRequestsListQuerySchema.parse({
    page: "2",
    page_size: "50",
    name: "  أحمد  ",
    request_no: "12345",
    phone: "٠١٠١٢٣",
    status: "  in_progress ",
    ministry_id: "4",
    sector_id: "3",
    assigned_to: "11111111-1111-4111-8111-111111111111",
    created_from: "2024-02-29",
    created_to: "2024-03-01",
  });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.page_size, 50);
  assert.equal(parsed.name, "أحمد");
  assert.equal(parsed.request_no, 12345n);
  assert.equal(parsed.phone, "010123");
  assert.equal(parsed.status, "in_progress");
  assert.equal(parsed.ministry_id, 4);
  assert.equal(parsed.sector_id, 3);
  assert.equal(parsed.created_from.toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(parsed.created_to.toISOString(), "2024-03-01T23:59:59.999Z");
});

test("service request query rejects invalid, duplicate-handled-by-route, and unknown values", () => {
  assert.equal(serviceRequestsListQuerySchema.parse({}).page_size, 25);
  assert.equal(serviceRequestsListQuerySchema.safeParse({ page: "10000", page_size: "100" }).success, true);
  for (const query of [
    { page: "0" },
    { page: "10001" },
    { page_size: "101" },
    { request_no: "0" },
    { request_no: "9223372036854775808" },
    { phone: "abc" },
    { status: " " },
    { ministry_id: "0" },
    { sector_id: "32768" },
    { assigned_to: "not-a-uuid" },
    { unexpected: "value" },
  ]) assert.equal(serviceRequestsListQuerySchema.safeParse(query).success, false, JSON.stringify(query));
});

test("service request date filters reject impossible dates, times, offsets and reversed ranges", () => {
  for (const value of [
    "2026-02-30",
    "2026-04-31",
    "2026-13-01",
    "2026-04-32",
    "2026-04-30T24:00:00Z",
    "2026-04-30T12:60:00Z",
    "2026-04-30T12:30:60Z",
    "2026-04-30T12:30:00+24:00",
  ]) {
    assert.equal(serviceRequestsListQuerySchema.safeParse({ created_from: value }).success, false, value);
    assert.equal(serviceRequestsListQuerySchema.safeParse({ created_to: value }).success, false, value);
  }
  assert.equal(serviceRequestsListQuerySchema.safeParse({
    created_from: "2026-05-02",
    created_to: "2026-05-01",
  }).success, false);
  assert.equal(serviceRequestsListQuerySchema.safeParse({ created_from: "2024-02-29" }).success, true);
});
