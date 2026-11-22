import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createPopup,
  deletePopup,
  getPopupAdmin,
  getPopupPublic,
  listPopupsAdmin,
  listPopupsPublic,
  setPopupPublished,
  updatePopup,
} from "./content-popups.js";
import {
  createLeader,
  createLeadershipContent,
  createPanel,
  deleteLeader,
  deleteLeadershipContent,
  deletePanel,
  getLeadershipPublic,
  listLeadersAdmin,
  listLeadershipContentsAdmin,
  listPanelsAdmin,
  setLeaderPublished,
  setLeadershipContentPublished,
  setPanelPublished,
  updateLeader,
  updateLeadershipContent,
  updatePanel,
} from "./content-leadership.js";
import {
  createCentralSecretariat,
  createCentralSecretariatPerson,
  deleteCentralSecretariat,
  deleteCentralSecretariatPerson,
  getCentralSecretariatPersonAdmin,
  getCentralSecretariatPublic,
  listCentralSecretariatsAdmin,
  listCentralSecretariatsPublic,
  setCentralSecretariatPersonPublished,
  setCentralSecretariatPublished,
  updateCentralSecretariat,
  updateCentralSecretariatPerson,
} from "./content-central-secretariats.js";
import {
  createGovernorateSecretariat,
  deleteGovernorateSecretariat,
  getGovernorateSecretariatPublic,
  listGovernorateSecretariatsAdmin,
  listGovernorateSecretariatsPublic,
  setGovernorateSecretariatPublished,
  updateGovernorateSecretariat,
} from "./content-governorate-secretariats.js";
import {
  createParliamentary,
  deleteParliamentary,
  getParliamentaryPublic,
  listParliamentaryAdmin,
  listParliamentaryPublic,
  setParliamentaryPublished,
  updateParliamentary,
} from "./content-parliamentary.js";

const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Content Editor",
  email: "editor@example.test",
  role: "super_admin",
};

function makeDb(modelImpls, { failAudit = false } = {}) {
  const calls = [];
  const audits = [];
  const makeClient = (label) => {
    const client = { _label: label };
    client.$queryRaw = async (strings, ...values) => {
      const sql = Array.isArray(strings) ? strings.join("?") : String(strings);
      calls.push({ model: "$queryRaw", method: "$queryRaw", sql, values, tx: label });
      if (typeof modelImpls.$queryRaw === "function") {
        return modelImpls.$queryRaw(strings, ...values);
      }
      if (sql.includes('FROM "central_secretariats"') && sql.includes("FOR UPDATE")) {
        const id = values[0];
        if (modelImpls.central_secretariats?.findUnique) {
          const item = await modelImpls.central_secretariats.findUnique({ where: { id } });
          return item ? [{ id: item.id, name_ar: item.name_ar }] : [];
        }
      }
      return [];
    };
    client.staff_audit_log = {
      create: async (args) => {
        calls.push({ model: "staff_audit_log", method: "create", args, tx: label });
        audits.push(args.data);
        if (failAudit) throw new Error("AUDIT_FAIL");
        return { id: BigInt(audits.length), ...args.data };
      },
    };
    for (const [model, methods] of Object.entries(modelImpls)) {
      if (model.startsWith("$")) continue;
      client[model] = {};
      for (const [method, fn] of Object.entries(methods)) {
        client[model][method] = async (args) => {
          calls.push({ model, method, args, tx: label });
          return fn(args, { client, calls, audits });
        };
      }
    }
    return client;
  };
  const db = makeClient("db");
  db.$transaction = async (cb) => cb(makeClient("tx"));
  return { db, calls, audits };
}

function lastCall(calls, model, method) {
  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const c = calls[i];
    if (c.model === model && c.method === method) return c;
  }
  return null;
}

function assertAudit(calls, audits, { action, targetId, entityType, slug, changedFields, cascadePeopleCount }) {
  const auditCall = lastCall(calls, "staff_audit_log", "create");
  assert.ok(auditCall, "expected audit create call");
  assert.equal(auditCall.tx, "tx", "audit must run in transaction");
  const data = auditCall.args.data;
  assert.equal(data.action_type, action);
  assert.equal(data.actor_id, actor.id);
  assert.equal(data.actor_name, actor.full_name);
  assert.equal(data.actor_email, actor.email);
  assert.equal(String(data.target_id), String(targetId));
  assert.equal(data.target_email, null);
  assert.equal(data.details?.entity_type, entityType);
  if (slug !== undefined) assert.equal(data.details?.slug, slug);
  if (changedFields) assert.deepEqual([...data.details.changed_fields].sort(), [...changedFields].sort());
  if (cascadePeopleCount !== undefined) {
    assert.equal(data.details?.cascade_deleted_people_count, cascadePeopleCount);
  }
  assert.ok(audits.length >= 1);
}

test("popups: admin list/create/update/publish/unpublish/delete with ordering and same-transaction audit", async () => {
  let stored = null;
  const row = (over = {}) => ({
    id: 1, slug: "popup-about", title: "من نحن؟", body: null, source_note: null, icon: null,
    sort_order: 1, is_published: false, kind: "popup", created_at: new Date(), updated_at: new Date(), ...over,
  });
  const { db, calls, audits } = makeDb({
    info_items: {
      findMany: async () => (stored ? [stored] : []),
      count: async () => (stored ? 1 : 0),
      findFirst: async (args) => {
        if (!stored) return null;
        if (args.where?.id && args.where.id !== stored.id) return null;
        if (args.where?.kind && args.where.kind !== "popup") return null;
        if (args.where?.is_published === true && !stored.is_published) return null;
        return { ...stored };
      },
      create: async (args) => { stored = row({ ...args.data, id: 1 }); return { ...stored }; },
      update: async (args) => { stored = { ...stored, ...args.data }; return { ...stored }; },
      delete: async () => { const d = stored; stored = null; return d; },
    },
  });

  await listPopupsAdmin({ page: 2, page_size: 10 }, db);
  const listCall = lastCall(calls, "info_items", "findMany");
  assert.deepEqual(listCall.args.where, { kind: "popup" });
  assert.deepEqual(listCall.args.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  assert.equal(listCall.args.skip, 10);
  assert.equal(listCall.args.take, 10);

  await createPopup({ slug: "popup-about", title: "من نحن؟", sort_order: 1, is_published: false }, actor, db);
  const createCall = lastCall(calls, "info_items", "create");
  assert.equal(createCall.tx, "tx");
  assert.equal(createCall.args.data.kind, "popup");
  assert.equal(createCall.args.data.updated_by, actor.id);
  assertAudit(calls, audits, { action: "content_created", targetId: 1, entityType: "popup", slug: "popup-about" });

  await updatePopup(1, { title: "جديد", sort_order: 5 }, actor, db);
  assert.equal(lastCall(calls, "info_items", "update").tx, "tx");
  assert.equal(lastCall(calls, "info_items", "update").args.data.title, "جديد");
  assertAudit(calls, audits, { action: "content_updated", targetId: 1, entityType: "popup", slug: "popup-about", changedFields: ["title", "sort_order"] });

  await setPopupPublished(1, true, actor, db);
  assert.equal(lastCall(calls, "info_items", "update").args.data.is_published, true);
  assertAudit(calls, audits, { action: "content_published", targetId: 1, entityType: "popup", slug: "popup-about" });
  await setPopupPublished(1, false, actor, db);
  assert.equal(lastCall(calls, "info_items", "update").args.data.is_published, false);
  assertAudit(calls, audits, { action: "content_unpublished", targetId: 1, entityType: "popup", slug: "popup-about" });

  const adminGet = await getPopupAdmin(1, db);
  assert.ok(adminGet);
  const res = await deletePopup(1, actor, db);
  assert.deepEqual(res, { deleted: true });
  assert.equal(lastCall(calls, "info_items", "delete").tx, "tx");
  assert.deepEqual(lastCall(calls, "info_items", "delete").args.where, { id: 1 });
  assertAudit(calls, audits, { action: "content_deleted", targetId: 1, entityType: "popup", slug: "popup-about" });
});

test("popups public: only published records and published-only lookup", async () => {
  let stored = { id: 1, slug: "s", title: "t", is_published: false, kind: "popup", sort_order: 1 };
  const { db, calls } = makeDb({
    info_items: {
      findMany: async () => (stored.is_published ? [stored] : []),
      findFirst: async (args) => (args.where?.is_published === true && stored.is_published ? stored : null),
    },
  });
  await listPopupsPublic(db);
  assert.deepEqual(lastCall(calls, "info_items", "findMany").args.where, { kind: "popup", is_published: true });
  assert.deepEqual(lastCall(calls, "info_items", "findMany").args.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  assert.equal(await getPopupPublic(1, db), null);
  stored.is_published = true;
  assert.ok(await getPopupPublic(1, db));
  assert.equal(lastCall(calls, "info_items", "findFirst").args.where.is_published, true);
});

test("audit is part of the same transaction (failure aborts mutation flow)", async () => {
  const { db } = makeDb({
    info_items: {
      findFirst: async () => ({ id: 1, slug: "s", title: "t", kind: "popup" }),
      update: async () => ({ id: 1, slug: "s", title: "t" }),
    },
  }, { failAudit: true });
  await assert.rejects(() => updatePopup(1, { title: "x" }, actor, db), /AUDIT_FAIL/);
});

test("leadership: panels/leaders/contents CRUD+publish, decision data normalization, panel delete blocked when leaders exist", async () => {
  let panel = { id: 1, slug: "p1", title: "لوحة", subtitle: null, icon: null, leaders_heading: null, sort_order: 0, is_published: false };
  let leader = { id: "22222222-2222-4222-8222-222222222222", panel_id: 1, full_name: "قائد", role_title: null, photo_url: null, badge_label: null, is_head: false, sort_order: 0, is_published: false };
  let content = { id: 2, slug: "speech", kind: "leadership_content", title: "عنوان", body: "نص", button_label: "زر", person_name: "شخص", person_role_title: "منصب", decision_number: null, decision_date: null, is_published: false, sort_order: 0 };
  let leaderCount = 0;
  const { db, calls, audits } = makeDb({
    panels: {
      findMany: async () => [{ ...panel }],
      count: async () => 1,
      findUnique: async () => (panel ? { ...panel } : null),
      create: async (args) => { panel = { ...panel, ...args.data }; return { ...panel }; },
      update: async (args) => { panel = { ...panel, ...args.data }; return { ...panel }; },
      delete: async () => { const p = panel; panel = null; return p; },
    },
    leaders: {
      count: async () => leaderCount,
      findMany: async () => [leader],
      findUnique: async () => (leader ? { ...leader } : null),
      create: async (args) => { leader = { ...leader, ...args.data }; return { ...leader }; },
      update: async (args) => { leader = { ...leader, ...args.data }; return { ...leader }; },
      delete: async () => { const l = leader; leader = null; return l; },
    },
    info_items: {
      count: async () => 1,
      findMany: async () => [content],
      findFirst: async () => (content ? { ...content } : null),
      create: async (args) => { content = { ...content, ...args.data }; return { ...content }; },
      update: async (args) => { content = { ...content, ...args.data }; return { ...content }; },
      delete: async () => { const c = content; content = null; return c; },
    },
  });

  await listPanelsAdmin({ page: 1, page_size: 25 }, db);
  assert.deepEqual(lastCall(calls, "panels", "findMany").args.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  await createPanel({ slug: "p1", title: "لوحة" }, actor, db);
  assertAudit(calls, audits, { action: "content_created", targetId: 1, entityType: "panel", slug: "p1" });
  await updatePanel(1, { title: "جديد" }, actor, db);
  assertAudit(calls, audits, { action: "content_updated", targetId: 1, entityType: "panel", changedFields: ["title"] });
  await setPanelPublished(1, true, actor, db);
  assertAudit(calls, audits, { action: "content_published", targetId: 1, entityType: "panel" });

  leaderCount = 2;
  await assert.rejects(() => deletePanel(1, actor, db), (e) => e?.code === "PANEL_HAS_LEADERS");
  assert.equal(lastCall(calls, "panels", "delete"), null);
  leaderCount = 0;
  await deletePanel(1, actor, db);
  assert.equal(lastCall(calls, "panels", "delete").tx, "tx");
  assertAudit(calls, audits, { action: "content_deleted", targetId: 1, entityType: "panel" });

  await listLeadersAdmin({ page: 1, page_size: 25, panel_id: 1 }, db);
  assert.deepEqual(lastCall(calls, "leaders", "findMany").args.where, { panel_id: 1 });
  await createLeader({ panel_id: 1, full_name: "قائد" }, actor, db);
  const leaderId = leader.id;
  assert.equal(lastCall(calls, "leaders", "create").args.data.updated_by, actor.id);
  assertAudit(calls, audits, { action: "content_created", targetId: leaderId, entityType: "leader" });
  await updateLeader(leaderId, { full_name: "قائد2" }, actor, db);
  assertAudit(calls, audits, { action: "content_updated", targetId: leaderId, entityType: "leader", changedFields: ["full_name"] });
  await setLeaderPublished(leaderId, false, actor, db);
  assertAudit(calls, audits, { action: "content_unpublished", targetId: leaderId, entityType: "leader" });
  await deleteLeader(leaderId, actor, db);
  assertAudit(calls, audits, { action: "content_deleted", targetId: leaderId, entityType: "leader" });

  await listLeadershipContentsAdmin({ page: 1, page_size: 25 }, db);
  assert.deepEqual(lastCall(calls, "info_items", "findMany").args.where, { kind: "leadership_content" });
  await createLeadershipContent({
    slug: "speech", button_label: "زر", title: "عنوان", person_name: "شخص", person_role_title: "منصب", body: "نص",
    decision_number: "12/2026", decision_date: "2026-11-18",
  }, actor, db);
  const cCreate = lastCall(calls, "info_items", "create");
  assert.equal(cCreate.args.data.kind, "leadership_content");
  assert.equal(cCreate.args.data.decision_number, "12/2026");
  assert.equal(cCreate.args.data.person_name, "شخص");
  assert.equal(cCreate.args.data.person_role_title, "منصب");
  assert.equal(cCreate.args.data.button_label, "زر");
  assert.ok(cCreate.args.data.decision_date instanceof Date);
  assert.equal(cCreate.args.data.decision_date.toISOString().slice(0, 10), "2026-11-18");
  assertAudit(calls, audits, { action: "content_created", targetId: 2, entityType: "leadership_content", slug: "speech" });

  await updateLeadershipContent(2, { decision_date: "" }, actor, db);
  assert.equal(lastCall(calls, "info_items", "update").args.data.decision_date, null);
  assertAudit(calls, audits, { action: "content_updated", targetId: 2, entityType: "leadership_content", changedFields: ["decision_date"] });
  await setLeadershipContentPublished(2, true, actor, db);
  assertAudit(calls, audits, { action: "content_published", targetId: 2, entityType: "leadership_content" });
  await deleteLeadershipContent(2, actor, db);
  assertAudit(calls, audits, { action: "content_deleted", targetId: 2, entityType: "leadership_content" });
});

test("leadership public aggregate: only published panels, nested published leaders, and published contents", async () => {
  const { db, calls } = makeDb({
    panels: { findMany: async () => [] },
    info_items: { findMany: async () => [] },
  });
  await getLeadershipPublic(db);
  const p = lastCall(calls, "panels", "findMany").args;
  assert.deepEqual(p.where, { is_published: true });
  assert.deepEqual(p.select.leaders.where, { is_published: true });
  assert.deepEqual(p.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  const c = lastCall(calls, "info_items", "findMany").args;
  assert.deepEqual(c.where, { kind: "leadership_content", is_published: true });
  assert.deepEqual(c.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
});

test("central secretariats: CRUD/publish, multi-people with optional image/details, person audit, public nested published-only", async () => {
  let sec = { id: 1, info_item_id: 5, name_ar: "أمانة", head_name: null, source_note: null, sort_order: 0, is_published: false };
  let person = { id: "33333333-3333-4333-8333-333333333333", secretariat_id: 1, full_name: "شخص", position_title: null, image_url: null, details: null, sort_order: 0, is_published: false };
  const { db, calls, audits } = makeDb({
    central_secretariats: {
      findMany: async () => [{ ...sec, people: [person] }],
      count: async () => 1,
      findUnique: async () => (sec ? { ...sec } : null),
      findFirst: async (args) => (args.where?.is_published && sec?.is_published ? { ...sec, people: [] } : null),
      create: async (args) => { sec = { id: 1, ...args.data }; return { ...sec }; },
      update: async (args) => { sec = { ...sec, ...args.data }; return { ...sec }; },
      delete: async () => { const s = sec; sec = null; return s; },
    },
    central_secretariat_people: {
      findUnique: async () => (person ? { ...person } : null),
      findFirst: async (args) => (person && (!args.where?.secretariat_id || args.where.secretariat_id === person.secretariat_id) ? { ...person } : null),
      count: async () => (person ? 1 : 0),
      create: async (args) => { person = { ...person, ...args.data }; return { ...person }; },
      update: async (args) => { person = { ...person, ...args.data }; return { ...person }; },
      delete: async () => { const p = person; person = null; return p; },
    },
  });

  await listCentralSecretariatsAdmin({ page: 1, page_size: 25 }, db);
  const adminList = lastCall(calls, "central_secretariats", "findMany").args;
  assert.deepEqual(adminList.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  assert.deepEqual(adminList.select.people.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);

  await createCentralSecretariat({ info_item_id: 5, name_ar: "أمانة" }, actor, db);
  assertAudit(calls, audits, { action: "content_created", targetId: 1, entityType: "central_secretariat" });
  await updateCentralSecretariat(1, { head_name: "رئيس" }, actor, db);
  assertAudit(calls, audits, { action: "content_updated", targetId: 1, entityType: "central_secretariat", changedFields: ["head_name"] });
  await setCentralSecretariatPublished(1, true, actor, db);
  assertAudit(calls, audits, { action: "content_published", targetId: 1, entityType: "central_secretariat" });
  await setCentralSecretariatPublished(1, false, actor, db);
  assertAudit(calls, audits, { action: "content_unpublished", targetId: 1, entityType: "central_secretariat" });

  const p1 = await createCentralSecretariatPerson(1, { full_name: "شخص", image_url: null, details: null, sort_order: 2 }, actor, db);
  const personId = person.id;
  assert.equal(lastCall(calls, "central_secretariat_people", "create").args.data.secretariat_id, 1);
  assert.equal(lastCall(calls, "central_secretariat_people", "create").args.data.updated_by, actor.id);
  assert.equal(lastCall(calls, "central_secretariat_people", "create").args.data.image_url, null);
  assert.equal(lastCall(calls, "central_secretariat_people", "create").args.data.details, null);
  assertAudit(calls, audits, { action: "content_created", targetId: personId, entityType: "central_secretariat_person" });
  assert.ok(p1.person);

  const p2 = await createCentralSecretariatPerson(1, { full_name: "شخص2", image_url: "https://x/y.png", details: "تفاصيل" }, actor, db);
  assert.ok(p2.person);

  await updateCentralSecretariatPerson(1, personId, { position_title: "منصب" }, actor, db);
  assertAudit(calls, audits, { action: "content_updated", targetId: personId, entityType: "central_secretariat_person", changedFields: ["position_title"] });
  await setCentralSecretariatPersonPublished(1, personId, true, actor, db);
  assertAudit(calls, audits, { action: "content_published", targetId: personId, entityType: "central_secretariat_person" });
  await deleteCentralSecretariatPerson(1, personId, actor, db);
  assert.equal(lastCall(calls, "central_secretariat_people", "delete").tx, "tx");
  assertAudit(calls, audits, { action: "content_deleted", targetId: personId, entityType: "central_secretariat_person" });

  await deleteCentralSecretariat(1, actor, db);
  assert.equal(lastCall(calls, "central_secretariats", "delete").tx, "tx");
  assertAudit(calls, audits, { action: "content_deleted", targetId: 1, entityType: "central_secretariat", cascadePeopleCount: 0 });
});

test("central secretariats: person create returns notFound for missing parent and public shows only published nested people", async () => {
  const { db: nfDb } = makeDb({ central_secretariats: { findUnique: async () => null } });
  assert.deepEqual(await createCentralSecretariatPerson(999, { full_name: "x" }, actor, nfDb), { notFound: true });

  const { db, calls } = makeDb({
    central_secretariats: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  });
  await listCentralSecretariatsPublic(db);
  const listArgs = lastCall(calls, "central_secretariats", "findMany").args;
  assert.deepEqual(listArgs.where, { is_published: true });
  assert.deepEqual(listArgs.select.people.where, { is_published: true });
  assert.deepEqual(listArgs.select.people.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  await getCentralSecretariatPublic(1, db);
  const getArgs = lastCall(calls, "central_secretariats", "findFirst").args;
  assert.deepEqual(getArgs.where, { id: 1, is_published: true });
  assert.deepEqual(getArgs.select.people.where, { is_published: true });
});

test("governorate secretariats: multi-person CRUD/publish, ordering/filtering, public active+published only, audit", async () => {
  let item = { id: "44444444-4444-4444-8444-444444444444", governorate_id: 7, full_name: "أمين", role_title: null, photo_url: null, sort_order: 0, is_published: false };
  const { db, calls, audits } = makeDb({
    governorate_secretariats_info: {
      findMany: async () => [item],
      count: async () => 1,
      findUnique: async () => (item ? { ...item } : null),
      findFirst: async (args) => (args.where?.is_published ? { ...item } : null),
      create: async (args) => { item = { ...item, ...args.data }; return { ...item }; },
      update: async (args) => { item = { ...item, ...args.data }; return { ...item }; },
      delete: async () => { const i = item; item = null; return i; },
    },
  });

  await listGovernorateSecretariatsAdmin({ page: 1, page_size: 25, governorate_id: 7 }, db);
  const adminList = lastCall(calls, "governorate_secretariats_info", "findMany").args;
  assert.deepEqual(adminList.where, { governorate_id: 7 });
  assert.deepEqual(adminList.orderBy, [{ governorate_id: "asc" }, { sort_order: "asc" }, { id: "asc" }]);

  await createGovernorateSecretariat({ governorate_id: 7, full_name: "أمين" }, actor, db);
  const govItemId = item.id;
  assert.equal(lastCall(calls, "governorate_secretariats_info", "create").args.data.updated_by, actor.id);
  assertAudit(calls, audits, { action: "content_created", targetId: govItemId, entityType: "governorate_secretariat_person" });
  await updateGovernorateSecretariat(govItemId, { role_title: "دور", photo_url: "https://x/y.png" }, actor, db);
  assertAudit(calls, audits, { action: "content_updated", targetId: govItemId, entityType: "governorate_secretariat_person", changedFields: ["role_title", "photo_url"] });
  await setGovernorateSecretariatPublished(govItemId, true, actor, db);
  assertAudit(calls, audits, { action: "content_published", targetId: govItemId, entityType: "governorate_secretariat_person" });
  await setGovernorateSecretariatPublished(govItemId, false, actor, db);
  assertAudit(calls, audits, { action: "content_unpublished", targetId: govItemId, entityType: "governorate_secretariat_person" });
  await deleteGovernorateSecretariat(govItemId, actor, db);
  assertAudit(calls, audits, { action: "content_deleted", targetId: govItemId, entityType: "governorate_secretariat_person" });

  await listGovernorateSecretariatsPublic(7, db);
  const pub = lastCall(calls, "governorate_secretariats_info", "findMany").args;
  assert.equal(pub.where.is_published, true);
  assert.equal(pub.where.governorate_id, 7);
  assert.deepEqual(pub.where.governorate, { is_active: true });
  await listGovernorateSecretariatsPublic(null, db);
  const pubAll = lastCall(calls, "governorate_secretariats_info", "findMany").args;
  assert.equal(pubAll.where.is_published, true);
  assert.equal(Object.hasOwn(pubAll.where, "governorate_id"), false);
  await getGovernorateSecretariatPublic("44444444-4444-4444-8444-444444444444", db);
  const pubGet = lastCall(calls, "governorate_secretariats_info", "findFirst").args;
  assert.equal(pubGet.where.is_published, true);
  assert.deepEqual(pubGet.where.governorate, { is_active: true });
});

test("parliamentary unit: CRUD, publish/unpublish, ordering, public published-only, audit", async () => {
  let item = { id: 3, slug: "par-unit", title: "الوحدة", subtitle: null, icon: null, head_name: null, head_role: null, body: null, source_note: null, sort_order: 0, is_published: false };
  const { db, calls, audits } = makeDb({
    parliamentary_unit_items: {
      findMany: async () => [item],
      count: async () => 1,
      findUnique: async () => (item ? { ...item } : null),
      findFirst: async (args) => (args.where?.is_published && item?.is_published ? { ...item } : null),
      create: async (args) => { item = { ...item, ...args.data }; return { ...item }; },
      update: async (args) => { item = { ...item, ...args.data }; return { ...item }; },
      delete: async () => { const i = item; item = null; return i; },
    },
  });

  await listParliamentaryAdmin({ page: 1, page_size: 25 }, db);
  assert.deepEqual(lastCall(calls, "parliamentary_unit_items", "findMany").args.orderBy, [{ sort_order: "asc" }, { id: "asc" }]);
  await createParliamentary({ slug: "par-unit", title: "الوحدة" }, actor, db);
  assert.equal(lastCall(calls, "parliamentary_unit_items", "create").args.data.updated_by, actor.id);
  assertAudit(calls, audits, { action: "content_created", targetId: 3, entityType: "parliamentary_unit_item", slug: "par-unit" });
  await updateParliamentary(3, { title: "جديد" }, actor, db);
  assertAudit(calls, audits, { action: "content_updated", targetId: 3, entityType: "parliamentary_unit_item", changedFields: ["title"] });
  await setParliamentaryPublished(3, true, actor, db);
  assertAudit(calls, audits, { action: "content_published", targetId: 3, entityType: "parliamentary_unit_item" });
  await setParliamentaryPublished(3, false, actor, db);
  assertAudit(calls, audits, { action: "content_unpublished", targetId: 3, entityType: "parliamentary_unit_item" });
  await deleteParliamentary(3, actor, db);
  assertAudit(calls, audits, { action: "content_deleted", targetId: 3, entityType: "parliamentary_unit_item" });

  item = { id: 3, slug: "par-unit", title: "الوحدة", is_published: false };
  await listParliamentaryPublic(db);
  assert.deepEqual(lastCall(calls, "parliamentary_unit_items", "findMany").args.where, { is_published: true });
  assert.equal(await getParliamentaryPublic(3, db), null);
  item.is_published = true;
  assert.ok(await getParliamentaryPublic(3, db));
  assert.equal(lastCall(calls, "parliamentary_unit_items", "findFirst").args.where.is_published, true);
});

test("F-02: prevent get/update/publish/delete of person belonging to another secretariat", async () => {
  let person = {
    id: "11111111-2222-3333-4444-555555555555",
    secretariat_id: 1,
    full_name: "علي",
    position_title: "عضو",
    is_published: false,
  };
  const { db } = makeDb({
    central_secretariat_people: {
      findFirst: async (args) => {
        if (!person) return null;
        if (args.where?.id === person.id && args.where?.secretariat_id === person.secretariat_id) {
          return { ...person };
        }
        return null;
      },
      update: async (args) => {
        person = { ...person, ...args.data };
        return { ...person };
      },
      delete: async () => {
        const p = person;
        person = null;
        return p;
      },
    },
  });

  // Attempt operations using secretariat_id: 2 (mismatch)
  const wrongSecretariatId = 2;
  const personId = person.id;

  assert.equal(await getCentralSecretariatPersonAdmin(wrongSecretariatId, personId, db), null);
  assert.equal(await updateCentralSecretariatPerson(wrongSecretariatId, personId, { full_name: "تغيير" }, actor, db), null);
  assert.equal(person.full_name, "علي"); // not updated
  assert.equal(await setCentralSecretariatPersonPublished(wrongSecretariatId, personId, true, actor, db), null);
  assert.equal(person.is_published, false); // not published
  assert.equal(await deleteCentralSecretariatPerson(wrongSecretariatId, personId, actor, db), null);
  assert.ok(person); // not deleted

  // Valid secretariat_id: 1 succeeds
  const updated = await updateCentralSecretariatPerson(1, personId, { full_name: "تغيير صحيح" }, actor, db);
  assert.equal(updated.full_name, "تغيير صحيح");
});

test("F-05: deleting central secretariat records cascade count and avoids per-person audit entries", async () => {
  let sec = { id: 10, name_ar: "أمانة الإعلام" };
  const { db, calls, audits } = makeDb({
    central_secretariats: {
      findUnique: async () => (sec ? { ...sec } : null),
      delete: async () => {
        const s = sec;
        sec = null;
        return s;
      },
    },
    central_secretariat_people: {
      count: async (args) => {
        assert.equal(args.where?.secretariat_id, 10);
        return 4; // 4 people will be cascade-deleted
      },
    },
  });

  const res = await deleteCentralSecretariat(10, actor, db);
  assert.deepEqual(res, { deleted: true, cascade_deleted_people_count: 4 });

  // Only 1 audit call made for the secretariat
  const auditCalls = calls.filter((c) => c.model === "staff_audit_log" && c.method === "create");
  assert.equal(auditCalls.length, 1);
  const audit = auditCalls[0].args.data;
  assert.equal(audit.action_type, "content_deleted");
  assert.equal(audit.details?.entity_type, "central_secretariat");
  assert.equal(audit.details?.cascade_deleted_people_count, 4);

  // No audit records created for individual people
  const personAudits = audits.filter((a) => a.details?.entity_type === "central_secretariat_person");
  assert.equal(personAudits.length, 0);
});

test("FINDING-02: deleteCentralSecretariat locks parent row with FOR UPDATE before counting people, deleting, and auditing", async () => {
  // Test explanation & mock boundaries:
  // This test validates that deleteCentralSecretariat strictly follows this sequence:
  // 1. tx.$queryRaw: SELECT "id", "name_ar" FROM "central_secretariats" WHERE "id" = ${id} FOR UPDATE
  // 2. tx.central_secretariat_people.count: count related people while parent is exclusively locked
  // 3. tx.central_secretariats.delete: delete parent row (triggering DB-level ON DELETE CASCADE)
  // 4. tx.staff_audit_log.create: record single audit log with cascade_deleted_people_count
  // All 4 operations occur within the exact same transaction.
  //
  // Mock test boundary limitation:
  // Unit test mocks verify query formulation, parameter binding, call sequence, and transaction atomicity.
  // Real row lock contention (blocking concurrent inserts to central_secretariat_people due to FK check
  // conflicting with FOR UPDATE) requires an active PostgreSQL instance with multiple connections.

  let locked = false;
  let countCalled = false;
  let deleteCalled = false;
  const sequence = [];

  const { db, calls } = makeDb({
    $queryRaw: async (strings, ...values) => {
      const sql = strings.join("?");
      assert.ok(sql.includes('SELECT "id", "name_ar"'));
      assert.ok(sql.includes('FROM "central_secretariats"'));
      assert.ok(sql.includes("FOR UPDATE"));
      assert.equal(values[0], 42);
      locked = true;
      sequence.push("lock");
      return [{ id: 42, name_ar: "أمانة الشباب" }];
    },
    central_secretariat_people: {
      count: async (args) => {
        assert.ok(locked, "Must lock parent row before counting related people");
        assert.equal(args.where?.secretariat_id, 42);
        countCalled = true;
        sequence.push("count");
        return 7;
      },
    },
    central_secretariats: {
      delete: async (args) => {
        assert.ok(locked, "Must hold lock during delete");
        assert.ok(countCalled, "Must count related people before delete");
        assert.equal(args.where?.id, 42);
        deleteCalled = true;
        sequence.push("delete");
        return { id: 42, name_ar: "أمانة الشباب" };
      },
    },
  });

  const result = await deleteCentralSecretariat(42, actor, db);
  assert.deepEqual(result, { deleted: true, cascade_deleted_people_count: 7 });

  // Verify call sequence
  assert.equal(sequence[0], "lock");
  assert.equal(sequence[1], "count");
  assert.equal(sequence[2], "delete");
  assert.ok(deleteCalled);

  // Verify audit call occurred after delete
  const auditCall = calls.find((c) => c.model === "staff_audit_log" && c.method === "create");
  assert.ok(auditCall);
  assert.equal(auditCall.tx, "tx");
  assert.equal(auditCall.args.data.details?.cascade_deleted_people_count, 7);
  assert.equal(auditCall.args.data.details?.entity_id, "42");
  assert.equal(auditCall.args.data.action_type, "content_deleted");

  // Verify all calls were on the transaction
  const lockCall = calls.find((c) => c.method === "$queryRaw");
  assert.equal(lockCall.tx, "tx");
  const countCall = calls.find((c) => c.model === "central_secretariat_people" && c.method === "count");
  assert.equal(countCall.tx, "tx");
  const delCall = calls.find((c) => c.model === "central_secretariats" && c.method === "delete");
  assert.equal(delCall.tx, "tx");

  // Missing secretariat returns null without counting or deleting
  const { db: missingDb } = makeDb({
    $queryRaw: async () => [],
    central_secretariat_people: {
      count: async () => { throw new Error("Should not count if missing"); },
    },
    central_secretariats: {
      delete: async () => { throw new Error("Should not delete if missing"); },
    },
  });
  const notFoundResult = await deleteCentralSecretariat(999, actor, missingDb);
  assert.equal(notFoundResult, null);

  // Missing $queryRaw support throws TypeError
  const nonPostgresDb = {
    $transaction: async (cb) => cb({ central_secretariats: {} }),
  };
  await assert.rejects(
    deleteCentralSecretariat(42, actor, nonPostgresDb),
    { name: "TypeError", message: "PostgreSQL row locks are required" },
  );
});

test("F-01: migration CHECK constraint has valid PostgreSQL syntax with no subqueries", () => {
  const migrationPath = path.resolve("prisma/migrations/20261118000000_phase13_organizational_content/migration.sql");
  const sql = readFileSync(migrationPath, "utf8");

  // Extract the details safe keys check constraint
  const match = /CONSTRAINT\s+"staff_audit_log_details_safe_keys_check"\s+CHECK\s*\(([\s\S]*?)\);/.exec(sql);
  assert.ok(match, "CHECK constraint staff_audit_log_details_safe_keys_check must exist in migration");

  const checkBody = match[1];
  // Subqueries are forbidden in PostgreSQL CHECK constraints
  assert.equal(/SELECT\s+/i.test(checkBody), false, "CHECK constraint must not contain SELECT subqueries");
  assert.equal(/EXISTS\s*\(/i.test(checkBody), false, "CHECK constraint must not contain EXISTS subqueries");

  // Changed fields is validated as array
  assert.ok(checkBody.includes(`jsonb_typeof("details"->'changed_fields') = 'array'`), "changed_fields must be checked as array");
  // Cascade deleted people count is in allowed keys and checked as number
  assert.ok(checkBody.includes("'cascade_deleted_people_count'"), "cascade_deleted_people_count must be in allowed keys");
  assert.ok(checkBody.includes(`jsonb_typeof("details"->'cascade_deleted_people_count') = 'number'`), "cascade_deleted_people_count must be checked as number");
});
