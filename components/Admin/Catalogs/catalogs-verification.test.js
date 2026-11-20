import assert from "node:assert/strict";
import test from "node:test";
import {
  ministryCreateSchema,
  ministryUpdateSchema,
  requestSectorCreateSchema,
  requestSectorUpdateSchema,
  catalogStatusSchema,
  catalogListQuerySchema,
} from "../../../lib/validation/service-catalogs.js";
import { canAccess, ROLE_PERMISSIONS } from "../../../lib/admin/permissions.js";

test("Ministries: validation schema strictly accepts only valid fields and rejects unknown/extra fields", () => {
  // Valid create payload
  const validMinistry = {
    name_ar: "وزارة الصحة والسكان",
    slug: "health",
    sort_order: 1,
  };
  const parseResult = ministryCreateSchema.safeParse(validMinistry);
  assert.equal(parseResult.success, true);

  // Rejects is_active inside POST / ministries (must use /status endpoint)
  const invalidWithActive = {
    name_ar: "وزارة الصحة والسكان",
    slug: "health",
    is_active: true,
  };
  assert.equal(ministryCreateSchema.safeParse(invalidWithActive).success, false);

  // Valid update payload
  const validUpdate = {
    name_ar: "وزارة الصحة المعدلة",
    sort_order: 5,
  };
  assert.equal(ministryUpdateSchema.safeParse(validUpdate).success, true);

  // Status payload
  assert.equal(catalogStatusSchema.safeParse({ is_active: false }).success, true);
  assert.equal(catalogStatusSchema.safeParse({ is_active: true }).success, true);
  assert.equal(catalogStatusSchema.safeParse({ is_active: "invalid" }).success, false);
});

test("Request Sectors: validation schema strictly accepts valid fields and rejects unknown/extra fields", () => {
  // Valid create payload
  const validSector = {
    name_ar: "العلاج على نفقة الدولة",
    code: "state-funded-treatment",
    sort_order: 10,
  };
  assert.equal(requestSectorCreateSchema.safeParse(validSector).success, true);

  // Rejects is_active inside POST / request-sectors
  const invalidWithActive = {
    name_ar: "العلاج على نفقة الدولة",
    code: "state-funded-treatment",
    is_active: false,
  };
  assert.equal(requestSectorCreateSchema.safeParse(invalidWithActive).success, false);

  // Valid update payload
  const validUpdate = {
    code: "treatment-updated",
    sort_order: -5,
  };
  assert.equal(requestSectorUpdateSchema.safeParse(validUpdate).success, true);
});

test("List query parameters: strictly allows only page and page_size up to 100", () => {
  assert.equal(catalogListQuerySchema.safeParse({ page: "1", page_size: "100" }).success, true);
  assert.equal(catalogListQuerySchema.safeParse({ page: 1, page_size: 25 }).success, true);

  // Rejects unsupported query parameters like search, status, etc.
  assert.equal(catalogListQuerySchema.safeParse({ page: 1, page_size: 25, search: "health" }).success, false);
  assert.equal(catalogListQuerySchema.safeParse({ page: 1, page_size: 25, is_active: "true" }).success, false);
  assert.equal(catalogListQuerySchema.safeParse({ page: 1, page_size: 101 }).success, false);
});

test("Permissions: super_admin and service_officer have catalogs access, others do not", () => {
  assert.equal(canAccess("super_admin", "catalogs"), true);
  assert.equal(canAccess("service_officer", "catalogs"), true);

  assert.equal(canAccess("membership_officer", "catalogs"), false);
  assert.equal(canAccess("content_editor", "catalogs"), false);
  assert.equal(canAccess("news_editor", "catalogs"), false);
  assert.equal(canAccess("news_reviewer", "catalogs"), false);

  assert.equal(ROLE_PERMISSIONS.super_admin.includes("services:manage"), true);
  assert.equal(ROLE_PERMISSIONS.service_officer.includes("services:manage"), true);
});

test("Local search and filtering simulation for Ministries and Request Sectors", () => {
  const sampleMinistries = [
    { id: 1, name_ar: "وزارة الصحة والسكان", slug: "health", is_active: true, sort_order: 1 },
    { id: 2, name_ar: "وزارة التربية والتعليم", slug: "education", is_active: false, sort_order: 2 },
    { id: 3, name_ar: "وزارة التعليم العالي", slug: "higher-education", is_active: true, sort_order: 3 },
  ];

  // Status Filter: Active
  const activeOnly = sampleMinistries.filter((m) => m.is_active);
  assert.equal(activeOnly.length, 2);

  // Status Filter: Inactive
  const inactiveOnly = sampleMinistries.filter((m) => !m.is_active);
  assert.equal(inactiveOnly.length, 1);
  assert.equal(inactiveOnly[0].slug, "education");

  // Search by Arabic name
  const searchName = sampleMinistries.filter((m) =>
    m.name_ar.toLowerCase().includes("تعليم") || m.slug.toLowerCase().includes("تعليم"),
  );
  assert.equal(searchName.length, 2);

  // Search by Slug
  const searchSlug = sampleMinistries.filter((m) =>
    m.name_ar.toLowerCase().includes("health") || m.slug.toLowerCase().includes("health"),
  );
  assert.equal(searchSlug.length, 1);
  assert.equal(searchSlug[0].name_ar, "وزارة الصحة والسكان");

  // Sort order update re-sorting simulation
  const updatedItem = { ...sampleMinistries[1], sort_order: 0 };
  const resorted = sampleMinistries
    .map((m) => (m.id === updatedItem.id ? updatedItem : m))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);

  assert.equal(resorted[0].slug, "education");
  assert.equal(resorted[0].sort_order, 0);
});

test("Friendly duplicate error messages mapping", () => {
  const getDuplicateMessage = (code) => {
    if (code === "DUPLICATE_SLUG") {
      return "المعرّف المختصر مستخدم بالفعل، برجاء اختيار معرّف آخر.";
    }
    if (code === "DUPLICATE_CODE") {
      return "كود القطاع مستخدم بالفعل، برجاء إدخال كود مختلف.";
    }
    return null;
  };

  assert.equal(
    getDuplicateMessage("DUPLICATE_SLUG"),
    "المعرّف المختصر مستخدم بالفعل، برجاء اختيار معرّف آخر.",
  );
  assert.equal(
    getDuplicateMessage("DUPLICATE_CODE"),
    "كود القطاع مستخدم بالفعل، برجاء إدخال كود مختلف.",
  );
});

test("Service Catalog DELETE handler enforces permissions, confirmation, and conflict checks", async () => {
  const { createServiceCatalogItemHandlers } = await import(
    "../../../lib/service-catalogs/handlers.js"
  );

  // 1. Unauthorized staff guard check (service_officer lacks records:delete)
  const handlers = createServiceCatalogItemHandlers("ministries", {
    guard: async (_req, opts) => {
      if (opts?.permission === "records:delete") {
        return new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
      }
      return { id: "user-1", role: "service_officer" };
    },
    deleteFn: async () => ({ ok: true }),
  });

  const resForbidden = await handlers.DELETE(
    new Request("http://localhost/api/admin/ministries/1", { method: "DELETE" }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resForbidden.status, 403);

  // 2. Authorized staff guard with missing confirmation payload
  const authHandlers = createServiceCatalogItemHandlers("ministries", {
    guard: async () => ({ id: "admin-1", role: "super_admin" }),
    deleteFn: async () => ({ ok: true }),
  });

  const resNoConfirm = await authHandlers.DELETE(
    new Request("http://localhost/api/admin/ministries/1", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resNoConfirm.status, 400);

  // 3. Conflict when catalog item is in use by service requests
  const conflictHandlers = createServiceCatalogItemHandlers("ministries", {
    guard: async () => ({ id: "admin-1", role: "super_admin" }),
    deleteFn: async () => ({ ok: false, code: "CATALOG_IN_USE", count: 3 }),
  });

  const resConflict = await conflictHandlers.DELETE(
    new Request("http://localhost/api/admin/ministries/1", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resConflict.status, 409);
  const conflictBody = await resConflict.json();
  assert.equal(conflictBody.error, "CATALOG_IN_USE");
  assert.equal(conflictBody.count, 3);

  // 4. Successful deletion when unreferenced
  const successHandlers = createServiceCatalogItemHandlers("ministries", {
    guard: async () => ({ id: "admin-1", role: "super_admin" }),
    deleteFn: async (_cat, id) => ({
      ok: true,
      item: { id, name_ar: "وزارة تجريبية", slug: "test-min" },
    }),
  });

  const resSuccess = await successHandlers.DELETE(
    new Request("http://localhost/api/admin/ministries/5", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    }),
    { params: Promise.resolve({ id: "5" }) },
  );
  assert.equal(resSuccess.status, 200);
  const successBody = await resSuccess.json();
  assert.equal(successBody.ok, true);
  assert.equal(successBody.ministry.name_ar, "وزارة تجريبية");
});
