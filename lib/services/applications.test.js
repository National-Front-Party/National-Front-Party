import assert from "node:assert/strict";
import test from "node:test";
import { createApplication } from "./applications.js";

const validInput = {
  type: "member",
  full_name: "محمد علي أحمد حسن",
  phone: "01012345678",
  national_id: "30001010012330",
  governorate_id: 1,
  terms_accepted: true,
};

function createMockDatabase({
  governorate = { id: 1, is_active: true },
  existingStatus = null,
} = {}) {
  const calls = {
    governorateQuery: null,
    duplicateQuery: null,
    applicationCreate: null,
    historyCreate: null,
    transactionStarted: false,
  };

  const tx = {
    membership_applications: {
      findFirst: async (query) => {
        calls.duplicateQuery = query;
        return existingStatus && existingStatus !== "rejected"
          ? { id: "existing-application" }
          : null;
      },
      create: async (query) => {
        calls.applicationCreate = query;
        return {
          id: "new-application",
          application_no: 123456789012345n,
        };
      },
    },
    application_status_history: {
      create: async (query) => {
        calls.historyCreate = query;
      },
    },
  };

  const db = {
    governorates: {
      findFirst: async (query) => {
        calls.governorateQuery = query;
        if (
          governorate?.id === query.where.id &&
          governorate?.is_active === query.where.is_active
        ) {
          return { id: governorate.id };
        }
        return null;
      },
    },
    $transaction: async (callback) => {
      calls.transactionStarted = true;
      return callback(tx);
    },
  };

  return { db, calls };
}

test("creates an application and its initial status history", async () => {
  const { db, calls } = createMockDatabase();
  const result = await createApplication(validInput, "2001:db8::1", db);

  assert.deepEqual(result, {
    ok: true,
    applicationNo: "123456789012345",
  });
  assert.deepEqual(calls.governorateQuery, {
    where: { id: 1, is_active: true },
    select: { id: true },
  });
  assert.deepEqual(calls.applicationCreate.data, {
    full_name: validInput.full_name,
    phone: validInput.phone,
    national_id: validInput.national_id,
    governorate_id: validInput.governorate_id,
    birth_date: new Date("2000-01-01T00:00:00.000Z"),
    gender: "male",
    application_type: "member",
    terms_accepted: true,
    status: "new",
    source: "website",
    submitted_ip: "2001:db8::1",
    education_level: null,
    occupation: null,
    assigned_to: null,
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    internal_notes: null,
  });
  assert.deepEqual(calls.historyCreate.data, {
    application_id: "new-application",
    from_status: null,
    to_status: "new",
    changed_by: null,
    note: "تم الاستلام من الموقع",
  });
  assert.equal(calls.transactionStarted, true);
});

test("rejects an invalid national ID before querying the database", async () => {
  const { db, calls } = createMockDatabase();
  const result = await createApplication(
    { ...validInput, national_id: "invalid" },
    null,
    db,
  );

  assert.deepEqual(result, { ok: false, code: "INVALID_NATIONAL_ID" });
  assert.equal(calls.governorateQuery, null);
});

test("rejects missing or inactive governorates", async (t) => {
  for (const [name, governorate] of [
    ["missing", null],
    ["inactive", { id: 1, is_active: false }],
  ]) {
    await t.test(name, async () => {
      const { db, calls } = createMockDatabase({ governorate });
      const result = await createApplication(validInput, null, db);

      assert.deepEqual(result, { ok: false, code: "INVALID_GOVERNORATE" });
      assert.equal(calls.transactionStarted, false);
    });
  }
});

test("rejects a matching application that is not rejected", async () => {
  const { db, calls } = createMockDatabase({
    existingStatus: "under_review",
  });
  const result = await createApplication(validInput, null, db);

  assert.deepEqual(result, { ok: false, code: "DUPLICATE" });
  assert.deepEqual(calls.duplicateQuery.where, {
    national_id: validInput.national_id,
    status: { not: "rejected" },
  });
  assert.equal(calls.applicationCreate, null);
  assert.equal(calls.historyCreate, null);
});

test("allows a new application when the previous one was rejected", async () => {
  const { db, calls } = createMockDatabase({ existingStatus: "rejected" });
  const result = await createApplication(validInput, null, db);

  assert.equal(result.ok, true);
  assert.ok(calls.applicationCreate);
  assert.ok(calls.historyCreate);
});

test("stores null for an invalid IP address", async () => {
  const { db, calls } = createMockDatabase();
  const result = await createApplication(validInput, "192.0.2.999", db);

  assert.equal(result.ok, true);
  assert.equal(calls.applicationCreate.data.submitted_ip, null);
});
