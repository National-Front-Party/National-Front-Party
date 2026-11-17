import assert from "node:assert/strict";
import test from "node:test";
import { applicationsListQuerySchema } from "./application-query.js";

test("application query supports exact IDs, types, statuses, and normalized search", () => {
  const parsed = applicationsListQuerySchema.parse({
    name: "  Ahmed  ",
    phone: "٠١٠١٢٣",
    national_id: "٣٠٠٠١٠١٠٠١٢٣٣٠",
    application_no: "123456",
    application_type: "volunteer",
    status: "under_review",
    governorate_id: "7",
    assigned_to: "11111111-1111-4111-8111-111111111111",
  });
  assert.equal(parsed.name, "Ahmed");
  assert.equal(parsed.phone, "010123");
  assert.equal(parsed.national_id, "30001010012330");
  assert.equal(parsed.application_no, 123456n);
  assert.equal(parsed.governorate_id, 7);
});

test("national ID is exact-only and invalid types, statuses, and unknown keys are rejected", () => {
  assert.equal(applicationsListQuerySchema.safeParse({ national_id: "30001" }).success, false);
  assert.equal(applicationsListQuerySchema.safeParse({ application_type: "other" }).success, false);
  assert.equal(applicationsListQuerySchema.safeParse({ status: "archived" }).success, false);
  assert.equal(applicationsListQuerySchema.safeParse({ unexpected: "value" }).success, false);
  assert.equal(applicationsListQuerySchema.safeParse({ application_no: "9223372036854775808" }).success, false);
});

test("application pagination and date range are bounded and validated", () => {
  assert.equal(applicationsListQuerySchema.parse({}).page_size, 25);
  assert.equal(applicationsListQuerySchema.safeParse({ page: "10000", page_size: "100" }).success, true);
  assert.equal(applicationsListQuerySchema.safeParse({ page: "10001" }).success, false);
  assert.equal(applicationsListQuerySchema.safeParse({ page_size: "101" }).success, false);
  assert.equal(applicationsListQuerySchema.safeParse({ created_from: "2026-01-02", created_to: "2026-01-01" }).success, false);
  const dates = applicationsListQuerySchema.parse({ created_from: "2026-01-01", created_to: "2026-01-02" });
  assert.equal(dates.created_from.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(dates.created_to.toISOString(), "2026-01-02T23:59:59.999Z");
  assert.equal(applicationsListQuerySchema.safeParse({ created_from: "not-a-date" }).success, false);
});

test("date filters accept valid calendar dates and reject impossible dates and times", () => {
  const validDates = [
    { created_from: "2024-02-29" },
    { created_from: "2026-04-30T23:59:59.123Z" },
    { created_to: "2026-04-30T12:30:45+02:00" },
  ];
  for (const query of validDates) {
    assert.equal(applicationsListQuerySchema.safeParse(query).success, true);
  }

  const invalidDates = [
    "2026-02-30",
    "2026-02-30T12:00:00Z",
    "2026-04-31",
    "2026-13-01",
    "2026-04-00",
    "2026-04-32",
    "2026-04-30T24:00:00Z",
    "2026-04-30T12:60:00Z",
    "2026-04-30T12:30:60Z",
  ];
  for (const value of invalidDates) {
    assert.equal(applicationsListQuerySchema.safeParse({ created_from: value }).success, false, value);
    assert.equal(applicationsListQuerySchema.safeParse({ created_to: value }).success, false, value);
  }
});

test("created_to remains inclusive through the end of a date-only day", () => {
  const parsed = applicationsListQuerySchema.parse({ created_to: "2026-01-02" });
  assert.equal(parsed.created_to.toISOString(), "2026-01-02T23:59:59.999Z");
});
