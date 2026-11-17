import assert from "node:assert/strict";
import test from "node:test";
import {
  createServiceRequest,
  getActiveMinistries,
  getActiveRequestSectors,
} from "./service-requests.js";

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
