import assert from "node:assert/strict";
import test from "node:test";
import {
  createServiceRequest,
  getActiveMinistries,
  getActiveRequestSectors,
  updateServiceRequestStatus,
} from "./service-requests.js";
import { createServiceRequestStatusHandler } from "../service-requests/action-handlers.js";

function database({ inactive = null } = {}) {
  const calls = { ministryQuery: null, sectorQuery: null, created: [], transaction: 0 };
  const tx = {
    $queryRaw: async (strings, ...values) => {
      const sql = strings.join("?");
      const value = values[0];
      if (sql.includes('FROM "ministries"')) {
        calls.ministryQuery = { sql, value };
        return inactive === "ministry" ? [] : [{ id: value }];
      }
      calls.sectorQuery = { sql, value };
      return inactive === "sector" ? [] : [{ id: value }];
    },
    service_requests: {
      create: async (args) => {
        calls.created.push(args);
        return { id: `request-${calls.created.length}` };
      },
    },
  };
  return {
    calls,
    tx,
    db: {
      ministries: { findMany: async (query) => { calls.ministryListQuery = query; return []; } },
      request_sectors: { findMany: async (query) => { calls.sectorListQuery = query; return []; } },
      $transaction: async (callback) => { calls.transaction += 1; return callback(tx); },
    },
  };
}

test("active catalog services select only form fields and use stable ordering", async () => {
  const { db, calls } = database();
  await getActiveMinistries(db);
  await getActiveRequestSectors(db);
  for (const query of [calls.ministryListQuery, calls.sectorListQuery]) {
    assert.deepEqual(query.where, { is_active: true });
    assert.deepEqual(query.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
    assert.deepEqual(query.select, { id: true, name_ar: true, sort_order: true });
  }
});

test("creation locks active independent catalogs and persists only submitted fields", async () => {
  const { db, calls } = database();
  const input = { full_name: "مواطن", phone: "01012345678", ministry_id: 4, sector_id: 7 };
  const first = await createServiceRequest(input, db);
  const second = await createServiceRequest(input, db);

  assert.deepEqual(first, { ok: true, id: "request-1" });
  assert.deepEqual(second, { ok: true, id: "request-2" });
  assert.equal(calls.transaction, 2);
  assert.match(calls.ministryQuery.sql, /FOR SHARE/);
  assert.equal(calls.ministryQuery.value, 4);
  assert.match(calls.sectorQuery.sql, /FOR SHARE/);
  assert.equal(calls.sectorQuery.value, 7);
  assert.deepEqual(calls.created[0], {
    data: input,
    select: { id: true },
  });
  assert.equal(Object.hasOwn(calls.created[0].data, "status"), false);
  assert.equal(Object.hasOwn(calls.created[0].data, "assigned_to"), false);
  assert.equal(Object.hasOwn(calls.created[0].data, "internal_notes"), false);
});

test("inactive or missing ministry or sector prevents request creation", async (t) => {
  for (const inactive of ["ministry", "sector"]) {
    await t.test(inactive, async () => {
      const { db, calls } = database({ inactive });
      const result = await createServiceRequest({
        full_name: "مواطن", phone: "01012345678", ministry_id: 4, sector_id: 7,
      }, db);
      assert.deepEqual(result, { ok: false, code: "INVALID_SELECTION" });
      assert.equal(calls.created.length, 0);
      if (inactive === "ministry") assert.equal(calls.sectorQuery, null);
    });
  }
});

test("creation requires transaction and PostgreSQL row-lock support", async () => {
  await assert.rejects(
    () => createServiceRequest({ ministry_id: 1, sector_id: 1 }, {}),
    /transactional database client/,
  );
  await assert.rejects(
    () => createServiceRequest({ ministry_id: 1, sector_id: 1 }, { $transaction: (callback) => callback({}) }),
    /row locks are required/,
  );
});

function statusDatabase(currentStatus, updateCount = 1) {
  const calls = { findUnique: null, updateMany: null };
  return {
    calls,
    db: {
      service_requests: {
        findUnique: async (query) => {
          calls.findUnique = query;
          return { id: "request-1", status: currentStatus, request_no: 42n };
        },
        updateMany: async (query) => {
          calls.updateMany = query;
          return { count: updateCount };
        },
      },
    },
  };
}

test("service request status updates allow only transitions exposed by the UI", async (t) => {
  for (const [from, to] of [
    ["new", "in_progress"],
    ["in_progress", "completed"],
    ["in_progress", "rejected"],
  ]) {
    await t.test(`${from} -> ${to}`, async () => {
      const { db, calls } = statusDatabase(from);
      const result = await updateServiceRequestStatus("request-1", to, "staff-1", "note", db);
      assert.deepEqual(result, { ok: true, status: to, request_no: "42" });
      assert.deepEqual(calls.updateMany.where, { id: "request-1", status: from });
      assert.equal(calls.updateMany.data.status, to);
      assert.equal(calls.updateMany.data.assigned_to, "staff-1");
      assert.equal(calls.updateMany.data.internal_notes, "note");
    });
  }
});

test("direct service calls reject invalid and terminal status transitions without writing", async () => {
  for (const [from, to] of [
    ["new", "completed"],
    ["new", "rejected"],
    ["in_progress", "new"],
    ["completed", "in_progress"],
    ["rejected", "in_progress"],
    ["closed", "in_progress"],
    ["in_progress", "in_progress"],
  ]) {
    const { db, calls } = statusDatabase(from);
    const result = await updateServiceRequestStatus("request-1", to, "staff-1", undefined, db);
    assert.deepEqual(result, { ok: false, code: "INVALID_TRANSITION" }, `${from} -> ${to}`);
    assert.equal(calls.updateMany, null, `${from} -> ${to} must not write`);
  }
});

test("conditional status write rejects a concurrent transition after the status changes", async () => {
  const { db } = statusDatabase("in_progress", 0);
  assert.deepEqual(
    await updateServiceRequestStatus("request-1", "completed", "staff-1", undefined, db),
    { ok: false, code: "INVALID_TRANSITION" },
  );
});

test("status route returns a clear client error for an invalid transition", async () => {
  const handler = createServiceRequestStatusHandler({
    guard: async () => ({ id: "staff-1", role: "super_admin" }),
    updateFn: async () => ({ ok: false, code: "INVALID_TRANSITION" }),
  });
  const response = await handler(new Request("http://localhost/api/admin/service-requests/11111111-1111-4111-8111-111111111111/status", {
    method: "PATCH",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ status: "completed" }),
  }), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "INVALID_TRANSITION" });
});
