import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminCentersHandlers,
  createAdminCenterItemHandlers,
  createAdminPartyUnitPeopleHandlers,
  createAdminPartyUnitPersonItemHandlers,
  createAdminPartyUnitPersonStatusHandler,
  createAdminOrganizationMembersSearchHandler,
  createPublicOrganizationHandlers,
} from "./handlers/organization.js";

const staff = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "مدير النظام",
  email: "admin@example.test",
  role: "super_admin",
};

function request(method, url, body) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(params) {
  return { params: Promise.resolve(params) };
}

function guard(allowed = true) {
  return async (_request, options) => {
    assert.equal(options.permission, "organization:manage");
    return allowed ? staff : Response.json({ error: "FORBIDDEN" }, { status: 403 });
  };
}

test("organization center collection validates filters, permission, and creation", async () => {
  let listed;
  let created;
  const handlers = createAdminCentersHandlers({
    guard: guard(),
    listFn: async (query) => { listed = query; return [{ id: 5 }]; },
    createFn: async (input, actor) => { created = { input, actor }; return { item: { id: 6, ...input } }; },
  });

  const list = await handlers.GET(request("GET", "http://localhost/api/admin/content/organization/centers?governorate_id=12"));
  assert.equal(list.status, 200);
  assert.deepEqual(listed, { governorate_id: 12 });
  assert.deepEqual(await list.json(), { items: [{ id: 5 }] });

  const duplicate = await handlers.GET(request("GET", "http://localhost/api/admin/content/organization/centers?governorate_id=12&governorate_id=13"));
  assert.equal(duplicate.status, 400);

  const forbidden = await createAdminCentersHandlers({ guard: guard(false), listFn: async () => { throw new Error("must not run"); } })
    .GET(request("GET", "http://localhost/api/admin/content/organization/centers"));
  assert.equal(forbidden.status, 403);

  const invalid = await handlers.POST(request("POST", "http://localhost/api/admin/content/organization/centers", { governorate_id: 0, name_ar: "" }));
  assert.equal(invalid.status, 400);

  const response = await handlers.POST(request("POST", "http://localhost/api/admin/content/organization/centers", { governorate_id: 12, name_ar: "مركز تجريبي" }));
  assert.equal(response.status, 201);
  assert.equal(created.actor.id, staff.id);
  assert.deepEqual((await response.json()).item, { id: 6, governorate_id: 12, name_ar: "مركز تجريبي" });
});

test("organization item handlers require confirmation and reject deletion with children", async () => {
  let deleted = 0;
  const handlers = createAdminCenterItemHandlers({
    guard: guard(),
    updateFn: async (id, input) => ({ id, ...input }),
    removeFn: async () => { deleted += 1; return { code: "HAS_CHILDREN" }; },
    statusFn: async (id, is_active) => ({ id, is_active }),
  });

  const patched = await handlers.PATCH(request("PATCH", "http://localhost/api/admin/content/organization/centers/4", { name_ar: "اسم معدل" }), context({ id: "4" }));
  assert.equal(patched.status, 200);
  assert.deepEqual((await patched.json()).center, { id: 4, name_ar: "اسم معدل" });

  const noConfirm = await handlers.DELETE(request("DELETE", "http://localhost/api/admin/content/organization/centers/4", {}), context({ id: "4" }));
  assert.equal(noConfirm.status, 400);
  assert.equal(deleted, 0);

  const conflict = await handlers.DELETE(request("DELETE", "http://localhost/api/admin/content/organization/centers/4", { confirm: true }), context({ id: "4" }));
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: "HAS_CHILDREN" });
  assert.equal(deleted, 1);

  const status = await handlers.status(request("PATCH", "http://localhost/api/admin/content/organization/centers/4/status", { is_active: false }), context({ id: "4" }));
  assert.deepEqual((await status.json()).center, { id: 4, is_active: false });
});

test("unit people handlers validate and pass actor context to services", async () => {
  let created;
  const handlers = createAdminPartyUnitPeopleHandlers({
    guard: guard(),
    listFn: async (unitId) => [{ id: "person-1", party_unit_id: unitId }],
    createFn: async (unitId, input, actor) => {
      created = { unitId, input, actor };
      return { item: { id: "person-2", party_unit_id: unitId, ...input } };
    },
  });

  const list = await handlers.GET(request("GET", "http://localhost/api/admin/content/organization/party-units/8/people"), context({ id: "8" }));
  assert.deepEqual(await list.json(), { people: [{ id: "person-1", party_unit_id: 8 }] });

  const invalid = await handlers.POST(request("POST", "http://localhost/api/admin/content/organization/party-units/8/people", { position_title: "أمين" }), context({ id: "8" }));
  assert.equal(invalid.status, 400);

  const response = await handlers.POST(request("POST", "http://localhost/api/admin/content/organization/party-units/8/people", { full_name: "شخص يدوي", position_title: "أمين" }), context({ id: "8" }));
  assert.equal(response.status, 201);
  assert.equal(created.unitId, 8);
  assert.equal(created.actor.id, staff.id);
});

test("unit person update, publish, and delete use the selected unit and person ids", async () => {
  let updated;
  let published;
  let removed;
  const item = createAdminPartyUnitPersonItemHandlers({
    guard: guard(),
    updateFn: async (unitId, personId, input) => { updated = { unitId, personId, input }; return { id: personId, ...input }; },
    removeFn: async (unitId, personId) => { removed = { unitId, personId }; return { deleted: true }; },
  });
  const personId = "33333333-3333-4333-8333-333333333333";
  const patch = await item.PATCH(request("PATCH", "http://localhost/api/admin/content/organization/party-units/8/people/id", { position_title: "أمين جديد" }), context({ id: "8", personId }));
  assert.equal(patch.status, 200);
  assert.deepEqual(updated, { unitId: 8, personId, input: { position_title: "أمين جديد" } });

  const status = createAdminPartyUnitPersonStatusHandler({
    guard: guard(),
    setFn: async (unitId, id, value) => { published = { unitId, id, value }; return { id, is_published: value }; },
  });
  const publishResponse = await status(request("PATCH", "http://localhost/api/admin/content/organization/party-units/8/people/id/status", { is_published: true }), context({ id: "8", personId }));
  assert.equal(publishResponse.status, 200);
  assert.deepEqual(published, { unitId: 8, id: personId, value: true });

  const deletion = await item.DELETE(request("DELETE", "http://localhost/api/admin/content/organization/party-units/8/people/id", { confirm: true }), context({ id: "8", personId }));
  assert.equal(deletion.status, 200);
  assert.deepEqual(removed, { unitId: 8, personId });
});

test("organization member search validates query and only exposes service-safe results", async () => {
  let searched;
  const handler = createAdminOrganizationMembersSearchHandler({
    guard: guard(),
    searchFn: async (query) => { searched = query; return [{ id: "member-id", full_name: "عضو", governorate_name: "القاهرة" }]; },
  });
  assert.equal((await handler(request("GET", "http://localhost/api/admin/content/organization/members?q=a"))).status, 400);
  assert.equal((await handler(request("GET", "http://localhost/api/admin/content/organization/members?q=a&q=b"))).status, 400);
  const response = await handler(request("GET", "http://localhost/api/admin/content/organization/members?q=%D8%B9%D8%B6%D9%88"));
  assert.equal(response.status, 200);
  assert.equal(searched, "عضو");
  assert.deepEqual(await response.json(), { members: [{ id: "member-id", full_name: "عضو", governorate_name: "القاهرة" }] });
});

test("public organization endpoints validate filters and return only their declared response shapes", async () => {
  const handlers = createPublicOrganizationHandlers({
    listGovernoratesFn: async () => [{ id: 1, name_ar: "القاهرة" }],
    listCentersFn: async (id) => [{ id: 2, governorate_id: id, name_ar: "مركز" }],
    listUnitsFn: async (id) => [{ id: 3, name_ar: "وحدة", center_id: id }],
    getUnitFn: async (id) => id === 3 ? { id, name_ar: "وحدة", people: [{ full_name: "شخص", position_title: "أمين" }] } : null,
  });

  assert.deepEqual(await (await handlers.governorates()).json(), { governorates: [{ id: 1, name_ar: "القاهرة" }] });
  assert.equal((await handlers.centers(request("GET", "http://localhost/api/organization/centers"))).status, 400);
  assert.deepEqual(await (await handlers.centers(request("GET", "http://localhost/api/organization/centers?governorate_id=1"))).json(), { centers: [{ id: 2, governorate_id: 1, name_ar: "مركز" }] });
  assert.equal((await handlers.units(request("GET", "http://localhost/api/organization/party-units?center_id=1&center_id=2"))).status, 400);
  assert.deepEqual(await (await handlers.units(request("GET", "http://localhost/api/organization/party-units?center_id=2"))).json(), { party_units: [{ id: 3, name_ar: "وحدة", center_id: 2 }] });
  assert.equal((await handlers.unit(request("GET", "http://localhost/api/organization/party-units/4"), context({ id: "4" }))).status, 404);
  const unit = await handlers.unit(request("GET", "http://localhost/api/organization/party-units/3"), context({ id: "3" }));
  assert.deepEqual(await unit.json(), { party_unit: { id: 3, name_ar: "وحدة", people: [{ full_name: "شخص", position_title: "أمين" }] } });
});
