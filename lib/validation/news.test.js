import assert from "node:assert/strict";
import test from "node:test";

import {
  articleCreateSchema,
  articleIdSchema,
  articleQuerySchema,
  articleSlugSchema,
  articleUpdateSchema,
  isValidCalendarDate,
  isValidPublicationDate,
  newsSourceCreateSchema,
  newsSourceQuerySchema,
  newsSourceStatusSchema,
  newsSourceUpdateSchema,
  normalizeTitleToSlug,
  requestChangesSchema,
  sourceIdSchema,
} from "./news.js";

test("news validation: calendar and publication date validation", () => {
  // Calendar rules
  assert.equal(isValidCalendarDate(2026, 2, 28), true);
  assert.equal(isValidCalendarDate(2026, 2, 29), false, "2026 is not a leap year");
  assert.equal(isValidCalendarDate(2024, 2, 29), true, "2024 is a leap year");
  assert.equal(isValidCalendarDate(2026, 4, 31), false, "April has 30 days");
  assert.equal(isValidCalendarDate(2026, 13, 1), false, "Month 13 does not exist");
  assert.equal(isValidCalendarDate(2026, 0, 1), false, "Month 0 does not exist");

  // Publication date string validation
  assert.equal(isValidPublicationDate("2026-11-07"), true);
  assert.equal(isValidPublicationDate("2026-02-29"), false);
  assert.equal(isValidPublicationDate("2026-02-31"), false);
  assert.equal(isValidPublicationDate("2026-13-01"), false);
  assert.equal(isValidPublicationDate("2026-04-31"), false);
  assert.equal(isValidPublicationDate("1899-12-31"), false, "Year before 1900 rejected");
  assert.equal(isValidPublicationDate("2101-01-01"), false, "Year after 2100 rejected");
  assert.equal(isValidPublicationDate("invalid"), false);
  assert.equal(isValidPublicationDate(null), false);
});

test("news validation: articleCreateSchema accepts valid payload and rejects invalid inputs", () => {
  const valid = {
    title: "انطلاق ملتقى التوظيف",
    body: "تفاصيل الملتقى التوظيفي للحزب بمحافظة المنوفية...",
    source_id: 1,
    source_url: "https://youm7.com/123",
    image_url: "/news1.jpg",
    image_alt: "صورة الملتقى",
    published_on: "2026-11-07",
    date_precision: "day",
    is_featured: true,
    sort_order: 1,
    slug: "employment-fair-sadat",
  };

  const parsed = articleCreateSchema.parse(valid);
  assert.equal(parsed.title, "انطلاق ملتقى التوظيف");
  assert.equal(parsed.source_id, 1);
  assert.equal(parsed.image_url, "/news1.jpg");
  assert.equal(parsed.published_on, "2026-11-07");

  // Allows absolute HTTPS URLs for images
  const parsedHttps = articleCreateSchema.parse({
    ...valid,
    image_url: "https://cdn.example.test/img.png",
  });
  assert.equal(parsedHttps.image_url, "https://cdn.example.test/img.png");

  // Rejects unknown/protected fields (strictness)
  assert.throws(
    () => articleCreateSchema.parse({ ...valid, status: "published" }),
    /unrecognized_keys/i,
  );
  assert.throws(
    () => articleCreateSchema.parse({ ...valid, id: "11111111-1111-4111-8111-111111111111" }),
    /unrecognized_keys/i,
  );
  assert.throws(
    () => articleCreateSchema.parse({ ...valid, created_by: "11111111-1111-4111-8111-111111111111" }),
    /unrecognized_keys/i,
  );
  assert.throws(
    () => articleCreateSchema.parse({ ...valid, is_published: true }),
    /unrecognized_keys/i,
  );

  // Missing required fields
  assert.throws(() => articleCreateSchema.parse({ ...valid, title: "" }), /too_small|required/i);
  assert.throws(() => articleCreateSchema.parse({ ...valid, body: "" }), /too_small|required/i);
  assert.throws(() => articleCreateSchema.parse({ ...valid, source_id: undefined }));
  assert.throws(() => articleCreateSchema.parse({ ...valid, published_on: undefined }));

  // Invalid date
  assert.throws(() => articleCreateSchema.parse({ ...valid, published_on: "2026-02-31" }));

  // Invalid URL
  assert.throws(() => articleCreateSchema.parse({ ...valid, source_url: "not-a-url" }));

  // Invalid source ID
  assert.throws(() => articleCreateSchema.parse({ ...valid, source_id: 0 }));
  assert.throws(() => articleCreateSchema.parse({ ...valid, source_id: 40_000 }));
});

test("news validation: articleUpdateSchema rejects empty updates and protected fields", () => {
  // Accepts partial updates
  const parsed = articleUpdateSchema.parse({ title: "عنوان محدث" });
  assert.equal(parsed.title, "عنوان محدث");

  // Rejects empty payload
  assert.throws(
    () => articleUpdateSchema.parse({}),
    /At least one editable field is required/i,
  );

  // Rejects status manipulation in update schema
  assert.throws(
    () => articleUpdateSchema.parse({ title: "تحديث", status: "published" }),
    /unrecognized_keys/i,
  );
  assert.throws(
    () => articleUpdateSchema.parse({ is_published: true }),
    /unrecognized_keys/i,
  );
  assert.throws(
    () => articleUpdateSchema.parse({ reviewed_by: "11111111-1111-4111-8111-111111111111" }),
    /unrecognized_keys/i,
  );
});

test("news validation: requestChangesSchema requires non-empty review_note", () => {
  assert.deepEqual(requestChangesSchema.parse({ review_note: "يرجى تعديل الفقرة الثانية" }), {
    review_note: "يرجى تعديل الفقرة الثانية",
  });

  assert.throws(() => requestChangesSchema.parse({ review_note: "" }));
  assert.throws(() => requestChangesSchema.parse({ review_note: "   " }));
  assert.throws(() => requestChangesSchema.parse({}));
  assert.throws(() => requestChangesSchema.parse({ review_note: "ملاحظة", extra: 123 }));
});

test("news validation: articleQuerySchema bounds pagination and validates filters", () => {
  const query = articleQuerySchema.parse({
    page: "2",
    page_size: "50",
    status: "pending_review",
    is_featured: "true",
    is_published: "false",
    search: "ملتقى",
    sort_by: "published_on",
    sort_dir: "asc",
  });

  assert.equal(query.page, 2);
  assert.equal(query.page_size, 50);
  assert.equal(query.status, "pending_review");
  assert.equal(query.is_featured, true);
  assert.equal(query.is_published, false);
  assert.equal(query.search, "ملتقى");
  assert.equal(query.sort_by, "published_on");
  assert.equal(query.sort_dir, "asc");

  // Bounded pagination
  assert.throws(() => articleQuerySchema.parse({ page: "10001" }));
  assert.throws(() => articleQuerySchema.parse({ page_size: "101" }));
  assert.throws(() => articleQuerySchema.parse({ page: "0" }));
  assert.throws(() => articleQuerySchema.parse({ status: "invalid_status" }));
});

test("news validation: newsSource schemas validate names, slugs, and status", () => {
  const createParsed = newsSourceCreateSchema.parse({
    name_ar: "اليوم السابع",
    slug: "youm7",
    sort_order: 1,
    is_active: true,
  });
  assert.equal(createParsed.name_ar, "اليوم السابع");
  assert.equal(createParsed.slug, "youm7");

  // Source update rejects empty
  assert.throws(() => newsSourceUpdateSchema.parse({}));
  assert.deepEqual(newsSourceUpdateSchema.parse({ name_ar: "بوابة الأهرام" }), {
    name_ar: "بوابة الأهرام",
  });

  // Source status accepts boolean
  assert.deepEqual(newsSourceStatusSchema.parse({ is_active: false }), { is_active: false });
  assert.throws(() => newsSourceStatusSchema.parse({ is_active: "not-bool" }));

  // Query validation
  assert.equal(newsSourceQuerySchema.parse({ is_active: "true" }).is_active, true);

  // IDs validation
  assert.equal(sourceIdSchema.parse("5"), 5);
  assert.equal(articleIdSchema.parse("11111111-1111-4111-8111-111111111111"), "11111111-1111-4111-8111-111111111111");
});

test("news validation: articleSlugSchema and normalizeTitleToSlug handle Arabic, Latin, and edge cases", () => {
  // normalizeTitleToSlug
  assert.equal(
    normalizeTitleToSlug("انطلاق أكبر ملتقى توظيفي للحزب بمدينة السادات!"),
    "انطلاق-أكبر-ملتقى-توظيفي-للحزب-بمدينة-السادات",
  );
  assert.equal(
    normalizeTitleToSlug("Meeting with Egypt 2026!"),
    "meeting-with-egypt-2026",
  );
  assert.equal(
    normalizeTitleToSlug("مقال حزب الجبهة (مصر 2026)"),
    "مقال-حزب-الجبهة-مصر-2026",
  );
  assert.equal(
    normalizeTitleToSlug("  مقال مع فواصل... ونقاط! "),
    "مقال-مع-فواصل-ونقاط",
  );
  assert.equal(normalizeTitleToSlug("???!!!"), "");
  assert.equal(normalizeTitleToSlug("   "), "");

  // articleSlugSchema accepts valid Arabic, Latin, mixed
  assert.equal(articleSlugSchema.parse("انطلاق-ملتقى-التوظيف"), "انطلاق-ملتقى-التوظيف");
  assert.equal(articleSlugSchema.parse("ملتقى-egypt-2026"), "ملتقى-egypt-2026");
  assert.equal(articleSlugSchema.parse("egypt-forward-2026"), "egypt-forward-2026");

  // articleSlugSchema rejects invalid formats
  assert.throws(() => articleSlugSchema.parse("انطلاق--ملتقى"), /Slug must contain/);
  assert.throws(() => articleSlugSchema.parse("-انطلاق"), /Slug must contain/);
  assert.throws(() => articleSlugSchema.parse("انطلاق-"), /Slug must contain/);
  assert.throws(() => articleSlugSchema.parse("انطلاق ملتقى"), /Slug must contain/);
  assert.throws(() => articleSlugSchema.parse("انطلاق!"), /Slug must contain/);
  assert.throws(() => articleSlugSchema.parse(""), /too_small/);

  // articleCreateSchema accepts Arabic slug
  const validWithArabicSlug = {
    title: "انطلاق ملتقى التوظيف",
    body: "تفاصيل الملتقى التوظيفي للحزب بمحافظة المنوفية...",
    source_id: 1,
    published_on: "2026-11-07",
    slug: "انطلاق-ملتقى-التوظيف",
  };
  const parsed = articleCreateSchema.parse(validWithArabicSlug);
  assert.equal(parsed.slug, "انطلاق-ملتقى-التوظيف");
});
