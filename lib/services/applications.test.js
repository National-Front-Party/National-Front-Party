import assert from "node:assert/strict";
import test from "node:test";
import { acceptApplication, createApplication } from "./applications.js";

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

function createAcceptanceDatabase({
  application = {
    id: "application-id",
    application_type: "member",
    status: "under_review",
    governorate_id: 7,
  },
  updateCount = 1,
  memberCreateError,
} = {}) {
  const calls = {
    applicationQuery: null,
    applicationUpdate: null,
    memberCreate: null,
    historyCreate: null,
    transactionStarted: false,
  };

  const tx = {
    membership_applications: {
      findUnique: async (query) => {
        calls.applicationQuery = query;
        return application;
      },
      updateMany: async (query) => {
        calls.applicationUpdate = query;
        return { count: updateCount };
      },
    },
    members: {
      create: async (query) => {
        calls.memberCreate = query;
        if (memberCreateError) {
          throw memberCreateError;
        }
        return { membership_no: 987654321n };
      },
    },
    application_status_history: {
      create: async (query) => {
        calls.historyCreate = query;
      },
    },
  };

  const db = {
    $transaction: async (callback) => {
      calls.transactionStarted = true;
      return callback(tx);
    },
  };

  return { db, calls };
}

test("accepts a member application and creates its membership atomically", async () => {
  const { db, calls } = createAcceptanceDatabase();
  const result = await acceptApplication(
    "application-id",
    "staff-id",
    db,
  );

  assert.deepEqual(result, { ok: true, membershipNo: "987654321" });
  assert.deepEqual(calls.applicationQuery, {
    where: { id: "application-id" },
    select: {
      id: true,
      application_type: true,
      status: true,
      governorate_id: true,
    },
  });
  assert.equal(calls.applicationUpdate.where.status, "under_review");
  assert.equal(calls.applicationUpdate.data.status, "accepted");
  assert.equal(calls.applicationUpdate.data.reviewed_by, "staff-id");
  assert.ok(calls.applicationUpdate.data.reviewed_at instanceof Date);
  assert.deepEqual(calls.memberCreate, {
    data: {
      application_id: "application-id",
      governorate_id: 7,
    },
    select: { membership_no: true },
  });
  assert.deepEqual(calls.historyCreate.data, {
    application_id: "application-id",
    from_status: "under_review",
    to_status: "accepted",
    changed_by: "staff-id",
    note: "تم قبول الطلب وإنشاء العضوية",
  });
  assert.equal(calls.transactionStarted, true);
});

test("accepts volunteer applications without creating a member record", async () => {
  const { db, calls } = createAcceptanceDatabase({
    application: {
      id: "application-id",
      application_type: "volunteer",
      status: "under_review",
      governorate_id: 7,
    },
  });

  const result = await acceptApplication("application-id", "staff-id", db);

  assert.deepEqual(result, { ok: true, membershipNo: null });
  assert.equal(calls.memberCreate, null);
  assert.equal(calls.historyCreate.data.to_status, "accepted");
});

test("does not accept an application that is not under review", async () => {
  const { db, calls } = createAcceptanceDatabase({
    application: {
      id: "application-id",
      application_type: "member",
      status: "new",
      governorate_id: 7,
    },
  });

  const result = await acceptApplication("application-id", "staff-id", db);

  assert.deepEqual(result, { ok: false, code: "INVALID_STATUS" });
  assert.equal(calls.applicationUpdate, null);
  assert.equal(calls.memberCreate, null);
  assert.equal(calls.historyCreate, null);
});

test("does not create a member if the conditional status update loses a race", async () => {
  const { db, calls } = createAcceptanceDatabase({ updateCount: 0 });

  const result = await acceptApplication("application-id", "staff-id", db);

  assert.deepEqual(result, { ok: false, code: "INVALID_STATUS" });
  assert.equal(calls.memberCreate, null);
  assert.equal(calls.historyCreate, null);
});

test("does not accept a missing application", async () => {
  const { db, calls } = createAcceptanceDatabase({ application: null });

  const result = await acceptApplication("application-id", "staff-id", db);

  assert.deepEqual(result, { ok: false, code: "NOT_FOUND" });
  assert.equal(calls.applicationUpdate, null);
});

test("requires a staff reviewer", async () => {
  const { db, calls } = createAcceptanceDatabase();

  const result = await acceptApplication("application-id", null, db);

  assert.deepEqual(result, { ok: false, code: "INVALID_REVIEWER" });
  assert.equal(calls.transactionStarted, false);
});

test("propagates member creation failures without writing status history", async () => {
  const { db, calls } = createAcceptanceDatabase({
    memberCreateError: new Error("member creation failed"),
  });

  await assert.rejects(
    acceptApplication("application-id", "staff-id", db),
    /member creation failed/,
  );
  assert.equal(calls.historyCreate, null);
});
