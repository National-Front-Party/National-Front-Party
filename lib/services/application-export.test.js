import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationsCsvWriter } from "../applications/export-csv.js";
import { exportApplications, listApplications } from "./application-queries.js";

const filters = {
  name: "Ali",
  phone: "01012",
  national_id: "30001010012330",
  application_no: 77n,
  application_type: "member",
  status: "new",
  governorate_id: 7,
  assigned_to: "11111111-1111-4111-8111-111111111111",
  created_from: new Date("2026-01-01T00:00:00.000Z"),
  created_to: new Date("2026-01-31T23:59:59.999Z"),
};

function sampleRow(application_no) {
  return {
    application_no: BigInt(application_no), application_type: "member", status: "new",
    full_name: "Applicant", governorate: { name_ar: "القاهرة" }, assigned_staff_user: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"), updated_at: new Date("2026-01-02T00:00:00.000Z"), reviewed_at: null,
  };
}

test("export reuses list filters and fetches ordered bounded batches without pagination", async () => {
  const batches = [];
  let countQuery;
  let transactionOptions;
  const tx = {
    membership_applications: {
      count: async (query) => { countQuery = query; return 501; },
      findMany: async (query) => {
        batches.push(query);
        return query.skip === 0 ? Array.from({ length: 500 }, (_, i) => sampleRow(501 - i)) : [sampleRow(1)];
      },
    },
  };
  const db = { $transaction: async (callback, options) => { transactionOptions = options; return callback(tx); } };
  const exportedRows = [];
  const result = await exportApplications(filters, db, (row) => { exportedRows.push(row); return true; });
  let listQuery;
  const listDb = {
    membership_applications: {
      findMany: async (query) => { listQuery = query; return []; },
      count: async () => 0,
    },
  };
  await listApplications({ ...filters, page: 1, page_size: 25 }, listDb);

  assert.deepEqual(countQuery.where, listQuery.where);
  assert.equal(transactionOptions.isolationLevel, "RepeatableRead");
  assert.deepEqual(result, { rowCount: 501 });
  assert.equal(exportedRows.length, 501);
  assert.deepEqual(batches.map(({ skip, take }) => [skip, take]), [[0, 500], [500, 1]]);
  assert.deepEqual(batches[0].orderBy, [{ created_at: "desc" }, { application_no: "desc" }]);
  assert.equal("skip" in listQuery, true);
  assert.equal("page" in batches[0], false);
  for (const sensitive of ["national_id", "phone", "birth_date", "gender", "education_level", "occupation", "rejection_reason", "internal_notes", "submitted_ip"]) {
    assert.equal(Object.hasOwn(batches[0].select, sensitive), false);
  }
});

test("export rejects a count above the cap before fetching rows", async () => {
  let fetches = 0;
  const db = { $transaction: async (callback) => callback({
    membership_applications: {
      count: async () => 10_001,
      findMany: async () => { fetches += 1; return []; },
    },
  }) };
  assert.deepEqual(await exportApplications({}, db), { tooManyRows: true });
  assert.equal(fetches, 0);
});

test("stops fetching batches immediately when the streaming CSV writer crosses 10 MB", async () => {
  const writer = createApplicationsCsvWriter();
  let fetches = 0;
  let transactionOptions;
  const oversized = sampleRow(501);
  oversized.full_name = "أ".repeat(1_500_000);
  const db = { $transaction: async (callback, options) => {
    transactionOptions = options;
    return callback({
      membership_applications: {
        count: async () => 501,
        findMany: async () => {
          fetches += 1;
          return Array.from({ length: 500 }, () => oversized);
        },
      },
    });
  } };

  const result = await exportApplications({}, db, (row) => writer.append(row));
  assert.deepEqual(result, { tooLarge: true });
  assert.equal(writer.tooLarge, true);
  assert.equal(writer.toBuffer(), null);
  assert.equal(fetches, 1);
  assert.equal(transactionOptions.isolationLevel, "RepeatableRead");
});
