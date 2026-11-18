  import assert from "node:assert/strict";
import test from "node:test";

import {
  createNewsSource,
  getNewsSource,
  listActiveNewsSources,
  listNewsSourcesAdmin,
  setNewsSourceActive,
  updateNewsSource,
} from "./news-sources.js";

const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Super Admin",
  email: "admin@example.test",
  role: "super_admin",
};

function makeMockDb({ sources = [], failAudit = false } = {}) {
  const store = new Map(sources.map((s) => [s.id, { ...s }]));
  let nextId = store.size + 1;
  const calls = [];
  const audits = [];

  const client = {
    $queryRaw: async (strings, ...values) => {
      const sql = Array.isArray(strings) ? strings.join("?") : String(strings);
      calls.push({ method: "$queryRaw", sql, values });
      if (sql.includes('FROM "news_sources"') && sql.includes("FOR UPDATE")) {
        const id = values[0];
        const s = store.get(id);
        return s ? [{ ...s }] : [];
      }
      return [];
    },
    news_sources: {
      findUnique: async ({ where }) => {
        calls.push({ method: "findUnique", where });
        if (where.id) return store.get(where.id) ? { ...store.get(where.id) } : null;
        if (where.slug) {
          for (const s of store.values()) {
            if (s.slug === where.slug) return { ...s };
          }
        }
        return null;
      },
      create: async ({ data, select }) => {
        calls.push({ method: "create", data });
        const id = nextId++;
        const record = { id, created_at: new Date(), ...data };
        store.set(id, record);
        const res = {};
        for (const k of Object.keys(select || record)) res[k] = record[k];
        return res;
      },
      update: async ({ where, data, select }) => {
        calls.push({ method: "update", where, data });
        const current = store.get(where.id);
        if (!current) throw new Error("Record not found");
        const updated = { ...current, ...data };
        store.set(where.id, updated);
        const res = {};
        for (const k of Object.keys(select || updated)) res[k] = updated[k];
        return res;
      },
      findMany: async ({ where, skip = 0, take = 25, select }) => {
        calls.push({ method: "findMany", where, skip, take });
        let items = Array.from(store.values());
        if (where?.is_active !== undefined) {
          items = items.filter((s) => s.is_active === where.is_active);
        }
        return items.slice(skip, skip + take).map((s) => {
          if (!select) return { ...s };
          const res = {};
          for (const k of Object.keys(select)) res[k] = s[k];
          return res;
        });
      },
      count: async ({ where } = {}) => {
        calls.push({ method: "count", where });
        let items = Array.from(store.values());
        if (where?.is_active !== undefined) {
          items = items.filter((s) => s.is_active === where.is_active);
        }
        return items.length;
      },
    },
    staff_audit_log: {
      create: async ({ data }) => {
        calls.push({ method: "audit_create", data });
        audits.push(data);
        if (failAudit) throw new Error("AUDIT_FAILED");
        return { id: BigInt(audits.length), ...data };
      },
    },
    $transaction: async (cb) => {
      const snapshot = new Map(Array.from(store.entries()).map(([k, v]) => [k, { ...v }]));
      try {
        return await cb(client);
      } catch (err) {
        store.clear();
        for (const [k, v] of snapshot.entries()) {
          store.set(k, v);
        }
        throw err;
      }
    },
  };

  return { db: client, store, calls, audits };
}

test("news sources: createNewsSource enforces unique slug and writes audit log", async () => {
  const { db, audits } = makeMockDb();
  const input = {
    name_ar: "اليوم السابع",
    slug: "youm7",
    sort_order: 1,
    is_active: true,
  };

  const res = await createNewsSource(input, actor, db);
  assert.equal(res.ok, true);
  assert.equal(res.data.name_ar, "اليوم السابع");
  assert.equal(res.data.slug, "youm7");

  // Audit verified
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_created");
  assert.equal(audits[0].details?.entity_type, "news_source");
  assert.equal(audits[0].details?.slug, "youm7");

  // Duplicate slug rejected
  const dupRes = await createNewsSource(input, actor, db);
  assert.equal(dupRes.ok, false);
  assert.equal(dupRes.code, "DUPLICATE_SLUG");
});

test("news sources: updateNewsSource and setNewsSourceActive write content_updated audit", async () => {
  const initial = [
    { id: 1, name_ar: "اليوم السابع", slug: "youm7", sort_order: 1, is_active: true },
  ];
  const { db, audits } = makeMockDb({ sources: initial });

  const updateRes = await updateNewsSource(1, { name_ar: "اليوم السابع الإخباري" }, actor, db);
  assert.equal(updateRes.ok, true);
  assert.equal(updateRes.data.name_ar, "اليوم السابع الإخباري");
  assert.equal(audits[0].action_type, "content_updated");
  assert.deepEqual(audits[0].details?.changed_fields, ["name_ar"]);

  // Deactivate
  const deactRes = await setNewsSourceActive(1, false, actor, db);
  assert.equal(deactRes.ok, true);
  assert.equal(deactRes.data.is_active, false);
  assert.equal(audits[1].action_type, "content_updated");
  assert.deepEqual(audits[1].details?.changed_fields, ["is_active"]);

  // Not found returns NOT_FOUND
  const notFound = await updateNewsSource(999, { name_ar: "X" }, actor, db);
  assert.equal(notFound.ok, false);
  assert.equal(notFound.code, "NOT_FOUND");
});

test("news sources: listActiveNewsSources filters active sources only", async () => {
  const sources = [
    { id: 1, name_ar: "المصدر 1", slug: "src-1", sort_order: 1, is_active: true },
    { id: 2, name_ar: "المصدر 2", slug: "src-2", sort_order: 2, is_active: false },
    { id: 3, name_ar: "المصدر 3", slug: "src-3", sort_order: 3, is_active: true },
  ];
  const { db } = makeMockDb({ sources });

  const active = await listActiveNewsSources(db);
  assert.equal(active.length, 2);
  assert.equal(active[0].slug, "src-1");
  assert.equal(active[1].slug, "src-3");

  const adminList = await listNewsSourcesAdmin({ page: 1, page_size: 10 }, actor, db);
  assert.equal(adminList.ok, true);
  assert.equal(adminList.data.pagination.total, 3);

  const single = await getNewsSource(1, actor, db);
  assert.equal(single.ok, true);
  assert.equal(single.data.name_ar, "المصدر 1");
});

test("news sources: transaction rolls back when audit fails", async () => {
  const { db, store } = makeMockDb({ failAudit: true });
  await assert.rejects(
    createNewsSource({ name_ar: "مصر", slug: "misr" }, actor, db),
    /AUDIT_FAILED/,
  );
  assert.equal(store.size, 0);
});

test("news sources: unauthorized roles rejected with UNAUTHORIZED without writes or audits", async () => {
  const unauthorizedRoles = [
    "news_editor",
    "news_reviewer",
    "content_editor",
    "membership_officer",
    "service_officer",
  ];

  for (const role of unauthorizedRoles) {
    const unauthorizedActor = {
      id: "99999999-9999-4999-8999-999999999999",
      full_name: `User ${role}`,
      email: `${role}@example.test`,
      role,
    };
    const { db, store, audits } = makeMockDb({
      sources: [{ id: 1, name_ar: "المصدر", slug: "src", is_active: true }],
    });

    // Create
    const createRes = await createNewsSource(
      { name_ar: "محاولة اختراق", slug: "hacked" },
      unauthorizedActor,
      db,
    );
    assert.equal(createRes.ok, false);
    assert.equal(createRes.code, "UNAUTHORIZED");

    // Update
    const updateRes = await updateNewsSource(
      1,
      { name_ar: "تعديل غير مصرح" },
      unauthorizedActor,
      db,
    );
    assert.equal(updateRes.ok, false);
    assert.equal(updateRes.code, "UNAUTHORIZED");

    // Deactivate
    const deactRes = await setNewsSourceActive(1, false, unauthorizedActor, db);
    assert.equal(deactRes.ok, false);
    assert.equal(deactRes.code, "UNAUTHORIZED");

    // Get
    const getRes = await getNewsSource(1, unauthorizedActor, db);
    assert.equal(getRes.ok, false);
    assert.equal(getRes.code, "UNAUTHORIZED");

    // List Admin
    const listRes = await listNewsSourcesAdmin({}, unauthorizedActor, db);
    assert.equal(listRes.ok, false);
    assert.equal(listRes.code, "UNAUTHORIZED");

    // No mutations or audit entries created
    assert.equal(store.size, 1);
    assert.equal(store.get(1).name_ar, "المصدر");
    assert.equal(store.get(1).is_active, true);
    assert.equal(audits.length, 0);
  }
});
