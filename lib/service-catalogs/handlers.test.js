import assert from "node:assert/strict";
import test from "node:test";
import { requireStaff } from "../auth/guard.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../auth/session.js";
import {
  createServiceCatalogCollectionHandlers,
  createServiceCatalogItemHandlers,
  createServiceCatalogStatusHandler,
} from "./handlers.js";

process.env.SESSION_SECRET ??= "service-catalog-test-session-secret-32-bytes";

const staffIds = {
  super_admin: "11111111-1111-4111-8111-111111111111",
  news_editor: "22222222-2222-4222-8222-222222222222",
  news_reviewer: "33333333-3333-4333-8333-333333333333",
};

function staffRecord(id, role, is_active = true) {
  return { id, full_name: "Test Staff", email: "staff@example.test", role, is_active, must_change_password: false };
}

function guardFor(staffById) {
  return (request, options) => requireStaff(request, {
    ...options,
    db: { staff_users: { findUnique: async ({ where }) => staffById[where.id] ?? null } },
  });
}

async function request(method, url, staffId, body) {
  const token = staffId ? await createSessionToken(staffId) : null;
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (token) headers.set("cookie", `${SESSION_COOKIE_NAME}=${token}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ministry = {
  id: 1,
  slug: "health",
  name_ar: "الصحة",
  sort_order: 1,
  is_active: true,
  created_at: "2026-11-17T00:00:00.000Z",
};
const sector = {
  id: 2,
  code: "health",
  name_ar: "الصحة",
  sort_order: 1,
  is_active: true,
  created_at: "2026-11-17T00:00:00.000Z",
};

test("catalog routes use services:manage and allow super_admin", async () => {
  const staff = {
    [staffIds.super_admin]: staffRecord(staffIds.super_admin, "super_admin"),
    [staffIds.news_editor]: staffRecord(staffIds.news_editor, "news_editor"),
  };
  let permission;
  const handlers = createServiceCatalogCollectionHandlers("ministries", {
    guard: async (req, options) => {
      permission = options.permission;
      return guardFor(staff)(req, options);
    },
    listFn: async () => ({ items: [ministry], pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 } }),
  });
  for (const id of [staffIds.super_admin]) {
    const response = await handlers.GET(await request("GET", "http://localhost:3000/api/admin/ministries", id));
    assert.equal(response.status, 200);
  }
  assert.equal(permission, "services:manage");
});

test("catalog APIs reject missing sessions, inactive staff, and other roles", async () => {
  const staff = {
    [staffIds.news_editor]: staffRecord(staffIds.news_editor, "news_editor", false),
    [staffIds.news_reviewer]: staffRecord(staffIds.news_reviewer, "news_reviewer"),
  };
  const handlers = createServiceCatalogCollectionHandlers("request_sectors", {
    guard: guardFor(staff),
    listFn: async () => assert.fail("unauthorized request must not list"),
  });
  assert.equal((await handlers.GET(await request("GET", "http://localhost:3000/api/admin/request-sectors"))).status, 401);
  assert.equal((await handlers.GET(await request("GET", "http://localhost:3000/api/admin/request-sectors", staffIds.news_editor))).status, 401);
  assert.equal((await handlers.GET(await request("GET", "http://localhost:3000/api/admin/request-sectors", staffIds.news_reviewer))).status, 403);
});

test("catalog list rejects duplicate, unknown, and invalid pagination parameters", async () => {
  const handlers = createServiceCatalogCollectionHandlers("ministries", {
    guard: async () => staffRecord(staffIds.super_admin, "super_admin"),
    listFn: async () => assert.fail("invalid query must not list"),
  });
  for (const query of ["page=1&page=2", "unexpected=x", "page=0", "page_size=101"]) {
    const response = await handlers.GET(await request(
      "GET", `http://localhost:3000/api/admin/ministries?${query}`, staffIds.super_admin,
    ));
    assert.equal(response.status, 400, query);
  }
});

test("ministry and sector create, detail, and update return catalog records", async () => {
  const guard = async () => staffRecord(staffIds.super_admin, "super_admin");
  const ministryHandlers = createServiceCatalogCollectionHandlers("ministries", {
    guard,
    createFn: async (_catalog, input) => ({ ...ministry, ...input }),
  });
  const createdMinistry = await ministryHandlers.POST(await request(
    "POST", "http://localhost:3000/api/admin/ministries", staffIds.super_admin,
    { slug: "health", name_ar: "الصحة", sort_order: 1 },
  ));
  assert.equal(createdMinistry.status, 201);
  assert.equal((await createdMinistry.json()).ministry.slug, "health");

  const sectorHandlers = createServiceCatalogCollectionHandlers("request_sectors", {
    guard,
    createFn: async (_catalog, input) => ({ ...sector, ...input }),
  });
  const createdSector = await sectorHandlers.POST(await request(
    "POST", "http://localhost:3000/api/admin/request-sectors", staffIds.super_admin,
    { code: "health", name_ar: "الصحة", sort_order: 1 },
  ));
  assert.equal(createdSector.status, 201);
  assert.equal((await createdSector.json()).request_sector.code, "health");

  const idContext = { params: Promise.resolve({ id: "1" }) };
  const itemHandlers = createServiceCatalogItemHandlers("ministries", {
    guard,
    getFn: async () => ministry,
    updateFn: async (_catalog, id, input) => ({ ...ministry, ...input, id }),
  });
  assert.equal((await itemHandlers.GET(await request("GET", "http://localhost:3000/api/admin/ministries/1", staffIds.super_admin), idContext)).status, 200);
  const patched = await itemHandlers.PATCH(await request(
    "PATCH", "http://localhost:3000/api/admin/ministries/1", staffIds.super_admin, { name_ar: "وزارة الصحة" },
  ), idContext);
  assert.equal((await patched.json()).ministry.name_ar, "وزارة الصحة");

  const sectorItemHandlers = createServiceCatalogItemHandlers("request_sectors", {
    guard,
    getFn: async () => sector,
    updateFn: async (_catalog, id, input) => ({ ...sector, ...input, id }),
  });
  const sectorPatch = await sectorItemHandlers.PATCH(await request(
    "PATCH", "http://localhost:3000/api/admin/request-sectors/2", staffIds.super_admin, { sort_order: 2 },
  ), { params: Promise.resolve({ id: "2" }) });
  assert.equal((await sectorPatch.json()).request_sector.sort_order, 2);
});

test("invalid IDs and payloads are rejected; unknown fields cannot be changed", async () => {
  const guard = async () => staffRecord(staffIds.super_admin, "super_admin");
  const items = createServiceCatalogItemHandlers("ministries", { guard });
  for (const id of ["0", "32768", "nope"]) {
    const response = await items.GET(await request("GET", `http://localhost:3000/api/admin/ministries/${id}`, staffIds.super_admin), {
      params: Promise.resolve({ id }),
    });
    assert.equal(response.status, 400, id);
  }
  const collection = createServiceCatalogCollectionHandlers("ministries", { guard });
  const invalid = await collection.POST(await request(
    "POST", "http://localhost:3000/api/admin/ministries", staffIds.super_admin,
    { slug: "health", name_ar: "الصحة", sort_order: 0, is_active: false },
  ));
  assert.equal(invalid.status, 400);
  const invalidPatch = await items.PATCH(await request(
    "PATCH", "http://localhost:3000/api/admin/ministries/1", staffIds.super_admin, { id: 9 },
  ), { params: Promise.resolve({ id: "1" }) });
  assert.equal(invalidPatch.status, 400);
});

test("missing records and unique conflicts have safe responses", async () => {
  const guard = async () => staffRecord(staffIds.super_admin, "super_admin");
  const missing = createServiceCatalogItemHandlers("ministries", { guard, getFn: async () => null });
  const notFound = await missing.GET(await request("GET", "http://localhost:3000/api/admin/ministries/9", staffIds.super_admin), {
    params: Promise.resolve({ id: "9" }),
  });
  assert.equal(notFound.status, 404);

  for (const [catalog, body, expected] of [
    ["ministries", { slug: "health", name_ar: "الصحة", sort_order: 1 }, "DUPLICATE_SLUG"],
    ["request_sectors", { code: "health", name_ar: "الصحة", sort_order: 1 }, "DUPLICATE_CODE"],
  ]) {
    const collection = createServiceCatalogCollectionHandlers(catalog, {
      guard,
      createFn: async () => { const error = new Error("database detail"); error.code = "P2002"; throw error; },
    });
    const response = await collection.POST(await request(
      "POST", `http://localhost:3000/api/admin/${catalog.replace("_", "-")}`,
      staffIds.super_admin, body,
    ));
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: expected });
  }
});

test("status operations deactivate and activate without deleting historical references", async () => {
  const guard = async () => staffRecord(staffIds.super_admin, "super_admin");
  let received;
  const handler = createServiceCatalogStatusHandler("ministries", {
    guard,
    setActiveFn: async (...args) => { received = args; return { ...ministry, is_active: args[2] }; },
  });
  for (const is_active of [false, true]) {
    const response = await handler(await request(
      "PATCH", "http://localhost:3000/api/admin/ministries/1/status", staffIds.super_admin, { is_active },
    ), { params: Promise.resolve({ id: "1" }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ministry.is_active, is_active);
    assert.deepEqual(received, ["ministries", 1, is_active]);
  }
  assert.equal(Object.keys(createServiceCatalogCollectionHandlers("ministries")).includes("DELETE"), false);
  assert.equal(typeof createServiceCatalogItemHandlers("request_sectors").DELETE, "function");
});
