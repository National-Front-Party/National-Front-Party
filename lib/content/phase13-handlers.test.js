import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission } from "../auth/permissions.js";
import {
  createAdminPopupsCollectionHandlers,
  createAdminPopupItemHandlers,
  createAdminPopupStatusHandler,
  createPublicPopupsHandlers,
} from "./handlers/popups.js";
import {
  createAdminPanelsCollectionHandlers,
  createAdminPanelItemHandlers,
  createAdminPanelStatusHandler,
  createAdminLeadersCollectionHandlers,
  createAdminLeadershipContentsCollectionHandlers,
  createPublicLeadershipHandler,
} from "./handlers/leadership.js";
import {
  createAdminCentralSecretariatsCollectionHandlers,
  createAdminCentralSecretariatItemHandlers,
  createAdminCentralSecretariatPeopleCollectionHandlers,
  createAdminCentralSecretariatPersonItemHandlers,
  createAdminCentralSecretariatPersonStatusHandler,
  createPublicCentralSecretariatsHandlers,
} from "./handlers/central-secretariats.js";
import { contentFailure } from "./http.js";
import {
  createAdminGovernorateSecretariatsCollectionHandlers,
  createAdminGovernorateSecretariatItemHandlers,
  createPublicGovernorateSecretariatsHandlers,
} from "./handlers/governorate-secretariats.js";
import {
  createAdminParliamentaryCollectionHandlers,
  createAdminParliamentaryItemHandlers,
  createAdminParliamentaryStatusHandler,
  createPublicParliamentaryHandlers,
} from "./handlers/parliamentary-unit.js";
import { getLeadershipPublic } from "../services/content-leadership.js";
import { listCentralSecretariatsPublic } from "../services/content-central-secretariats.js";

const superAdmin = { id: "11111111-1111-4111-8111-111111111111", full_name: "SA", email: "sa@example.test", role: "super_admin" };
const contentEditor = { id: "22222222-2222-4222-8222-222222222222", full_name: "CE", email: "ce@example.test", role: "content_editor" };
const officer = { id: "33333333-3333-4333-8333-333333333333", full_name: "MO", email: "mo@example.test", role: "membership_officer" };

function req(method, url, body) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
function ctx(params) { return { params: Promise.resolve(params) }; }

function guardByRole(role) {
  const staff = role === "super_admin" ? superAdmin : role === "content_editor" ? contentEditor : officer;
  return async (_request, options) => {
    if (!hasPermission(staff.role, options.permission)) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return staff;
  };
}

test("permissions: super_admin/content_editor can manage content; unauthorized roles rejected", async () => {
  assert.equal(hasPermission("super_admin", "content:manage"), true);
  assert.equal(hasPermission("content_editor", "content:manage"), true);
  assert.equal(hasPermission("membership_officer", "content:manage"), false);
  assert.equal(hasPermission("service_officer", "content:manage"), false);
  assert.equal(hasPermission("news_editor", "content:manage"), false);
  assert.equal(hasPermission("super_admin", "records:delete"), true);
  assert.equal(hasPermission("content_editor", "records:delete"), false);

  let called = 0;
  const handlers = createAdminPopupsCollectionHandlers({
    guard: guardByRole("membership_officer"),
    listFn: async () => { called += 1; return { items: [] }; },
  });
  const res = await handlers.GET(req("GET", "http://localhost/api/admin/content/popups"));
  assert.equal(res.status, 403);
  assert.equal(called, 0);

  let called2 = 0;
  const okHandlers = createAdminPopupsCollectionHandlers({
    guard: guardByRole("content_editor"),
    listFn: async () => { called2 += 1; return { items: [], pagination: {} }; },
  });
  assert.equal((await okHandlers.GET(req("GET", "http://localhost/api/admin/content/popups"))).status, 200);
  assert.equal(called2, 1);

  const saHandlers = createAdminPopupsCollectionHandlers({
    guard: guardByRole("super_admin"),
    listFn: async () => ({ items: [], pagination: {} }),
  });
  assert.equal((await saHandlers.GET(req("GET", "http://localhost/api/admin/content/popups"))).status, 200);
});

test("hard delete requires records:delete permission and {confirm:true}", async () => {
  let deleted = 0;
  const handlers = createAdminPopupItemHandlers({
    guard: guardByRole("content_editor"),
    deleteFn: async () => { deleted += 1; return { deleted: true }; },
  });
  const forbidden = await handlers.DELETE(req("DELETE", "http://localhost/api/admin/content/popups/1", { confirm: true }), ctx({ id: "1" }));
  assert.equal(forbidden.status, 403);
  assert.equal(deleted, 0);

  let deleted2 = 0;
  const saHandlers = createAdminPopupItemHandlers({
    guard: guardByRole("super_admin"),
    deleteFn: async () => { deleted2 += 1; return { deleted: true }; },
  });
  const missingConfirm = await saHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/popups/1", {}), ctx({ id: "1" }));
  assert.equal(missingConfirm.status, 400);
  assert.equal(deleted2, 0);
  const wrongConfirm = await saHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/popups/1", { confirm: false }), ctx({ id: "1" }));
  assert.equal(wrongConfirm.status, 400);
  assert.equal(deleted2, 0);
  const ok = await saHandlers.DELETE(req("DELETE", "http://localhost/api/admin/content/popups/1", { confirm: true }), ctx({ id: "1" }));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { deleted: true });
  assert.equal(deleted2, 1);
});

test("popups admin handlers: CRUD, publish/unpublish, validation", async () => {
  let last;
  const collection = createAdminPopupsCollectionHandlers({
    guard: guardByRole("content_editor"),
    listFn: async (q) => { last = { list: q }; return { items: [], pagination: { page: q.page, page_size: q.page_size, total: 0, total_pages: 0 } }; },
    createFn: async (input, staff) => { last = { create: input, staff: staff.role }; return { id: 1, ...input }; },
  });
  assert.equal((await collection.GET(req("GET", "http://localhost/api/admin/content/popups?page=1&page=2"))).status, 400); // duplicate
  assert.equal((await collection.GET(req("GET", "http://localhost/api/admin/content/popups?page=2&page_size=10"))).status, 200);
  assert.deepEqual(last.list, { page: 2, page_size: 10 });
  const badCreate = await collection.POST(req("POST", "http://localhost/api/admin/content/popups", { slug: "Bad Slug", title: "x" }));
  assert.equal(badCreate.status, 400);
  const created = await collection.POST(req("POST", "http://localhost/api/admin/content/popups", { slug: "popup-about", title: "من نحن؟", sort_order: 1 }));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).popup.slug, "popup-about");
  assert.equal(last.staff, "content_editor");

  const item = createAdminPopupItemHandlers({
    guard: guardByRole("content_editor"),
    getFn: async (id) => id === 1 ? { id: 1, title: "t" } : null,
    updateFn: async (id, input) => ({ id, ...input }),
    deleteFn: async () => ({ deleted: true }),
  });
  assert.equal((await item.GET(req("GET", "http://localhost/api/admin/content/popups/x"), ctx({ id: "x" }))).status, 400);
  assert.equal((await item.GET(req("GET", "http://localhost/api/admin/content/popups/2"), ctx({ id: "2" }))).status, 404);
  assert.equal((await item.GET(req("GET", "http://localhost/api/admin/content/popups/1"), ctx({ id: "1" }))).status, 200);
  assert.equal((await item.PATCH(req("PATCH", "http://localhost/api/admin/content/popups/1", {}), ctx({ id: "1" }))).status, 400);
  const patched = await item.PATCH(req("PATCH", "http://localhost/api/admin/content/popups/1", { title: "جديد", sort_order: 3 }), ctx({ id: "1" }));
  assert.equal((await patched.json()).popup.sort_order, 3);

  const status = createAdminPopupStatusHandler({
    guard: guardByRole("content_editor"),
    setFn: async (id, isPublished) => ({ id, is_published: isPublished }),
  });
  assert.equal((await status(req("PATCH", "http://localhost/api/admin/content/popups/1/status", {}), ctx({ id: "1" }))).status, 400);
  const pub = await status(req("PATCH", "http://localhost/api/admin/content/popups/1/status", { is_published: true }), ctx({ id: "1" }));
  assert.equal((await pub.json()).popup.is_published, true);
  const unpub = await status(req("PATCH", "http://localhost/api/admin/content/popups/1/status", { is_published: false }), ctx({ id: "1" }));
  assert.equal((await unpub.json()).popup.is_published, false);
});

test("leadership admin handlers: panels/leaders/contents CRUD, panel delete conflict, decision fields", async () => {
  const panels = createAdminPanelsCollectionHandlers({
    guard: guardByRole("content_editor"),
    listFn: async () => ({ items: [], pagination: {} }),
    createFn: async (input) => ({ id: 1, ...input }),
  });
  assert.equal((await panels.POST(req("POST", "http://localhost/api/admin/content/leadership/panels", { slug: "p1", title: "لوحة" }))).status, 201);

  let delGuardCalled = false;
  const panelItem = createAdminPanelItemHandlers({
    guard: async (_r, o) => { if (o.permission === "records:delete") delGuardCalled = true; return superAdmin; },
    getFn: async () => ({ id: 1 }),
    updateFn: async (_id, input) => ({ id: 1, ...input }),
    deleteFn: async () => { const e = new Error(); e.code = "PANEL_HAS_LEADERS"; throw e; },
  });
  const conflict = await panelItem.DELETE(req("DELETE", "http://localhost/api/admin/content/leadership/panels/1", { confirm: true }), ctx({ id: "1" }));
  assert.equal(delGuardCalled, true);
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: "PANEL_HAS_LEADERS" });

  const panelStatus = createAdminPanelStatusHandler({ guard: guardByRole("content_editor"), setFn: async (_id, v) => ({ id: 1, is_published: v }) });
  assert.equal((await (await panelStatus(req("PATCH", "http://x/1/status", { is_published: true }), ctx({ id: "1" }))).json()).panel.is_published, true);

  const leaders = createAdminLeadersCollectionHandlers({ guard: guardByRole("content_editor"), listFn: async (q) => ({ items: [], q }), createFn: async (input) => ({ id: "L1", ...input }) });
  assert.equal((await leaders.GET(req("GET", "http://localhost/api/admin/content/leadership/leaders?panel_id=1"))).status, 200);
  assert.equal((await leaders.POST(req("POST", "http://localhost/api/admin/content/leadership/leaders", { panel_id: 1, full_name: "قائد" }))).status, 201);

  const contents = createAdminLeadershipContentsCollectionHandlers({ guard: guardByRole("content_editor"), listFn: async () => ({ items: [] }), createFn: async (input) => ({ id: 2, ...input }) });
  const c = await contents.POST(req("POST", "http://localhost/api/admin/content/leadership/contents", {
    slug: "speech-1", button_label: "كلمة", title: "عنوان", person_name: "الاسم", person_role_title: "المنصب", body: "النص", decision_number: "12/2026", decision_date: "2026-11-18",
  }));
  assert.equal(c.status, 201);
  const badDate = await contents.POST(req("POST", "http://localhost/api/admin/content/leadership/contents", {
    slug: "speech-2", button_label: "كلمة", title: "عنوان", person_name: "الاسم", person_role_title: "المنصب", body: "النص", decision_date: "bad",
  }));
  assert.equal(badDate.status, 400);
});

test("central/governorate/parliamentary admin handlers: multi-person, publish, delete confirm", async () => {
  const cs = createAdminCentralSecretariatsCollectionHandlers({ guard: guardByRole("content_editor"), listFn: async () => ({ items: [] }), createFn: async (i) => ({ id: 1, ...i }) });
  assert.equal((await cs.POST(req("POST", "http://x", { info_item_id: 5, name_ar: "أمانة" }))).status, 201);
  const csItem = createAdminCentralSecretariatItemHandlers({ guard: guardByRole("super_admin"), getFn: async () => ({ id: 1 }), updateFn: async (_id, i) => ({ id: 1, ...i }), deleteFn: async () => ({ deleted: true }) });
  assert.equal((await csItem.DELETE(req("DELETE", "http://x", {}), ctx({ id: "1" }))).status, 400);
  assert.equal((await csItem.DELETE(req("DELETE", "http://x", { confirm: true }), ctx({ id: "1" }))).status, 200);

  const people = createAdminCentralSecretariatPeopleCollectionHandlers({ guard: guardByRole("content_editor"), createFn: async (_sid, input) => ({ person: { id: "P1", ...input } }) });
  const p = await people.POST(req("POST", "http://x", { full_name: "شخص", image_url: "https://x/y.png", details: "تفاصيل" }), ctx({ id: "1" }));
  assert.equal(p.status, 201);
  assert.equal((await p.json()).person.image_url, "https://x/y.png");
  const peopleItem = createAdminCentralSecretariatPersonItemHandlers({ guard: guardByRole("super_admin"), getFn: async () => ({ id: "P1" }), updateFn: async (_sid, _id, i) => ({ id: "P1", ...i }), deleteFn: async () => ({ deleted: true }) });
  assert.equal((await peopleItem.DELETE(req("DELETE", "http://x", { confirm: true }), ctx({ id: "1", personId: "33333333-3333-4333-8333-333333333333" }))).status, 200);

  const gs = createAdminGovernorateSecretariatsCollectionHandlers({ guard: guardByRole("content_editor"), listFn: async (q) => ({ items: [], q }), createFn: async (i) => ({ id: "G1", ...i }) });
  assert.equal((await gs.GET(req("GET", "http://localhost/api/admin/content/governorate-secretariats?governorate_id=7"))).status, 200);
  assert.equal((await gs.POST(req("POST", "http://x", { governorate_id: 7, full_name: "أمين" }))).status, 201);
  const gsItem = createAdminGovernorateSecretariatItemHandlers({ guard: guardByRole("super_admin"), getFn: async () => ({ id: "G1" }), updateFn: async (_id, i) => ({ id: "G1", ...i }), deleteFn: async () => ({ deleted: true }) });
  assert.equal((await gsItem.DELETE(req("DELETE", "http://x", { confirm: true }), ctx({ id: "44444444-4444-4444-8444-444444444444" }))).status, 200);

  const par = createAdminParliamentaryCollectionHandlers({ guard: guardByRole("content_editor"), listFn: async () => ({ items: [] }), createFn: async (i) => ({ id: 1, ...i }) });
  assert.equal((await par.POST(req("POST", "http://x", { slug: "par-unit", title: "الوحدة" }))).status, 201);
  const parItem = createAdminParliamentaryItemHandlers({ guard: guardByRole("content_editor"), getFn: async () => ({ id: 1 }), updateFn: async (_id, i) => ({ id: 1, ...i }), deleteFn: async () => ({ deleted: true }) });
  assert.equal((await parItem.DELETE(req("DELETE", "http://x", { confirm: true }), ctx({ id: "1" }))).status, 403);
  const parStatus = createAdminParliamentaryStatusHandler({ guard: guardByRole("content_editor"), setFn: async (_id, v) => ({ id: 1, is_published: v }) });
  assert.equal((await (await parStatus(req("PATCH", "http://x", { is_published: false }), ctx({ id: "1" }))).json()).item.is_published, false);
});

test("public handlers: popups, parliamentary, governorate secretariats expose published-only results via services", async () => {
  const popups = createPublicPopupsHandlers({ listFn: async () => [{ id: 1, title: "pub" }], getFn: async () => null });
  assert.deepEqual(await (await popups.list()).json(), { popups: [{ id: 1, title: "pub" }] });
  assert.equal((await popups.get(req("GET", "http://x"), ctx({ id: "1" }))).status, 404);

  const par = createPublicParliamentaryHandlers({ listFn: async () => [{ id: 1 }], getFn: async () => ({ id: 1 }) });
  assert.deepEqual(await (await par.list()).json(), { parliamentary_items: [{ id: 1 }] });
  assert.equal((await par.get(req("GET", "http://x"), ctx({ id: "1" }))).status, 200);

  const gs = createPublicGovernorateSecretariatsHandlers({ listFn: async (gid) => [{ governorate_id: gid }], getFn: async () => null });
  assert.deepEqual(await (await gs.list(req("GET", "http://localhost/api/content/governorate-secretariats?governorate_id=7"))).json(), { governorate_secretariats: [{ governorate_id: 7 }] });
  assert.equal((await gs.list(req("GET", "http://localhost/api/content/governorate-secretariats?governorate_id=bad"))).status, 400);
  assert.equal((await gs.get(req("GET", "http://x"), ctx({ id: "44444444-4444-4444-8444-444444444444" }))).status, 404);
});

test("public handlers + services: leadership and central secretariats do not expose unpublished nested records", async () => {
  const leadershipDb = {
    panels: {
      findMany: async (args) => {
        assert.deepEqual(args.where, { is_published: true });
        assert.deepEqual(args.select.leaders.where, { is_published: true });
        return [{ id: 1, slug: "p", title: "P", leaders: [{ id: "L1", is_published: true }] }];
      },
    },
    info_items: {
      findMany: async (args) => {
        assert.deepEqual(args.where, { kind: "leadership_content", is_published: true });
        return [{ id: 2, slug: "c", is_published: true }];
      },
    },
  };
  const leadershipHandler = createPublicLeadershipHandler({ getFn: () => getLeadershipPublic(leadershipDb) });
  const lRes = await leadershipHandler();
  assert.equal(lRes.status, 200);
  const lBody = await lRes.json();
  assert.equal(lBody.panels.length, 1);
  assert.equal(lBody.contents.length, 1);

  const csDb = {
    central_secretariats: {
      findMany: async (args) => {
        assert.deepEqual(args.where, { is_published: true });
        assert.deepEqual(args.select.people.where, { is_published: true });
        return [{ id: 1, name_ar: "أمانة", people: [{ id: "P1", full_name: "منشور" }] }];
      },
    },
  };
  const csHandlers = createPublicCentralSecretariatsHandlers({ listFn: () => listCentralSecretariatsPublic(csDb) });
  const csRes = await csHandlers.list();
  assert.equal(csRes.status, 200);
  const csBody = await csRes.json();
  assert.equal(csBody.central_secretariats[0].people.length, 1);
});

test("F-02: nested central secretariat people routes validate both IDs and return 404 when not belonging to secretariat", async () => {
  const targetPersonId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  const peopleItem = createAdminCentralSecretariatPersonItemHandlers({
    guard: guardByRole("super_admin"),
    getFn: async (secId, pId) => (secId === 1 && pId === targetPersonId ? { id: pId, full_name: "موجود" } : null),
    updateFn: async (secId, pId, input) => (secId === 1 && pId === targetPersonId ? { id: pId, ...input } : null),
    deleteFn: async (secId, pId) => (secId === 1 && pId === targetPersonId ? { deleted: true } : null),
  });

  const peopleStatus = createAdminCentralSecretariatPersonStatusHandler({
    guard: guardByRole("content_editor"),
    setFn: async (secId, pId, pub) => (secId === 1 && pId === targetPersonId ? { id: pId, is_published: pub } : null),
  });

  // Invalid secretariat ID formats return 400 VALIDATION
  assert.equal((await peopleItem.GET(req("GET", "http://x"), ctx({ id: "abc", personId: targetPersonId }))).status, 400);
  assert.equal((await peopleItem.PATCH(req("PATCH", "http://x", { full_name: "جديد" }), ctx({ id: "0", personId: targetPersonId }))).status, 400);
  assert.equal((await peopleItem.DELETE(req("DELETE", "http://x", { confirm: true }), ctx({ id: "-5", personId: targetPersonId }))).status, 400);
  assert.equal((await peopleStatus(req("PATCH", "http://x", { is_published: true }), ctx({ id: "xyz", personId: targetPersonId }))).status, 400);

  // Invalid person UUID returns 400 VALIDATION
  assert.equal((await peopleItem.GET(req("GET", "http://x"), ctx({ id: "1", personId: "not-a-uuid" }))).status, 400);

  // Mismatched secretariat ID (e.g. secretariat 2 instead of 1) returns 404 NOT_FOUND without leaking person data
  const wrongCtx = ctx({ id: "2", personId: targetPersonId });
  assert.equal((await peopleItem.GET(req("GET", "http://x"), wrongCtx)).status, 404);
  assert.equal((await peopleItem.PATCH(req("PATCH", "http://x", { full_name: "جديد" }), wrongCtx)).status, 404);
  assert.equal((await peopleItem.DELETE(req("DELETE", "http://x", { confirm: true }), wrongCtx)).status, 404);
  assert.equal((await peopleStatus(req("PATCH", "http://x", { is_published: true }), wrongCtx)).status, 404);

  // Matching secretariat ID 1 returns 200
  const matchCtx = ctx({ id: "1", personId: targetPersonId });
  assert.equal((await peopleItem.GET(req("GET", "http://x"), matchCtx)).status, 200);
  assert.equal((await peopleItem.PATCH(req("PATCH", "http://x", { full_name: "جديد" }), matchCtx)).status, 200);
  assert.equal((await peopleStatus(req("PATCH", "http://x", { is_published: true }), matchCtx)).status, 200);
  assert.equal((await peopleItem.DELETE(req("DELETE", "http://x", { confirm: true }), matchCtx)).status, 200);
});

test("F-03: contentFailure and handlers map P2003 foreign key violation to 400 INVALID_REFERENCE", async () => {
  // Direct contentFailure test
  const p2003Error = {
    code: "P2003",
    meta: { field_name: "info_item_id" },
  };
  const res = contentFailure(p2003Error);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "INVALID_REFERENCE" });

  // With custom conflictMap
  const customRes = contentFailure(p2003Error, { info_item_id: "INVALID_INFO_ITEM" });
  assert.equal(customRes.status, 400);
  assert.deepEqual(await customRes.json(), { error: "INVALID_INFO_ITEM" });

  // Handler integration test: createLeader with invalid panel_id
  const leaderHandler = createAdminLeadersCollectionHandlers({
    guard: guardByRole("content_editor"),
    createFn: async () => {
      const err = new Error("Foreign key violation");
      err.code = "P2003";
      err.meta = { field_name: "panel_id" };
      throw err;
    },
  });
  const leaderRes = await leaderHandler.POST(req("POST", "http://x", { panel_id: 999, full_name: "قائد" }));
  assert.equal(leaderRes.status, 400);
  assert.deepEqual(await leaderRes.json(), { error: "INVALID_REFERENCE" });
});
