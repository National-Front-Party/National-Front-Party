import assert from "node:assert/strict";
import test from "node:test";
import { getApplication, listApplications } from "./application-queries.js";

const applicationId = "22222222-2222-4222-8222-222222222222";

test("lists applications with all supported filters, stable newest-first ordering, and safe fields", async () => {
  let findQuery;
  let countQuery;
  const db = {
    membership_applications: {
      findMany: async (query) => {
        findQuery = query;
        return [{
          id: applicationId,
          application_no: 1001n,
          full_name: "Test Applicant",
          application_type: "member",
          status: "new",
          governorate: { id: 7, name_ar: "Test Governorate" },
          assigned_staff_user: null,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        }];
      },
      count: async (query) => { countQuery = query; return 51; },
    },
  };
  const result = await listApplications({
    page: 2,
    page_size: 25,
    name: "Ahmed",
    phone: "01012",
    national_id: "30001010012330",
    application_no: 1001n,
    application_type: "member",
    status: "new",
    governorate_id: 7,
    assigned_to: "11111111-1111-4111-8111-111111111111",
    created_from: new Date("2026-01-01T00:00:00.000Z"),
    created_to: new Date("2026-01-31T23:59:59.999Z"),
  }, db);

  assert.deepEqual(findQuery.where, {
    full_name: { contains: "Ahmed", mode: "insensitive" },
    phone: { contains: "01012" },
    national_id: "30001010012330",
    application_no: 1001n,
    application_type: "member",
    status: "new",
    governorate_id: 7,
    assigned_to: "11111111-1111-4111-8111-111111111111",
    created_at: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
  });
  assert.deepEqual(countQuery, { where: findQuery.where });
  assert.deepEqual(findQuery.orderBy, [{ created_at: "desc" }, { application_no: "desc" }]);
  assert.equal(findQuery.skip, 25);
  assert.equal(findQuery.take, 25);
  assert.equal(Object.hasOwn(findQuery.select, "phone"), false);
  assert.equal(Object.hasOwn(findQuery.select, "national_id"), false);
  assert.equal(Object.hasOwn(findQuery.select, "internal_notes"), false);
  assert.equal(result.applications[0].application_no, "1001");
  assert.deepEqual(result.pagination, { page: 2, page_size: 25, total: 51, total_pages: 3 });
});

test("application detail selects private application data and descending history, serializing BigInts", async () => {
  let query;
  const db = {
    membership_applications: {
      findUnique: async (value) => {
        query = value;
        return {
          id: applicationId,
          application_no: 1001n,
          members: { membership_no: 9001n, status: "active", joined_at: new Date("2026-01-02T00:00:00.000Z") },
          application_status_history: [{ id: 8n, from_status: "new", to_status: "under_review", changed_by: null, changed_by_staff_user: null, note: "review", changed_at: new Date("2026-01-03T00:00:00.000Z") }],
        };
      },
    },
  };
  const result = await getApplication(applicationId, db);
  assert.deepEqual(query.where, { id: applicationId });
  assert.equal(query.select.submitted_ip, undefined);
  assert.equal(query.select.national_id, true);
  assert.deepEqual(query.select.application_status_history.orderBy, [
    { changed_at: "desc" },
    { id: "desc" },
  ]);
  assert.equal(result.application_no, "1001");
  assert.equal(result.members.membership_no, "9001");
  assert.equal(result.application_status_history[0].id, "8");
});
