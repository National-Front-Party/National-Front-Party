import assert from "node:assert/strict";
import test from "node:test";
import {
  formatArabicDateDisplay,
  formatArabicNewsMeta,
  formatDateYMD,
  mapArticleToPublicDetail,
  mapArticleToPublicItem,
  splitArticleParagraphs,
} from "./formatting.js";
import {
  getArticlePublicBySlug,
  listArticlesPublic,
} from "../services/news-articles.js";
import { createPublicNewsHandlers } from "./handlers/public.js";

function req(url, { ip = "127.0.0.1" } = {}) {
  const headers = new Headers({
    "x-forwarded-for": ip,
  });
  return new Request(url, {
    method: "GET",
    headers,
  });
}

const mockPublishedArticle = {
  id: "aaaaaaaa-1111-4111-8111-111111111111",
  slug: "انطلاق-اكبر-ملتقى-توظيفي-للحزب-بمدينة-السادات",
  title: "انطلاق أكبر ملتقى توظيفي للحزب بمدينة السادات في المنوفية",
  body: "أقيم الملتقى السبت 7 نوفمبر بمدينة السادات بمشاركة أكثر من 40 شركة ومصنعا.\n\nوقد وفر الملتقى أكثر من 4500 فرصة عمل للشباب.",
  image_url: "/news1.jpg",
  image_alt: "صورة الملتقى",
  published_on: new Date("2026-11-07T00:00:00.000Z"),
  date_precision: "day",
  is_featured: true,
  sort_order: 1,
  source_url: "https://www.youm7.com/7609227",
  source: {
    id: 1,
    name_ar: "اليوم السابع",
    slug: "youm7",
    is_active: false, // Inactive source: must NOT hide published article!
  },
};

// ==========================================
// 1. Formatting Helpers Unit Tests
// ==========================================

test("splitArticleParagraphs handles newlines and filters whitespace cleanly", () => {
  const text = "  الفقرة الأولى هنا.\n\n  \n\nالفقرة الثانية هنا.\r\n\r\nالفقرة الثالثة.  ";
  const result = splitArticleParagraphs(text);
  assert.deepEqual(result, [
    "الفقرة الأولى هنا.",
    "الفقرة الثانية هنا.",
    "الفقرة الثالثة.",
  ]);

  assert.deepEqual(splitArticleParagraphs("فقرة واحدة"), ["فقرة واحدة"]);
  assert.deepEqual(splitArticleParagraphs(""), []);
  assert.deepEqual(splitArticleParagraphs(null), []);
});

test("formatDateYMD formats dates as YYYY-MM-DD", () => {
  assert.equal(formatDateYMD("2026-11-07"), "2026-11-07");
  assert.equal(formatDateYMD(new Date("2026-09-02T00:00:00.000Z")), "2026-09-02");
  assert.equal(formatDateYMD(null), "");
});

test("formatArabicDateDisplay formats day and month precision deterministically", () => {
  // Day precision omits year
  assert.equal(formatArabicDateDisplay("2026-11-07", "day"), "7 نوفمبر");
  assert.equal(formatArabicDateDisplay("2026-09-02", "day"), "2 سبتمبر");

  // Month precision includes year
  assert.equal(formatArabicDateDisplay("2026-11-01", "month"), "نوفمبر 2026");
  assert.equal(formatArabicDateDisplay("2026-01-15", "month"), "يناير 2026");

  // Invalid date
  assert.equal(formatArabicDateDisplay("invalid-date", "day"), "");
});

test("formatArabicNewsMeta formats meta string with source name", () => {
  // Day precision
  assert.equal(
    formatArabicNewsMeta("2026-11-07", "day", "اليوم السابع"),
    "7 نوفمبر · اليوم السابع",
  );
  // Month precision
  assert.equal(
    formatArabicNewsMeta("2026-11-01", "month", "صفحة الحزب"),
    "نوفمبر 2026 · صفحة الحزب",
  );
  // Without source name
  assert.equal(formatArabicNewsMeta("2026-11-07", "day", ""), "7 نوفمبر");
});

test("mapArticleToPublicItem and mapArticleToPublicDetail produce expected public shape", () => {
  const item = mapArticleToPublicItem(mockPublishedArticle);
  assert.equal(item.id, mockPublishedArticle.id);
  assert.equal(item.slug, mockPublishedArticle.slug);
  assert.equal(item.title, mockPublishedArticle.title);
  assert.equal(item.published_on, "2026-11-07");
  assert.equal(item.formatted_date, "7 نوفمبر");
  assert.equal(item.meta, "7 نوفمبر · اليوم السابع");
  assert.equal(item.is_featured, true);
  assert.equal(item.source.name_ar, "اليوم السابع");
  assert.equal(item.body, undefined); // List item excludes body!

  const detail = mapArticleToPublicDetail(mockPublishedArticle);
  assert.equal(detail.body, mockPublishedArticle.body);
  assert.deepEqual(detail.paragraphs, [
    "أقيم الملتقى السبت 7 نوفمبر بمدينة السادات بمشاركة أكثر من 40 شركة ومصنعا.",
    "وقد وفر الملتقى أكثر من 4500 فرصة عمل للشباب.",
  ]);
  assert.equal(detail.source_url, "https://www.youm7.com/7609227");
  assert.equal(detail.link_label, "التفاصيل من المصدر");
});

// ==========================================
// 2. Public Services Tests
// ==========================================

test("listArticlesPublic queries published articles with ordering, pagination, and no source-active filter", async () => {
  let capturedQuery = null;
  const fakeDb = {
    news_articles: {
      findMany: async (args) => {
        capturedQuery = args;
        return [mockPublishedArticle];
      },
      count: async () => 1,
    },
  };

  const result = await listArticlesPublic({ page: 2, page_size: 10, featured: true, source: "youm7" }, fakeDb);
  assert.equal(result.ok, true);
  assert.equal(result.data.items.length, 1);
  assert.equal(result.data.pagination.page, 2);
  assert.equal(result.data.pagination.page_size, 10);
  assert.equal(result.data.pagination.total, 1);

  // Verify where conditions
  assert.equal(capturedQuery.where.status, "published");
  assert.equal(capturedQuery.where.is_published, true);
  assert.equal(capturedQuery.where.is_featured, true);
  assert.equal(capturedQuery.where.source.slug, "youm7");
  assert.equal(capturedQuery.where.source.is_active, undefined); // Inactive source must NOT be filtered!

  // Verify pagination skip/take
  assert.equal(capturedQuery.skip, 10);
  assert.equal(capturedQuery.take, 10);

  // Verify deterministic ordering
  assert.deepEqual(capturedQuery.orderBy, [
    { is_featured: "desc" },
    { published_on: "desc" },
    { sort_order: "asc" },
    { id: "desc" },
  ]);
});

test("getArticlePublicBySlug returns published article and rejects unpublished/draft", async () => {
  const fakeDb = {
    news_articles: {
      findFirst: async ({ where }) => {
        // Enforces status = 'published' AND is_published = true
        if (where.slug === "published-slug" && where.status === "published" && where.is_published === true) {
          return mockPublishedArticle;
        }
        return null;
      },
    },
  };

  // Published article
  const resSuccess = await getArticlePublicBySlug("published-slug", fakeDb);
  assert.equal(resSuccess.ok, true);
  assert.equal(resSuccess.data.slug, mockPublishedArticle.slug);
  assert.equal(resSuccess.data.paragraphs.length, 2);

  // Non-existent or unpublished article
  const resMissing = await getArticlePublicBySlug("draft-slug", fakeDb);
  assert.equal(resMissing.ok, false);
  assert.equal(resMissing.code, "NOT_FOUND");

  // Empty slug
  const resEmpty = await getArticlePublicBySlug("", fakeDb);
  assert.equal(resEmpty.ok, false);
  assert.equal(resEmpty.code, "NOT_FOUND");
});

// ==========================================
// 3. Public Handlers & HTTP Behavior Tests
// ==========================================

test("GET /api/content/news returns 200 with cache headers and approved data contract", async () => {
  const handlers = createPublicNewsHandlers({
    listFn: async () => ({
      ok: true,
      data: {
        items: [mapArticleToPublicItem(mockPublishedArticle)],
        pagination: { page: 1, page_size: 12, total: 1, total_pages: 1 },
      },
    }),
  });

  const response = await handlers.list(req("http://localhost:3000/api/content/news?page=1&page_size=12"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "public, s-maxage=120, stale-while-revalidate=300");

  const json = await response.json();
  assert.ok(Array.isArray(json.news));
  assert.equal(json.news.length, 1);
  assert.equal(json.pagination.total, 1);

  // Explicit assertions for all required article fields
  const first = json.news[0];
  assert.equal(first.id, mockPublishedArticle.id);
  assert.equal(first.slug, mockPublishedArticle.slug);
  assert.equal(first.title, mockPublishedArticle.title);
  assert.equal(first.image_url, mockPublishedArticle.image_url);
  assert.equal(first.image_alt, mockPublishedArticle.image_alt);
  assert.equal(first.published_on, "2026-11-07");
  assert.equal(first.date_precision, "day");
  assert.equal(first.formatted_date, "7 نوفمبر");
  assert.equal(first.meta, "7 نوفمبر · اليوم السابع");
  assert.equal(first.is_featured, true);

  // Explicit assertions for source contract
  assert.ok(first.source);
  assert.equal(first.source.id, mockPublishedArticle.source.id);
  assert.equal(first.source.name_ar, mockPublishedArticle.source.name_ar);
  assert.equal(first.source.slug, mockPublishedArticle.source.slug);

  // Security: ensure no internal fields are present
  assert.equal(first.created_by, undefined);
  assert.equal(first.reviewed_by, undefined);
  assert.equal(first.reviewed_at, undefined);
  assert.equal(first.review_note, undefined);
  assert.equal(first.updated_by, undefined);
  assert.equal(first.status, undefined);
});

test("GET /api/content/news supports featured=false filter", async () => {
  let capturedQuery = null;
  const nonFeaturedArticle = {
    ...mockPublishedArticle,
    id: "bbbbbbbb-2222-4222-8222-222222222222",
    slug: "non-featured-article",
    is_featured: false,
  };

  const handlers = createPublicNewsHandlers({
    listFn: async (query) => {
      capturedQuery = query;
      return {
        ok: true,
        data: {
          items: [mapArticleToPublicItem(nonFeaturedArticle)],
          pagination: { page: 1, page_size: 12, total: 1, total_pages: 1 },
        },
      };
    },
  });

  const response = await handlers.list(
    req("http://localhost:3000/api/content/news?featured=false"),
  );
  assert.equal(response.status, 200);
  assert.equal(capturedQuery.featured, false);

  const json = await response.json();
  assert.ok(Array.isArray(json.news));
  assert.equal(json.news.length, 1);
  assert.equal(json.news[0].is_featured, false);
});

test("GET /api/content/news rejects invalid query parameters with 400 and no-store", async () => {
  const handlers = createPublicNewsHandlers();

  // Invalid page_size (> 50)
  const res1 = await handlers.list(req("http://localhost:3000/api/content/news?page_size=100"));
  assert.equal(res1.status, 400);
  assert.equal((await res1.json()).error, "VALIDATION");
  assert.equal(res1.headers.get("Cache-Control"), "no-store");

  // Unknown query parameter
  const res2 = await handlers.list(req("http://localhost:3000/api/content/news?unknown_param=123"));
  assert.equal(res2.status, 400);
  assert.equal((await res2.json()).error, "VALIDATION");

  // Duplicate query parameters
  const res3 = await handlers.list(req("http://localhost:3000/api/content/news?page=1&page=2"));
  assert.equal(res3.status, 400);
  assert.equal((await res3.json()).error, "VALIDATION");
});

test("GET /api/content/news/[slug] returns 200 for published article and handles URL-encoded slugs", async () => {
  const handlers = createPublicNewsHandlers({
    getFn: async (slug) => {
      if (slug === mockPublishedArticle.slug) {
        return { ok: true, data: mapArticleToPublicDetail(mockPublishedArticle) };
      }
      return { ok: false, code: "NOT_FOUND" };
    },
  });

  // Arabic encoded slug
  const encodedSlug = encodeURIComponent(mockPublishedArticle.slug);
  const response = await handlers.get(
    req(`http://localhost:3000/api/content/news/${encodedSlug}`),
    { params: Promise.resolve({ slug: encodedSlug }) },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "public, s-maxage=120, stale-while-revalidate=300");

  const json = await response.json();
  assert.ok(json.article);
  assert.equal(json.article.slug, mockPublishedArticle.slug);
  assert.equal(json.article.body, mockPublishedArticle.body);
  assert.equal(json.article.paragraphs.length, 2);
  assert.equal(json.article.link_label, "التفاصيل من المصدر");

  // Security: ensure no internal fields are present
  assert.equal(json.article.review_note, undefined);
  assert.equal(json.article.reviewed_by, undefined);
  assert.equal(json.article.created_by, undefined);
});

test("GET /api/content/news/[slug] returns 404 with no-store on missing or unpublished article", async () => {
  const handlers = createPublicNewsHandlers({
    getFn: async () => ({ ok: false, code: "NOT_FOUND" }),
  });

  const response = await handlers.get(
    req("http://localhost:3000/api/content/news/unpublished-article"),
    { params: Promise.resolve({ slug: "unpublished-article" }) },
  );

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "NOT_FOUND");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("Public news handlers enforce rate limiting with 429, Retry-After and no-store", async () => {
  const rateLimiter = () => ({ allowed: false, retryAfterSeconds: 45 });
  const handlers = createPublicNewsHandlers({ rateLimiter });

  // List endpoint
  const resList = await handlers.list(req("http://localhost:3000/api/content/news"));
  assert.equal(resList.status, 429);
  assert.equal((await resList.json()).error, "RATE_LIMITED");
  assert.equal(resList.headers.get("Retry-After"), "45");
  assert.equal(resList.headers.get("Cache-Control"), "no-store");

  // Detail endpoint
  const resDetail = await handlers.get(
    req("http://localhost:3000/api/content/news/any-slug"),
    { params: Promise.resolve({ slug: "any-slug" }) },
  );
  assert.equal(resDetail.status, 429);
  assert.equal((await resDetail.json()).error, "RATE_LIMITED");
  assert.equal(resDetail.headers.get("Retry-After"), "45");
});

test("Public news handlers return 500 with no-store and no leaked internals on service error", async () => {
  // Test 1: listFn throws an internal exception
  const handlersThrowingList = createPublicNewsHandlers({
    listFn: async () => {
      throw new Error("Sensitive database connection details");
    },
  });

  const resList = await handlersThrowingList.list(req("http://localhost:3000/api/content/news"));
  assert.equal(resList.status, 500);
  assert.equal(resList.headers.get("Cache-Control"), "no-store");
  const jsonList = await resList.json();
  assert.deepEqual(jsonList, { error: "SERVER_ERROR" });
  assert.equal(jsonList.message, undefined);
  assert.equal(jsonList.stack, undefined);

  // Test 2: listFn returns ok: false
  const handlersFailedList = createPublicNewsHandlers({
    listFn: async () => ({ ok: false, code: "INTERNAL_ERROR" }),
  });
  const resListFailed = await handlersFailedList.list(req("http://localhost:3000/api/content/news"));
  assert.equal(resListFailed.status, 500);
  assert.equal(resListFailed.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await resListFailed.json(), { error: "SERVER_ERROR" });

  // Test 3: getFn throws an internal exception
  const handlersThrowingGet = createPublicNewsHandlers({
    getFn: async () => {
      throw new Error("Sensitive query failure in getArticlePublicBySlug");
    },
  });
  const resDetail = await handlersThrowingGet.get(
    req("http://localhost:3000/api/content/news/some-slug"),
    { params: Promise.resolve({ slug: "some-slug" }) },
  );
  assert.equal(resDetail.status, 500);
  assert.equal(resDetail.headers.get("Cache-Control"), "no-store");
  const jsonDetail = await resDetail.json();
  assert.deepEqual(jsonDetail, { error: "SERVER_ERROR" });
  assert.equal(jsonDetail.message, undefined);
  assert.equal(jsonDetail.stack, undefined);
});

test("Public route files export GET handler function", async () => {
  const listRoute = await import("../../app/api/content/news/route.js");
  assert.equal(typeof listRoute.GET, "function");

  const detailRoute = await import("../../app/api/content/news/[slug]/route.js");
  assert.equal(typeof detailRoute.GET, "function");
});
