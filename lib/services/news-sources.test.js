  import assert from "node:assert/strict";
import test from "node:test";

import {
  createNewsSource,
  deleteAllNewsSources,
  deleteNewsSource,
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

function makeMockDb({ sources = [], articles = [], failAudit = false } = {}) {
  const store = new Map(sources.map((s) => [s.id, { ...s }]));
  const articleStore = articles.map((article) => ({ ...article }));
  let nextId = store.size + 1;
  const calls = [];
  const audits = [];

  const client = {
    $queryRaw: async (strings, ...values) => {
      const sql = Array.isArray(strings) ? strings.join("?") : String(strings);
      calls.push({ method: "$queryRaw", sql, values });
      if (sql.includes('FROM "news_sources"') && sql.includes("FOR UPDATE")) {
        if (sql.includes("ORDER BY")) {
          return Array.from(store.values())
            .sort((a, b) => a.id - b.id)
            .map((source) => ({ ...source }));
        }
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
      delete: async ({ where }) => {
        calls.push({ method: "delete", where });
        const current = store.get(where.id);
        if (!current) throw new Error("Record not found");
        store.delete(where.id);
        return { ...current };
      },
      deleteMany: async ({ where } = {}) => {
        calls.push({ method: "deleteMany", where });
        const count = store.size;
        store.clear();
        return { count };
      },
    },
    news_articles: {
      count: async ({ where }) => {
        calls.push({ method: "article_count", where });
        return articleStore.filter((article) => article.source_id === where.source_id).length;
      },
      findMany: async ({ where, select }) => {
        calls.push({ method: "article_findMany", where });
        const field = Object.keys(select)[0];
        return articleStore
          .filter((article) => where.source_id.in.includes(article.source_id))
          .map((article) => ({ [field]: article[field] }));
      },
    },
    $executeRaw: async (strings) => {
      calls.push({ method: "$executeRaw", sql: strings.join("") });
      return 0;
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

test("news sources: deleteNewsSource deletes unused sources, rejects references and audits", async () => {
  const source = {
    id: 4,
    name_ar: "مصدر محلي",
    slug: "local-source",
    sort_order: 0,
    is_active: true,
    created_at: new Date(),
  };
  const { db, store, calls, audits } = makeMockDb({ sources: [source] });

  const deleted = await deleteNewsSource(source.id, actor, db);
  assert.deepEqual(deleted, { ok: true, data: { deleted: true, id: source.id } });
  assert.equal(store.has(source.id), false);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_deleted");
  assert.equal(audits[0].details.entity_type, "news_source");
  assert.equal(audits[0].details.entity_id, String(source.id));
  assert.ok(calls.some((call) => call.method === "article_count"));

  const referenced = makeMockDb({
    sources: [source],
    articles: [{ id: "article-1", source_id: source.id }],
  });
  const rejected = await deleteNewsSource(source.id, actor, referenced.db);
  assert.equal(rejected.code, "SOURCE_IN_USE");
  assert.equal(rejected.source_id, source.id);
  assert.equal(referenced.store.has(source.id), true);
  assert.equal(referenced.audits.length, 0);

  assert.equal((await deleteNewsSource(999, actor, db)).code, "NOT_FOUND");
});

test("news sources: deleteAllNewsSources is locked, atomic and handles empty collections", async () => {
  const sources = [
    { id: 1, name_ar: "مصدر 1", slug: "source-1", sort_order: 1, is_active: true },
    { id: 2, name_ar: "مصدر 2", slug: "source-2", sort_order: 2, is_active: true },
  ];
  const unused = makeMockDb({ sources });
  const deleted = await deleteAllNewsSources(actor, unused.db);
  assert.deepEqual(deleted, { ok: true, data: { deleted_count: 2 } });
  assert.equal(unused.store.size, 0);
  assert.equal(unused.audits.length, 2);
  assert.ok(unused.audits.every((audit) => audit.action_type === "content_deleted"));
  assert.ok(unused.calls.some((call) => call.method === "$executeRaw" && call.sql.includes("SHARE ROW EXCLUSIVE")));
  assert.ok(unused.calls.some((call) => call.method === "$queryRaw" && call.sql.includes("FOR UPDATE")));

  const inUse = makeMockDb({
    sources,
    articles: [{ id: "article-1", source_id: 2 }],
  });
  const rejected = await deleteAllNewsSources(actor, inUse.db);
  assert.equal(rejected.code, "SOURCE_IN_USE");
  assert.deepEqual(rejected.source_ids, [2]);
  assert.equal(inUse.store.size, 2);
  assert.equal(inUse.audits.length, 0);

  const empty = makeMockDb();
  assert.deepEqual(await deleteAllNewsSources(actor, empty.db), {
    ok: true,
    data: { deleted_count: 0 },
  });
  assert.equal(empty.audits.length, 0);
});

test("news sources: deletion services reject Writers and Reviewers without writes", async () => {
  for (const role of ["news_editor", "news_reviewer"]) {
    const nonAdmin = { ...actor, role };
    const { db, store, audits } = makeMockDb({
      sources: [{ id: 1, name_ar: "مصدر", slug: "source", is_active: true }],
    });
    assert.equal((await deleteNewsSource(1, nonAdmin, db)).code, "UNAUTHORIZED");
    assert.equal((await deleteAllNewsSources(nonAdmin, db)).code, "UNAUTHORIZED");
    assert.equal(store.size, 1);
    assert.equal(audits.length, 0);
  }
});

test("news sources: deletion audit failure rolls back source changes", async () => {
  const source = { id: 1, name_ar: "مصدر", slug: "source", is_active: true };
  const single = makeMockDb({ sources: [source], failAudit: true });
  await assert.rejects(deleteNewsSource(1, actor, single.db), /AUDIT_FAILED/);
  assert.equal(single.store.has(1), true);

  const bulk = makeMockDb({ sources: [source], failAudit: true });
  await assert.rejects(deleteAllNewsSources(actor, bulk.db), /AUDIT_FAILED/);
  assert.equal(bulk.store.has(1), true);
});

test("news sources: unauthorized roles rejected with UNAUTHORIZED without writes or audits", async () => {
  const unauthorizedRoles = [
    "news_editor",
    "news_reviewer",
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
