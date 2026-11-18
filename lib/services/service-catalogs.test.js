import assert from "node:assert/strict";
import test from "node:test";
import {
  createServiceCatalogItem,
  getServiceCatalogItem,
  listServiceCatalog,
  setServiceCatalogActive,
  updateServiceCatalogItem,
} from "./service-catalogs.js";

function mockCatalogDb(modelName) {
  const calls = {};
  const model = {};
  for (const method of ["findMany", "count", "findUnique", "create", "update"]) {
    model[method] = async (args) => {
      calls[method] = args;
      return method === "findMany" ? [] : method === "count" ? 0 : { id: 2, ...args.data };
    };
  }
  return { db: { [modelName]: model }, calls };
}

for (const [catalog, modelName, uniqueField, uniqueValue] of [
  ["ministries", "ministries", "slug", "health"],
  ["request_sectors", "request_sectors", "code", "health"],
]) {
  test(`${catalog} service lists, reads, creates, and updates with allowlisted fields`, async () => {
    const { db, calls } = mockCatalogDb(modelName);
    const listed = await listServiceCatalog(catalog, { page: 2, page_size: 10 }, db);
    assert.deepEqual(calls.findMany.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
    assert.equal(calls.findMany.skip, 10);
    assert.equal(calls.findMany.take, 10);
    assert.deepEqual(listed.pagination, { page: 2, page_size: 10, total: 0, total_pages: 0 });
    assert.equal(Object.hasOwn(calls.findMany.select, "relations"), false);
    assert.equal(calls.findMany.select[uniqueField], true);
    assert.equal(calls.findMany.select.created_at, catalog === "ministries" ? true : undefined);

    await getServiceCatalogItem(catalog, 2, db);
    assert.deepEqual(calls.findUnique.where, { id: 2 });
    await createServiceCatalogItem(catalog, { [uniqueField]: uniqueValue, name_ar: "اسم", sort_order: 1 }, db);
    assert.deepEqual(calls.create.data, { [uniqueField]: uniqueValue, name_ar: "اسم", sort_order: 1 });
    await updateServiceCatalogItem(catalog, 2, { name_ar: "اسم جديد" }, db);
    assert.deepEqual(calls.update.data, { name_ar: "اسم جديد" });
  });

  test(`${catalog} deactivation changes only is_active and preserves referenced requests`, async () => {
    const { db, calls } = mockCatalogDb(modelName);
    await setServiceCatalogActive(catalog, 2, false, db);
    assert.deepEqual(calls.update.where, { id: 2 });
    assert.deepEqual(calls.update.data, { is_active: false });
    assert.equal(Object.hasOwn(calls.update.data, "service_requests"), false);
  });
}

test("service rejects unsupported catalog names", async () => {
  await assert.rejects(() => listServiceCatalog("unknown", { page: 1, page_size: 25 }, {}), TypeError);
});
