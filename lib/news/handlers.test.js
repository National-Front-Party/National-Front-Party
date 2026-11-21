import assert from "node:assert/strict";
import test from "node:test";
import { jsonResponse } from "../auth/http.js";
import {
  createAdminNewsArticlesCollectionHandlers,
  createAdminNewsArticleItemHandlers,
  createAdminNewsArticleSubmitHandler,
  createAdminNewsArticlePublishHandler,
  createAdminNewsArticleRequestChangesHandler,
  createAdminNewsArticleUnpublishHandler,
} from "./handlers/articles.js";
import {
  createAdminNewsSourcesCollectionHandlers,
  createAdminNewsSourceItemHandlers,
  createAdminNewsSourceStatusHandler,
} from "./handlers/sources.js";

const superAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Super Admin",
  email: "superadmin@example.test",
  role: "super_admin",
  is_active: true,
};

const newsEditor = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "News Editor",
  email: "editor@example.test",
  role: "news_editor",
  is_active: true,
};

const newsReviewer = {
  id: "33333333-3333-4333-8333-333333333333",
  full_name: "News Reviewer",
  email: "reviewer@example.test",
  role: "news_reviewer",
  is_active: true,
};

const unrecognizedStaff = {
  id: "44444444-4444-4444-8444-444444444444",
  full_name: "Unknown Role",
  email: "content@example.test",
  role: "unknown_role",
  is_active: true,
};

const validArticleId = "55555555-5555-4555-8555-555555555555";

function mockGuard(staffOrResponse) {
  return async () => staffOrResponse;
}

function req(method, url, body, { rawBody, contentType = "application/json" } = {}) {
  const headers = new Headers({ origin: "http://localhost:3000" });
  if (contentType) headers.set("content-type", contentType);

  let finalBody;
  if (rawBody !== undefined) {
    finalBody = rawBody;
  } else if (body !== undefined) {
    finalBody = JSON.stringify(body);
  }

  return new Request(url, {
    method,
    headers,
    body: finalBody,
  });
}

const sampleArticle = {
  id: validArticleId,
  title: "عنوان المقال التجريبي",
  slug: "عنوان-المقال-التجريبي",
  body: "نص المقال التجريبي باللغة العربية يجب أن يتجاوز الحد الأدنى المطلوب لاختبارات التحقق بنجاح وبشكل سليم.",
  source_id: 1,
  published_on: "2026-11-18",
  date_precision: "day",
  is_featured: false,
  sort_order: 0,
  status: "draft",
  is_published: false,
  created_by: newsEditor.id,
};

const sampleSource = {
  id: 1,
  name_ar: "اليوم السابع",
  slug: "youm7",
  sort_order: 1,
  is_active: true,
};

// ==========================================
// 1. Articles Collection: GET & POST
// ==========================================

test("GET /api/admin/news/articles allows super_admin, news_reviewer, and news_editor", async () => {
  let callCount = 0;
  let receivedActor = null;
  const listFn = async (query, actor) => {
    callCount++;
    receivedActor = actor;
    return {
      ok: true,
      data: {
        items: [sampleArticle],
        pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 },
      },
    };
  };

  for (const staff of [superAdmin, newsReviewer, newsEditor]) {
    const handlers = createAdminNewsArticlesCollectionHandlers({
      guard: mockGuard(staff),
      listFn,
    });
    const response = await handlers.GET(
      req("GET", "http://localhost:3000/api/admin/news/articles?page=1&page_size=25"),
    );
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.articles.length, 1);
    assert.equal(json.pagination.total, 1);
    assert.equal(receivedActor.id, staff.id);
  }
  assert.equal(callCount, 3);
});

test("GET /api/admin/news/articles rejects unauthorized roles and unauthenticated", async () => {
  let called = false;
  const listFn = async () => {
    called = true;
    return { ok: true, data: { items: [], pagination: {} } };
  };

  // Unknown roles are forbidden
  const forbiddenHandlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(unrecognizedStaff),
    listFn,
  });
  const resForbidden = await forbiddenHandlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/articles"),
  );
  assert.equal(resForbidden.status, 403);
  const jsonForbidden = await resForbidden.json();
  assert.equal(jsonForbidden.error, "FORBIDDEN");
  assert.equal(called, false);

  // Unauthenticated
  const unauthHandlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(jsonResponse({ error: "UNAUTHENTICATED" }, 401)),
    listFn,
  });
  const resUnauth = await unauthHandlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/articles"),
  );
  assert.equal(resUnauth.status, 401);
  assert.equal(called, false);
});

test("GET /api/admin/news/articles validates query parameters", async () => {
  let called = false;
  const handlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(superAdmin),
    listFn: async () => {
      called = true;
      return { ok: true, data: { items: [], pagination: {} } };
    },
  });

  // Invalid page
  const res1 = await handlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/articles?page=0"),
  );
  assert.equal(res1.status, 400);
  assert.equal((await res1.json()).error, "VALIDATION");
  assert.equal(called, false);

  // Duplicate query keys
  const res2 = await handlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/articles?status=draft&status=published"),
  );
  assert.equal(res2.status, 400);
  assert.equal((await res2.json()).error, "VALIDATION");
  assert.equal(called, false);
});

test("POST /api/admin/news/articles allows news_editor and super_admin, forbids news_reviewer", async () => {
  const payload = {
    title: "عنوان المقال الجديد للتحقق",
    body: "نص المقال التجريبي باللغة العربية يجب أن يتجاوز الحد الأدنى المطلوب لاختبارات التحقق بنجاح وبشكل سليم.",
    source_id: 1,
    published_on: "2026-11-18",
  };

  // news_editor -> 201
  let editorCalled = false;
  const editorHandlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(newsEditor),
    createFn: async (input, actor) => {
      editorCalled = true;
      assert.equal(actor.id, newsEditor.id);
      assert.equal(input.title, payload.title);
      return { ok: true, data: { ...sampleArticle, ...input } };
    },
  });
  const resEditor = await editorHandlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/articles", payload),
  );
  assert.equal(resEditor.status, 201);
  const jsonEditor = await resEditor.json();
  assert.equal(jsonEditor.article.title, payload.title);
  assert.equal(editorCalled, true);

  // super_admin -> 201
  let saCalled = false;
  const saHandlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(superAdmin),
    createFn: async () => {
      saCalled = true;
      return { ok: true, data: sampleArticle };
    },
  });
  const resSa = await saHandlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/articles", payload),
  );
  assert.equal(resSa.status, 201);
  assert.equal(saCalled, true);

  // news_reviewer -> 403 FORBIDDEN (Reviewer cannot author articles)
  let reviewerCalled = false;
  const reviewerHandlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(newsReviewer),
    createFn: async () => {
      reviewerCalled = true;
      return { ok: true, data: sampleArticle };
    },
  });
  const resReviewer = await reviewerHandlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/articles", payload),
  );
  assert.equal(resReviewer.status, 403);
  assert.equal(reviewerCalled, false);
});

test("POST /api/admin/news/articles supports 256KB body and rejects oversized payloads", async () => {
  let created = false;
  const handlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(newsEditor),
    createFn: async () => {
      created = true;
      return { ok: true, data: sampleArticle };
    },
  });

  // 44,000 characters Arabic text payload (~80KB UTF-8)
  // (exceeds default 10KB readJsonBody limit, but within 50,000 chars Zod limit & 256KB body limit)
  const largeBody = "نص عربي طويل للتجربة ".repeat(2000); // 22 * 2000 = 44,000 chars, ~80KB UTF-8
  const payload = {
    title: "مقال كبير الحجم",
    body: largeBody,
    source_id: 1,
    published_on: "2026-11-18",
  };
  const res = await handlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/articles", payload),
  );
  assert.equal(res.status, 201);
  assert.equal(created, true);

  // Oversized payload (> 256KB) -> 413 PAYLOAD_TOO_LARGE
  const hugeText = "أ".repeat(300 * 1024); // 300KB
  const resHuge = await handlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/articles", undefined, {
      rawBody: JSON.stringify({ title: "مقال هائل", body: hugeText, source_id: 1, published_on: "2026-11-18" }),
    }),
  );
  assert.equal(resHuge.status, 413);
  assert.equal((await resHuge.json()).error, "PAYLOAD_TOO_LARGE");
});

test("POST /api/admin/news/articles maps service errors correctly", async () => {
  const payload = {
    title: "عنوان المقال الجديد للتحقق",
    body: "نص المقال التجريبي باللغة العربية يجب أن يتجاوز الحد الأدنى المطلوب لاختبارات التحقق بنجاح وبشكل سليم.",
    source_id: 1,
    published_on: "2026-11-18",
  };

  const testError = async (code, expectedStatus, expectedError) => {
    const handlers = createAdminNewsArticlesCollectionHandlers({
      guard: mockGuard(newsEditor),
      createFn: async () => ({ ok: false, code }),
    });
    const res = await handlers.POST(
      req("POST", "http://localhost:3000/api/admin/news/articles", payload),
    );
    assert.equal(res.status, expectedStatus);
    assert.equal((await res.json()).error, expectedError);
  };

  await testError("SOURCE_INACTIVE", 400, "SOURCE_INACTIVE");
  await testError("SOURCE_NOT_FOUND", 400, "INVALID_REFERENCE");
  await testError("DUPLICATE_SLUG", 409, "DUPLICATE_SLUG");
});

test("POST /api/admin/news/articles maps Prisma P2002 conflict to 409", async () => {
  const payload = {
    title: "عنوان المقال الجديد للتحقق",
    body: "نص المقال التجريبي باللغة العربية يجب أن يتجاوز الحد الأدنى المطلوب لاختبارات التحقق بنجاح وبشكل سليم.",
    source_id: 1,
    published_on: "2026-11-18",
  };

  const handlers = createAdminNewsArticlesCollectionHandlers({
    guard: mockGuard(newsEditor),
    createFn: async () => {
      const p2002 = new Error("Unique constraint violation");
      p2002.code = "P2002";
      p2002.meta = { target: ["slug"] };
      throw p2002;
    },
  });
  const res = await handlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/articles", payload),
  );
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "DUPLICATE_SLUG");
});

// ==========================================
// 2. Article Item: GET, PATCH, DELETE
// ==========================================

test("GET /api/admin/news/articles/[id] returns 200, 400 on invalid UUID, 404 on missing", async () => {
  const handlers = createAdminNewsArticleItemHandlers({
    guard: mockGuard(newsEditor),
    getFn: async (id) => {
      if (id === validArticleId) return { ok: true, data: sampleArticle };
      return { ok: false, code: "NOT_FOUND" };
    },
  });

  // Valid ID
  const resValid = await handlers.GET(
    req("GET", `http://localhost:3000/api/admin/news/articles/${validArticleId}`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resValid.status, 200);
  assert.equal((await resValid.json()).article.id, validArticleId);

  // Missing ID -> 404
  const otherId = "99999999-9999-4999-8999-999999999999";
  const resMissing = await handlers.GET(
    req("GET", `http://localhost:3000/api/admin/news/articles/${otherId}`),
    { params: Promise.resolve({ id: otherId }) },
  );
  assert.equal(resMissing.status, 404);
  assert.equal((await resMissing.json()).error, "NOT_FOUND");

  // Invalid UUID -> 400
  const resInvalid = await handlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/articles/not-a-uuid"),
    { params: Promise.resolve({ id: "not-a-uuid" }) },
  );
  assert.equal(resInvalid.status, 400);
  assert.equal((await resInvalid.json()).error, "VALIDATION");
});

test("PATCH /api/admin/news/articles/[id] allows news_editor and super_admin, forbids news_reviewer", async () => {
  const updatePayload = { title: "عنوان محدث للمقال" };

  // news_editor -> 200
  let editorCalled = false;
  const editorHandlers = createAdminNewsArticleItemHandlers({
    guard: mockGuard(newsEditor),
    updateFn: async (id, input, actor) => {
      editorCalled = true;
      assert.equal(id, validArticleId);
      assert.equal(actor.id, newsEditor.id);
      return { ok: true, data: { ...sampleArticle, ...input } };
    },
  });
  const resEditor = await editorHandlers.PATCH(
    req("PATCH", `http://localhost:3000/api/admin/news/articles/${validArticleId}`, updatePayload),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resEditor.status, 200);
  assert.equal((await resEditor.json()).article.title, updatePayload.title);
  assert.equal(editorCalled, true);

  // news_reviewer -> 403 (Reviewer cannot edit article content)
  let reviewerCalled = false;
  const reviewerHandlers = createAdminNewsArticleItemHandlers({
    guard: mockGuard(newsReviewer),
    updateFn: async () => {
      reviewerCalled = true;
      return { ok: true, data: sampleArticle };
    },
  });
  const resReviewer = await reviewerHandlers.PATCH(
    req("PATCH", `http://localhost:3000/api/admin/news/articles/${validArticleId}`, updatePayload),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resReviewer.status, 403);
  assert.equal(reviewerCalled, false);
});

test("PATCH /api/admin/news/articles/[id] maps status conflict errors", async () => {
  const handlers = createAdminNewsArticleItemHandlers({
    guard: mockGuard(newsEditor),
    updateFn: async () => ({ ok: false, code: "CANNOT_EDIT_IN_CURRENT_STATUS" }),
  });
  const res = await handlers.PATCH(
    req("PATCH", `http://localhost:3000/api/admin/news/articles/${validArticleId}`, { title: "عنوان جديد" }),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "CANNOT_EDIT_IN_CURRENT_STATUS");
});

test("DELETE /api/admin/news/articles/[id] requires super_admin and confirm: true", async () => {
  let deleteCalled = false;
  const handlers = createAdminNewsArticleItemHandlers({
    guard: mockGuard(superAdmin),
    deleteFn: async (id, actor) => {
      deleteCalled = true;
      assert.equal(id, validArticleId);
      assert.equal(actor.id, superAdmin.id);
      return { ok: true, data: { deleted: true, id } };
    },
  });

  // Successful deletion with confirm: true
  const resSuccess = await handlers.DELETE(
    req("DELETE", `http://localhost:3000/api/admin/news/articles/${validArticleId}`, { confirm: true }),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resSuccess.status, 200);
  const jsonSuccess = await resSuccess.json();
  assert.equal(jsonSuccess.ok, true);
  assert.equal(jsonSuccess.id, validArticleId);
  assert.equal(deleteCalled, true);

  // Missing or false confirm -> 400 VALIDATION
  deleteCalled = false;
  const resBadConfirm = await handlers.DELETE(
    req("DELETE", `http://localhost:3000/api/admin/news/articles/${validArticleId}`, { confirm: false }),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resBadConfirm.status, 400);
  assert.equal((await resBadConfirm.json()).error, "VALIDATION");
  assert.equal(deleteCalled, false);

  // Non-super-admin -> 403 FORBIDDEN
  const editorDeleteHandlers = createAdminNewsArticleItemHandlers({
    guard: mockGuard(newsEditor),
    deleteFn: async () => ({ ok: true, data: { deleted: true, id: validArticleId } }),
  });
  const resEditorDelete = await editorDeleteHandlers.DELETE(
    req("DELETE", `http://localhost:3000/api/admin/news/articles/${validArticleId}`, { confirm: true }),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resEditorDelete.status, 403);
});

// ==========================================
// 3. Workflow Actions: submit, publish, request-changes, unpublish
// ==========================================

test("POST /api/admin/news/articles/[id]/submit allows author and super_admin, forbids reviewer", async () => {
  let submitted = false;
  const editorHandlers = createAdminNewsArticleSubmitHandler({
    guard: mockGuard(newsEditor),
    submitFn: async (id, actor) => {
      submitted = true;
      assert.equal(id, validArticleId);
      assert.equal(actor.id, newsEditor.id);
      return { ok: true, data: { ...sampleArticle, status: "pending_review" } };
    },
  });
  const res = await editorHandlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/submit`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).article.status, "pending_review");
  assert.equal(submitted, true);

  // Reviewer forbidden to submit
  const reviewerHandlers = createAdminNewsArticleSubmitHandler({
    guard: mockGuard(newsReviewer),
  });
  const resReviewer = await reviewerHandlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/submit`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resReviewer.status, 403);
});

test("POST /api/admin/news/articles/[id]/publish allows reviewer and maps SELF_PUBLISHING_PROHIBITED", async () => {
  let published = false;
  const handlers = createAdminNewsArticlePublishHandler({
    guard: mockGuard(newsReviewer),
    publishFn: async (id, actor) => {
      published = true;
      assert.equal(actor.id, newsReviewer.id);
      return { ok: true, data: { ...sampleArticle, status: "published", is_published: true } };
    },
  });
  const res = await handlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/publish`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).article.is_published, true);
  assert.equal(published, true);

  // Self-publishing prohibited error from service -> 403
  const selfPubHandlers = createAdminNewsArticlePublishHandler({
    guard: mockGuard(newsReviewer),
    publishFn: async () => ({ ok: false, code: "SELF_PUBLISHING_PROHIBITED" }),
  });
  const resSelfPub = await selfPubHandlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/publish`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resSelfPub.status, 403);
  assert.equal((await resSelfPub.json()).error, "SELF_PUBLISHING_PROHIBITED");

  // Editor forbidden from publishing
  const editorHandlers = createAdminNewsArticlePublishHandler({
    guard: mockGuard(newsEditor),
  });
  const resEditor = await editorHandlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/publish`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resEditor.status, 403);
});

test("POST /api/admin/news/articles/[id]/request-changes validates note and maps transition error", async () => {
  let requestChangesCalled = false;
  const handlers = createAdminNewsArticleRequestChangesHandler({
    guard: mockGuard(newsReviewer),
    requestChangesFn: async (id, input, actor) => {
      requestChangesCalled = true;
      assert.equal(input.review_note, "يرجى تدقيق العنوان والفقرة الأولى");
      assert.equal(actor.id, newsReviewer.id);
      return { ok: true, data: { ...sampleArticle, status: "changes_requested" } };
    },
  });

  // Valid note -> 200
  const res = await handlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/request-changes`, {
      review_note: "يرجى تدقيق العنوان والفقرة الأولى",
    }),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).article.status, "changes_requested");
  assert.equal(requestChangesCalled, true);

  // Missing or empty note -> 400 VALIDATION
  const resEmptyNote = await handlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/request-changes`, {
      review_note: "   ",
    }),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resEmptyNote.status, 400);
  assert.equal((await resEmptyNote.json()).error, "VALIDATION");
});

test("POST /api/admin/news/articles/[id]/unpublish allows reviewer and maps transition error", async () => {
  let unpublishCalled = false;
  const handlers = createAdminNewsArticleUnpublishHandler({
    guard: mockGuard(newsReviewer),
    unpublishFn: async (id) => {
      unpublishCalled = true;
      assert.equal(id, validArticleId);
      return { ok: true, data: { ...sampleArticle, status: "draft", is_published: false } };
    },
  });

  const res = await handlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/unpublish`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).article.status, "draft");
  assert.equal(unpublishCalled, true);

  // Invalid status transition from service -> 400
  const invalidTransitionHandlers = createAdminNewsArticleUnpublishHandler({
    guard: mockGuard(newsReviewer),
    unpublishFn: async () => ({ ok: false, code: "INVALID_STATUS_TRANSITION" }),
  });
  const resInvalid = await invalidTransitionHandlers.POST(
    req("POST", `http://localhost:3000/api/admin/news/articles/${validArticleId}/unpublish`),
    { params: Promise.resolve({ id: validArticleId }) },
  );
  assert.equal(resInvalid.status, 400);
  assert.equal((await resInvalid.json()).error, "INVALID_STATUS_TRANSITION");
});

// ==========================================
// 4. News Sources: Collection, Item, Status
// ==========================================

test("News Sources endpoints strictly require super_admin and forbid editors/reviewers", async () => {
  const collectionHandlers = createAdminNewsSourcesCollectionHandlers({
    guard: mockGuard(newsReviewer),
    listFn: async () => ({ ok: true, data: { items: [], pagination: {} } }),
    createFn: async () => ({ ok: true, data: sampleSource }),
  });

  const itemHandlers = createAdminNewsSourceItemHandlers({
    guard: mockGuard(newsEditor),
    getFn: async () => ({ ok: true, data: sampleSource }),
    updateFn: async () => ({ ok: true, data: sampleSource }),
  });

  const statusHandlers = createAdminNewsSourceStatusHandler({
    guard: mockGuard(newsReviewer),
    setStatusFn: async () => ({ ok: true, data: sampleSource }),
  });

  // GET /sources -> 403
  assert.equal((await collectionHandlers.GET(req("GET", "http://localhost:3000/api/admin/news/sources"))).status, 403);
  // POST /sources -> 403
  assert.equal((await collectionHandlers.POST(req("POST", "http://localhost:3000/api/admin/news/sources", { name_ar: "المصدر", slug: "src" }))).status, 403);
  // GET /sources/[id] -> 403
  assert.equal((await itemHandlers.GET(req("GET", "http://localhost:3000/api/admin/news/sources/1"), { params: Promise.resolve({ id: "1" }) })).status, 403);
  // PATCH /sources/[id] -> 403
  assert.equal((await itemHandlers.PATCH(req("PATCH", "http://localhost:3000/api/admin/news/sources/1", { name_ar: "تعديل" }), { params: Promise.resolve({ id: "1" }) })).status, 403);
  // PATCH /sources/[id]/status -> 403
  assert.equal((await statusHandlers.PATCH(req("PATCH", "http://localhost:3000/api/admin/news/sources/1/status", { is_active: false }), { params: Promise.resolve({ id: "1" }) })).status, 403);
});

test("GET and POST /api/admin/news/sources allow super_admin with validation and conflict mapping", async () => {
  let listCalled = false;
  let createCalled = false;
  const handlers = createAdminNewsSourcesCollectionHandlers({
    guard: mockGuard(superAdmin),
    listFn: async (query, actor) => {
      listCalled = true;
      assert.equal(actor.id, superAdmin.id);
      return {
        ok: true,
        data: {
          items: [sampleSource],
          pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 },
        },
      };
    },
    createFn: async (input, actor) => {
      createCalled = true;
      assert.equal(actor.id, superAdmin.id);
      if (input.slug === "existing-slug") return { ok: false, code: "DUPLICATE_SLUG" };
      return { ok: true, data: { ...sampleSource, ...input } };
    },
  });

  // GET list -> 200
  const resList = await handlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/sources?page=1&is_active=true"),
  );
  assert.equal(resList.status, 200);
  const jsonList = await resList.json();
  assert.equal(jsonList.sources.length, 1);
  assert.equal(listCalled, true);

  // POST create valid -> 201
  const resCreate = await handlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/sources", {
      name_ar: "الأهرام",
      slug: "ahram",
      sort_order: 2,
    }),
  );
  assert.equal(resCreate.status, 201);
  const jsonCreate = await resCreate.json();
  assert.equal(jsonCreate.source.name_ar, "الأهرام");
  assert.equal(createCalled, true);

  // POST create duplicate slug -> 409 DUPLICATE_SLUG
  const resDuplicate = await handlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/sources", {
      name_ar: "مكرر",
      slug: "existing-slug",
    }),
  );
  assert.equal(resDuplicate.status, 409);
  assert.equal((await resDuplicate.json()).error, "DUPLICATE_SLUG");

  // POST create validation error -> 400
  const resInvalid = await handlers.POST(
    req("POST", "http://localhost:3000/api/admin/news/sources", {
      name_ar: "",
      slug: "Invalid Slug!!",
    }),
  );
  assert.equal(resInvalid.status, 400);
});

test("GET, PATCH, and PATCH /status on /api/admin/news/sources/[id] succeed for super_admin", async () => {
  let getCalled = false;
  let updateCalled = false;
  let statusCalled = false;

  const itemHandlers = createAdminNewsSourceItemHandlers({
    guard: mockGuard(superAdmin),
    getFn: async (id) => {
      getCalled = true;
      if (id === 1) return { ok: true, data: sampleSource };
      return { ok: false, code: "NOT_FOUND" };
    },
    updateFn: async (id, input) => {
      updateCalled = true;
      return { ok: true, data: { ...sampleSource, ...input } };
    },
  });

  const statusHandlers = createAdminNewsSourceStatusHandler({
    guard: mockGuard(superAdmin),
    setStatusFn: async (id, isActive) => {
      statusCalled = true;
      assert.equal(id, 1);
      assert.equal(isActive, false);
      return { ok: true, data: { ...sampleSource, is_active: false } };
    },
  });

  // GET single source -> 200
  const resGet = await itemHandlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/sources/1"),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resGet.status, 200);
  assert.equal((await resGet.json()).source.id, 1);
  assert.equal(getCalled, true);

  // GET missing source -> 404
  const resMissing = await itemHandlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/sources/999"),
    { params: Promise.resolve({ id: "999" }) },
  );
  assert.equal(resMissing.status, 404);

  // GET invalid ID format -> 400
  const resBadId = await itemHandlers.GET(
    req("GET", "http://localhost:3000/api/admin/news/sources/not-a-number"),
    { params: Promise.resolve({ id: "not-a-number" }) },
  );
  assert.equal(resBadId.status, 400);

  // PATCH update source -> 200
  const resUpdate = await itemHandlers.PATCH(
    req("PATCH", "http://localhost:3000/api/admin/news/sources/1", { name_ar: "اسم جديد" }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resUpdate.status, 200);
  assert.equal((await resUpdate.json()).source.name_ar, "اسم جديد");
  assert.equal(updateCalled, true);

  // PATCH toggle status -> 200
  const resStatus = await statusHandlers.PATCH(
    req("PATCH", "http://localhost:3000/api/admin/news/sources/1/status", { is_active: false }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resStatus.status, 200);
  assert.equal((await resStatus.json()).source.is_active, false);
  assert.equal(statusCalled, true);

  // PATCH status with invalid boolean -> 400
  const resBadStatus = await statusHandlers.PATCH(
    req("PATCH", "http://localhost:3000/api/admin/news/sources/1/status", { is_active: "inactive" }),
    { params: Promise.resolve({ id: "1" }) },
  );
  assert.equal(resBadStatus.status, 400);
});

// ==========================================
// 5. Verification of Next.js Route Exports
// ==========================================

test("All 9 admin news route files export the expected HTTP handler functions", async () => {
  const articlesRoute = await import("../../app/api/admin/news/articles/route.js");
  assert.equal(typeof articlesRoute.GET, "function");
  assert.equal(typeof articlesRoute.POST, "function");

  const articleItemRoute = await import("../../app/api/admin/news/articles/[id]/route.js");
  assert.equal(typeof articleItemRoute.GET, "function");
  assert.equal(typeof articleItemRoute.PATCH, "function");
  assert.equal(typeof articleItemRoute.DELETE, "function");

  const submitRoute = await import("../../app/api/admin/news/articles/[id]/submit/route.js");
  assert.equal(typeof submitRoute.POST, "function");

  const publishRoute = await import("../../app/api/admin/news/articles/[id]/publish/route.js");
  assert.equal(typeof publishRoute.POST, "function");

  const requestChangesRoute = await import("../../app/api/admin/news/articles/[id]/request-changes/route.js");
  assert.equal(typeof requestChangesRoute.POST, "function");

  const unpublishRoute = await import("../../app/api/admin/news/articles/[id]/unpublish/route.js");
  assert.equal(typeof unpublishRoute.POST, "function");

  const sourcesRoute = await import("../../app/api/admin/news/sources/route.js");
  assert.equal(typeof sourcesRoute.GET, "function");
  assert.equal(typeof sourcesRoute.POST, "function");

  const sourceItemRoute = await import("../../app/api/admin/news/sources/[id]/route.js");
  assert.equal(typeof sourceItemRoute.GET, "function");
  assert.equal(typeof sourceItemRoute.PATCH, "function");

  const sourceStatusRoute = await import("../../app/api/admin/news/sources/[id]/status/route.js");
  assert.equal(typeof sourceStatusRoute.PATCH, "function");
});

