import assert from "node:assert/strict";
import test from "node:test";

import {
  createArticle,
  deleteArticle,
  getArticle,
  listArticlesAdmin,
  publishArticle,
  requestArticleChanges,
  submitArticleForReview,
  unpublishArticle,
  updateArticle,
} from "./news-articles.js";

const editorA = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Editor One",
  email: "editor1@example.test",
  role: "news_editor",
};

const editorB = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Editor Two",
  email: "editor2@example.test",
  role: "news_editor",
};

const reviewer = {
  id: "33333333-3333-4333-8333-333333333333",
  full_name: "News Reviewer",
  email: "reviewer@example.test",
  role: "news_reviewer",
};

const superAdmin = {
  id: "44444444-4444-4444-8444-444444444444",
  full_name: "Super Admin",
  email: "admin@example.test",
  role: "super_admin",
};

function makeMockDb({ articles = [], sources = [], failAudit = false } = {}) {
  const articleStore = new Map(articles.map((a) => [a.id, { ...a }]));
  const sourceStore = new Map(sources.map((s) => [s.id, { ...s }]));
  const calls = [];
  const audits = [];
  let nextArticleUuid = 1;

  const client = {
    $queryRaw: async (strings, ...values) => {
      const sql = Array.isArray(strings) ? strings.join("?") : String(strings);
      calls.push({ method: "$queryRaw", sql, values });
      if (sql.includes('FROM "news_articles"') && sql.includes("FOR UPDATE")) {
        const id = values[0];
        const a = articleStore.get(id);
        return a ? [{ ...a }] : [];
      }
      if (sql.includes('FROM "news_sources"') && sql.includes("FOR SHARE")) {
        const id = values[0];
        const s = sourceStore.get(id);
        return s ? [{ ...s }] : [];
      }
      return [];
    },
    news_sources: {
      findUnique: async ({ where }) => {
        calls.push({ model: "news_sources", method: "findUnique", where });
        if (where.id) return sourceStore.get(where.id) ? { ...sourceStore.get(where.id) } : null;
        if (where.slug) {
          for (const s of sourceStore.values()) {
            if (s.slug === where.slug) return { ...s };
          }
        }
        return null;
      },
    },
    news_articles: {
      findUnique: async ({ where, select }) => {
        calls.push({ model: "news_articles", method: "findUnique", where });
        let found = null;
        if (where.id) found = articleStore.get(where.id);
        if (where.slug) {
          for (const a of articleStore.values()) {
            if (a.slug === where.slug) found = a;
          }
        }
        if (!found) return null;
        const res = {};
        for (const k of Object.keys(select || found)) res[k] = found[k];
        return res;
      },
      create: async ({ data, select }) => {
        calls.push({ model: "news_articles", method: "create", data });
        const id = data.id || `a0000000-0000-4000-8000-${String(nextArticleUuid++).padStart(12, "0")}`;
        const record = {
          id,
          created_at: new Date(),
          updated_at: new Date(),
          reviewed_by: null,
          reviewed_at: null,
          review_note: null,
          ...data,
        };
        articleStore.set(id, record);
        const res = {};
        for (const k of Object.keys(select || record)) res[k] = record[k];
        return res;
      },
      update: async ({ where, data, select }) => {
        calls.push({ model: "news_articles", method: "update", where, data });
        const current = articleStore.get(where.id);
        if (!current) throw new Error("Article not found in mock");
        const updated = { ...current, ...data, updated_at: new Date() };
        articleStore.set(where.id, updated);
        const res = {};
        for (const k of Object.keys(select || updated)) res[k] = updated[k];
        return res;
      },
      delete: async ({ where }) => {
        calls.push({ model: "news_articles", method: "delete", where });
        const current = articleStore.get(where.id);
        if (!current) throw new Error("Article not found in mock");
        articleStore.delete(where.id);
        return current;
      },
      findMany: async ({ where = {}, skip = 0, take = 25, select }) => {
        calls.push({ model: "news_articles", method: "findMany", where, skip, take });
        let items = Array.from(articleStore.values());
        if (where.created_by) items = items.filter((a) => a.created_by === where.created_by);
        if (where.status) items = items.filter((a) => a.status === where.status);
        if (where.source_id) items = items.filter((a) => a.source_id === where.source_id);
        if (where.is_featured !== undefined) items = items.filter((a) => a.is_featured === where.is_featured);
        if (where.is_published !== undefined) items = items.filter((a) => a.is_published === where.is_published);
        if (where.OR) {
          items = items.filter((a) =>
            a.title.includes(where.OR[0].title.contains) || a.body.includes(where.OR[1].body.contains),
          );
        }
        return items.slice(skip, skip + take).map((a) => {
          if (!select) return { ...a };
          const res = {};
          for (const k of Object.keys(select)) res[k] = a[k];
          return res;
        });
      },
      count: async ({ where = {} } = {}) => {
        calls.push({ model: "news_articles", method: "count", where });
        let items = Array.from(articleStore.values());
        if (where.created_by) items = items.filter((a) => a.created_by === where.created_by);
        if (where.status) items = items.filter((a) => a.status === where.status);
        if (where.source_id) items = items.filter((a) => a.source_id === where.source_id);
        if (where.is_featured !== undefined) items = items.filter((a) => a.is_featured === where.is_featured);
        if (where.is_published !== undefined) items = items.filter((a) => a.is_published === where.is_published);
        return items.length;
      },
    },
    staff_audit_log: {
      create: async ({ data }) => {
        calls.push({ model: "staff_audit_log", method: "create", data });
        audits.push(data);
        if (failAudit) throw new Error("AUDIT_FAILED");
        return { id: BigInt(audits.length), ...data };
      },
    },
    $transaction: async (cb) => {
      const snapshot = new Map(Array.from(articleStore.entries()).map(([k, v]) => [k, { ...v }]));
      try {
        return await cb(client);
      } catch (err) {
        articleStore.clear();
        for (const [k, v] of snapshot.entries()) {
          articleStore.set(k, v);
        }
        throw err;
      }
    },
  };

  return { db: client, articleStore, sourceStore, calls, audits };
}

const defaultSources = [
  { id: 1, name_ar: "اليوم السابع", slug: "youm7", is_active: true },
  { id: 2, name_ar: "المصدر المغلق", slug: "closed-src", is_active: false },
];

test("news articles: createArticle creates draft with is_published=false and audit log", async () => {
  const { db, audits } = makeMockDb({ sources: defaultSources });
  const input = {
    title: "مقال إخباري جديد",
    body: "نص المقال الإخباري بالتفصيل...",
    source_id: 1,
    published_on: "2026-11-07",
    slug: "new-article-slug",
  };

  const res = await createArticle(input, editorA, db);
  assert.equal(res.ok, true);
  assert.equal(res.data.status, "draft");
  assert.equal(res.data.is_published, false);
  assert.equal(res.data.created_by, editorA.id);
  assert.equal(res.data.updated_by, editorA.id);

  // Audit verified
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action_type, "content_created");
  assert.equal(audits[0].details?.entity_type, "news_article");
  assert.equal(audits[0].details?.slug, "new-article-slug");

  // Inactive source rejected
  const inactiveRes = await createArticle({ ...input, slug: "s2", source_id: 2 }, editorA, db);
  assert.equal(inactiveRes.ok, false);
  assert.equal(inactiveRes.code, "SOURCE_INACTIVE");

  // Non-existent source rejected
  const missingSrc = await createArticle({ ...input, slug: "s3", source_id: 999 }, editorA, db);
  assert.equal(missingSrc.ok, false);
  assert.equal(missingSrc.code, "SOURCE_NOT_FOUND");

  // Duplicate slug rejected
  const dupSlug = await createArticle({ ...input, slug: "new-article-slug" }, editorA, db);
  assert.equal(dupSlug.ok, false);
  assert.equal(dupSlug.code, "DUPLICATE_SLUG");

  // Reviewer cannot create articles
  const reviewerCreate = await createArticle({ ...input, slug: "rev-article" }, reviewer, db);
  assert.equal(reviewerCreate.ok, false);
  assert.equal(reviewerCreate.code, "UNAUTHORIZED");
});

test("news articles: updateArticle enforces author ownership, status, and role rules", async () => {
  const articles = [
    {
      id: "a1",
      title: "مقال مسودة",
      body: "نص",
      slug: "article-1",
      status: "draft",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
      updated_by: editorA.id,
    },
    {
      id: "a2",
      title: "مقال معلق",
      body: "نص",
      slug: "article-2",
      status: "pending_review",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
      updated_by: editorA.id,
    },
    {
      id: "a3",
      title: "مقال منشور",
      body: "نص",
      slug: "article-3",
      status: "published",
      is_published: true,
      source_id: 1,
      created_by: editorA.id,
      updated_by: editorA.id,
    },
    {
      id: "a4",
      title: "مقال مطلوب تعديله",
      body: "نص",
      slug: "article-4",
      status: "changes_requested",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
      updated_by: editorA.id,
    },
  ];

  const { db, audits } = makeMockDb({ articles, sources: defaultSources });

  // 1. Author can edit own draft
  const editDraft = await updateArticle("a1", { title: "عنوان معدل" }, editorA, db);
  assert.equal(editDraft.ok, true);
  assert.equal(editDraft.data.title, "عنوان معدل");
  assert.equal(audits[0].action_type, "content_updated");
  assert.deepEqual(audits[0].details?.changed_fields, ["title"]);

  // 2. Author can edit own changes_requested article
  const editChangesReq = await updateArticle("a4", { title: "تعديل بعد الملاحظة" }, editorA, db);
  assert.equal(editChangesReq.ok, true);
  assert.equal(editChangesReq.data.title, "تعديل بعد الملاحظة");

  // 3. Author cannot edit another author's article (returns NOT_FOUND)
  const editOther = await updateArticle("a1", { title: "محاولة اختراق" }, editorB, db);
  assert.equal(editOther.ok, false);
  assert.equal(editOther.code, "NOT_FOUND");

  // 4. Author cannot edit pending_review article
  const editPending = await updateArticle("a2", { title: "تعديل أثناء المراجعة" }, editorA, db);
  assert.equal(editPending.ok, false);
  assert.equal(editPending.code, "CANNOT_EDIT_IN_CURRENT_STATUS");

  // 5. Author cannot edit published article
  const editPublished = await updateArticle("a3", { title: "تعديل مقال منشور" }, editorA, db);
  assert.equal(editPublished.ok, false);
  assert.equal(editPublished.code, "CANNOT_EDIT_IN_CURRENT_STATUS");

  // 6. Reviewer must not receive content editing capabilities
  const reviewerEdit = await updateArticle("a1", { title: "تعديل المراجع" }, reviewer, db);
  assert.equal(reviewerEdit.ok, false);
  assert.equal(reviewerEdit.code, "UNAUTHORIZED");

  // 7. Super admin can edit any article
  const adminEdit = await updateArticle("a3", { title: "تعديل المدير لمقال منشور" }, superAdmin, db);
  assert.equal(adminEdit.ok, true);
  assert.equal(adminEdit.data.title, "تعديل المدير لمقال منشور");
});

test("news articles: workflow transitions: submit, request changes, publish, and unpublish", async () => {
  const articles = [
    {
      id: "art-1",
      title: "مقال الدورة الكاملة",
      slug: "full-flow",
      body: "محتوى",
      status: "draft",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
      updated_by: editorA.id,
    },
  ];
  const { db, audits } = makeMockDb({ articles, sources: defaultSources });

  // 1. Author submits draft for review
  const subRes = await submitArticleForReview("art-1", editorA, db);
  assert.equal(subRes.ok, true);
  assert.equal(subRes.data.status, "pending_review");
  assert.equal(subRes.data.is_published, false);
  assert.equal(audits[0].action_type, "content_updated");
  assert.deepEqual(audits[0].details?.changed_fields, ["status"]);

  // Cannot submit while already pending_review
  const subAgain = await submitArticleForReview("art-1", editorA, db);
  assert.equal(subAgain.ok, false);
  assert.equal(subAgain.code, "INVALID_STATUS_TRANSITION");

  // 2. Reviewer requests changes with note
  // Empty note rejected
  const reqEmptyNote = await requestArticleChanges("art-1", { review_note: "   " }, reviewer, db);
  assert.equal(reqEmptyNote.ok, false);
  assert.equal(reqEmptyNote.code, "REVIEW_NOTE_REQUIRED");

  const reqChanges = await requestArticleChanges(
    "art-1",
    { review_note: "يرجى تعديل الصياغة وإضافة تفاصيل الأرقام" },
    reviewer,
    db,
  );
  assert.equal(reqChanges.ok, true);
  assert.equal(reqChanges.data.status, "changes_requested");
  assert.equal(reqChanges.data.is_published, false);
  assert.equal(reqChanges.data.review_note, "يرجى تعديل الصياغة وإضافة تفاصيل الأرقام");
  assert.equal(reqChanges.data.reviewed_by, reviewer.id);
  assert.ok(reqChanges.data.reviewed_at);

  // 3. Author resubmits after changes
  const resubmit = await submitArticleForReview("art-1", editorA, db);
  assert.equal(resubmit.ok, true);
  assert.equal(resubmit.data.status, "pending_review");
  assert.equal(resubmit.data.is_published, false);

  // 4. Publishing:
  // Reviewer approves and publishes
  const pubRes = await publishArticle("art-1", reviewer, db);
  assert.equal(pubRes.ok, true);
  assert.equal(pubRes.data.status, "published");
  assert.equal(pubRes.data.is_published, true);
  assert.equal(pubRes.data.reviewed_by, reviewer.id);
  // Retain review note internally after publishing for editorial audit trail
  assert.equal(pubRes.data.review_note, "يرجى تعديل الصياغة وإضافة تفاصيل الأرقام");

  // Audit for publish
  const lastAudit = audits[audits.length - 1];
  assert.equal(lastAudit.action_type, "content_published");

  // Invariant verified: is_published is true only because status is published
  assert.equal(pubRes.data.is_published, true);

  // 5. Unpublishing:
  // Reviewer unpublishes -> status back to draft, is_published=false
  const unpubRes = await unpublishArticle("art-1", reviewer, db);
  assert.equal(unpubRes.ok, true);
  assert.equal(unpubRes.data.status, "draft");
  assert.equal(unpubRes.data.is_published, false);

  const unpubAudit = audits[audits.length - 1];
  assert.equal(unpubAudit.action_type, "content_unpublished");

  // Invariant verified: is_published is false
  assert.equal(unpubRes.data.is_published, false);
});

test("news articles: self-publishing restriction: reviewers prohibited, super_admin allowed", async () => {
  const articles = [
    {
      id: "art-rev",
      title: "مقال كتبه المراجع",
      slug: "written-by-reviewer",
      body: "محتوى",
      status: "pending_review",
      is_published: false,
      source_id: 1,
      created_by: reviewer.id, // Authored by reviewer
      updated_by: reviewer.id,
    },
    {
      id: "art-adm",
      title: "مقال كتبه السوبر أدمن",
      slug: "written-by-admin",
      body: "محتوى",
      status: "pending_review",
      is_published: false,
      source_id: 1,
      created_by: superAdmin.id, // Authored by superAdmin
      updated_by: superAdmin.id,
    },
  ];
  const { db } = makeMockDb({ articles, sources: defaultSources });

  // 1. Reviewer CANNOT self-publish their own article
  const revPubSelf = await publishArticle("art-rev", reviewer, db);
  assert.equal(revPubSelf.ok, false);
  assert.equal(revPubSelf.code, "SELF_PUBLISHING_PROHIBITED");

  // 2. Editor CANNOT self-publish their own article (fails with UNAUTHORIZED)
  const edPubSelf = await publishArticle("art-rev", editorA, db);
  assert.equal(edPubSelf.ok, false);
  assert.equal(edPubSelf.code, "UNAUTHORIZED");

  // 3. SuperAdmin IS EXPLICITLY ALLOWED to publish their own article
  const admPubSelf = await publishArticle("art-adm", superAdmin, db);
  assert.equal(admPubSelf.ok, true);
  assert.equal(admPubSelf.data.status, "published");
  assert.equal(admPubSelf.data.is_published, true);
  assert.equal(admPubSelf.data.created_by, superAdmin.id);
  assert.equal(admPubSelf.data.reviewed_by, superAdmin.id);

  // 4. SuperAdmin can also publish the reviewer's article
  const admPubRev = await publishArticle("art-rev", superAdmin, db);
  assert.equal(admPubRev.ok, true);
  assert.equal(admPubRev.data.status, "published");
});

test("news articles: deleteArticle is restricted to super_admin", async () => {
  const articles = [
    {
      id: "del-1",
      title: "للحذف",
      slug: "to-delete",
      status: "draft",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
    },
  ];
  const { db, audits } = makeMockDb({ articles, sources: defaultSources });

  // Editor cannot delete
  const edDel = await deleteArticle("del-1", editorA, db);
  assert.equal(edDel.ok, false);
  assert.equal(edDel.code, "UNAUTHORIZED");

  // Reviewer cannot delete
  const revDel = await deleteArticle("del-1", reviewer, db);
  assert.equal(revDel.ok, false);
  assert.equal(revDel.code, "UNAUTHORIZED");

  // Super admin can delete
  const admDel = await deleteArticle("del-1", superAdmin, db);
  assert.equal(admDel.ok, true);
  assert.equal(admDel.data.deleted, true);
  assert.equal(audits[0].action_type, "content_deleted");
  assert.equal(audits[0].details?.entity_type, "news_article");
});

test("news articles: listArticlesAdmin and getArticle enforce author scoping", async () => {
  const articles = [
    {
      id: "a-ed1",
      title: "مقال المحرر 1",
      slug: "ed-1",
      body: "محتوى",
      status: "draft",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
    },
    {
      id: "a-ed2",
      title: "مقال المحرر 2",
      slug: "ed-2",
      body: "محتوى",
      status: "draft",
      is_published: false,
      source_id: 1,
      created_by: editorB.id,
    },
  ];
  const { db } = makeMockDb({ articles, sources: defaultSources });

  // Editor 1 only lists their own
  const listEd1 = await listArticlesAdmin({}, editorA, db);
  assert.equal(listEd1.ok, true);
  assert.equal(listEd1.data.items.length, 1);
  assert.equal(listEd1.data.items[0].id, "a-ed1");

  // Editor 1 getting Editor 2's article returns NOT_FOUND
  const getOther = await getArticle("a-ed2", editorA, db);
  assert.equal(getOther.ok, false);
  assert.equal(getOther.code, "NOT_FOUND");

  // Editor 1 getting own article succeeds
  const getOwn = await getArticle("a-ed1", editorA, db);
  assert.equal(getOwn.ok, true);
  assert.equal(getOwn.data.id, "a-ed1");

  // Reviewer sees all articles
  const listRev = await listArticlesAdmin({}, reviewer, db);
  assert.equal(listRev.ok, true);
  assert.equal(listRev.data.items.length, 2);

  // Reviewer can get any article
  const getRev = await getArticle("a-ed1", reviewer, db);
  assert.equal(getRev.ok, true);

  // Unauthorized roles cannot read or list articles
  const unauthorizedRoles = [
    "membership_officer",
    "service_officer",
    "content_editor",
  ];
  for (const role of unauthorizedRoles) {
    const unauth = {
      id: "99999999-9999-4999-8999-999999999999",
      full_name: `User ${role}`,
      email: `${role}@example.test`,
      role,
    };
    const getRes = await getArticle("a-ed1", unauth, db);
    assert.equal(getRes.ok, false);
    assert.equal(getRes.code, "UNAUTHORIZED");

    const listRes = await listArticlesAdmin({}, unauth, db);
    assert.equal(listRes.ok, false);
    assert.equal(listRes.code, "UNAUTHORIZED");

    const subRes = await submitArticleForReview("a-ed1", unauth, db);
    assert.equal(subRes.ok, false);
    assert.equal(subRes.code, "UNAUTHORIZED");
  }
});

test("news articles: slug generation supports Arabic, collision-safe suffixes, and explicit duplicates", async () => {
  const { db } = makeMockDb({ sources: defaultSources });

  // 1. Auto-generates clean Arabic slug when slug is omitted
  const res1 = await createArticle(
    {
      title: "انطلاق أكبر ملتقى توظيفي للحزب بمدينة السادات",
      body: "تفاصيل ملتقى التوظيف للمواطنين بمدينة السادات...",
      source_id: 1,
      published_on: "2026-11-07",
    },
    editorA,
    db,
  );
  assert.equal(res1.ok, true);
  assert.equal(res1.data.slug, "انطلاق-أكبر-ملتقى-توظيفي-للحزب-بمدينة-السادات");

  // 2. Collision resolution: creating another article with the exact same title
  const res2 = await createArticle(
    {
      title: "انطلاق أكبر ملتقى توظيفي للحزب بمدينة السادات",
      body: "نسخة أخرى من مقال ملتقى التوظيف للمواطنين...",
      source_id: 1,
      published_on: "2026-11-08",
    },
    editorA,
    db,
  );
  assert.equal(res2.ok, true);
  assert.equal(res2.data.slug, "انطلاق-أكبر-ملتقى-توظيفي-للحزب-بمدينة-السادات-2");

  // 3. Third collision gets -3
  const res3 = await createArticle(
    {
      title: "انطلاق أكبر ملتقى توظيفي للحزب بمدينة السادات",
      body: "نسخة ثالثة من المقال...",
      source_id: 1,
      published_on: "2026-11-09",
    },
    editorA,
    db,
  );
  assert.equal(res3.ok, true);
  assert.equal(res3.data.slug, "انطلاق-أكبر-ملتقى-توظيفي-للحزب-بمدينة-السادات-3");

  // 4. Title with punctuation only falls back to "article" and then collision "-2"
  const punct1 = await createArticle(
    { title: "???!!!...", body: "محتوى المقال الأول", source_id: 1, published_on: "2026-11-07" },
    editorA,
    db,
  );
  assert.equal(punct1.ok, true);
  assert.equal(punct1.data.slug, "article");

  const punct2 = await createArticle(
    { title: "???!!!...", body: "محتوى المقال الثاني", source_id: 1, published_on: "2026-11-07" },
    editorA,
    db,
  );
  assert.equal(punct2.ok, true);
  assert.equal(punct2.data.slug, "article-2");

  // 5. Explicitly supplied slug duplicate returns DUPLICATE_SLUG
  const explicitDup = await createArticle(
    {
      title: "مقال بعنوان مختلف تماماً",
      slug: "انطلاق-أكبر-ملتقى-توظيفي-للحزب-بمدينة-السادات",
      body: "محتوى إخباري...",
      source_id: 1,
      published_on: "2026-11-07",
    },
    editorA,
    db,
  );
  assert.equal(explicitDup.ok, false);
  assert.equal(explicitDup.code, "DUPLICATE_SLUG");
});

test("news articles: createArticle uses FOR SHARE lock on news_sources", async () => {
  const { db, calls } = makeMockDb({ sources: defaultSources });
  const res = await createArticle(
    {
      title: "مقال فحص القفل",
      body: "محتوى مقال لاختبار قفل المصدر في قاعدة البيانات...",
      source_id: 1,
      published_on: "2026-11-07",
    },
    editorA,
    db,
  );
  assert.equal(res.ok, true);

  const rawCalls = calls.filter((c) => c.method === "$queryRaw");
  const sourceShareLock = rawCalls.find(
    (c) => c.sql.includes('FROM "news_sources"') && c.sql.includes("FOR SHARE"),
  );
  assert.ok(sourceShareLock, "Must execute SELECT ... FROM news_sources ... FOR SHARE");
});

test("news articles: transaction aborts and mutation rolls back if audit fails", async () => {
  const articles = [
    {
      id: "art-fail",
      title: "مقال اختبار التدقيق",
      slug: "audit-fail-slug",
      body: "محتوى",
      status: "draft",
      is_published: false,
      source_id: 1,
      created_by: editorA.id,
    },
  ];
  const { db, articleStore } = makeMockDb({ articles, sources: defaultSources, failAudit: true });

  // Creation fails and does not persist
  await assert.rejects(
    createArticle(
      { title: "جديد", body: "محتوى", source_id: 1, published_on: "2026-11-07" },
      editorA,
      db,
    ),
    /AUDIT_FAILED/,
  );

  // Submission fails and status remains draft
  await assert.rejects(
    submitArticleForReview("art-fail", editorA, db),
    /AUDIT_FAILED/,
  );
  assert.equal(articleStore.get("art-fail").status, "draft");
});
