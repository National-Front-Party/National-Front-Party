import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogIdSchema,
  catalogListQuerySchema,
  catalogStatusSchema,
  ministryCreateSchema,
  ministryUpdateSchema,
  requestSectorCreateSchema,
  requestSectorUpdateSchema,
} from "./service-catalogs.js";

test("catalog list query validates bounded pagination", () => {
  assert.deepEqual(catalogListQuerySchema.parse({}), { page: 1, page_size: 25 });
  assert.deepEqual(catalogListQuerySchema.parse({ page: "2", page_size: "100" }), {
    page: 2,
    page_size: 100,
  });
  for (const query of [
    { page: "0" }, { page: "10001" }, { page_size: "0" },
    { page_size: "101" }, { unexpected: "x" },
  ]) assert.equal(catalogListQuerySchema.safeParse(query).success, false);
});

test("catalog IDs are positive SmallInt values", () => {
  assert.equal(catalogIdSchema.safeParse("1").success, true);
  for (const id of ["0", "32768", "1.5", "1.0", "1e2", " 1", "bad"]) {
    assert.equal(catalogIdSchema.safeParse(id).success, false, id);
  }
});

test("ministry and sector payloads require only editable fields and reject protected fields", () => {
  assert.deepEqual(ministryCreateSchema.parse({ slug: "health", name_ar: "الصحة", sort_order: 0 }), {
    slug: "health", name_ar: "الصحة", sort_order: 0,
  });
  assert.deepEqual(requestSectorCreateSchema.parse({ code: "health", name_ar: "الصحة", sort_order: 1 }), {
    code: "health", name_ar: "الصحة", sort_order: 1,
  });
  assert.deepEqual(ministryCreateSchema.parse({ slug: "health", name_ar: "الصحة" }), {
    slug: "health", name_ar: "الصحة",
  });
  assert.deepEqual(requestSectorCreateSchema.parse({ code: "health", name_ar: "الصحة" }), {
    code: "health", name_ar: "الصحة",
  });
  for (const schema of [ministryCreateSchema, requestSectorCreateSchema]) {
    assert.equal(schema.safeParse({ slug: "x", code: "x", name_ar: "N", sort_order: 0 }).success, false);
    assert.equal(schema.safeParse({ name_ar: "N", sort_order: 0 }).success, false);
    assert.equal(schema.safeParse({ name_ar: "N", sort_order: 0, is_active: false }).success, false);
    assert.equal(schema.safeParse({ name_ar: " ", sort_order: 0, [schema === ministryCreateSchema ? "slug" : "code"]: "x" }).success, false);
    assert.equal(schema.safeParse({ name_ar: "N", sort_order: 32768, [schema === ministryCreateSchema ? "slug" : "code"]: "x" }).success, false);
  }
});

test("updates reject empty and unknown payloads while status accepts only a boolean", () => {
  assert.equal(ministryUpdateSchema.safeParse({}).success, false);
  assert.equal(requestSectorUpdateSchema.safeParse({ id: 3 }).success, false);
  assert.equal(ministryUpdateSchema.safeParse({ name_ar: "اسم" }).success, true);
  assert.equal(requestSectorUpdateSchema.safeParse({ sort_order: -32768 }).success, true);
  assert.equal(catalogStatusSchema.safeParse({ is_active: false }).success, true);
  assert.equal(catalogStatusSchema.safeParse({ is_active: "false" }).success, false);
  assert.equal(catalogStatusSchema.safeParse({ is_active: true, name_ar: "x" }).success, false);
});
