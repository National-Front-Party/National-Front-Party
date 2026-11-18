import assert from "node:assert/strict";
import test from "node:test";
import { deleteConfirmSchema } from "./common.js";
import {
  popupCreateSchema,
  popupIdSchema,
  popupListQuerySchema,
  popupStatusSchema,
  popupUpdateSchema,
} from "./popups.js";
import {
  leaderCreateSchema,
  leaderIdSchema,
  leaderListQuerySchema,
  leaderStatusSchema,
  leaderUpdateSchema,
  leadershipContentCreateSchema,
  leadershipContentIdSchema,
  leadershipContentStatusSchema,
  leadershipContentUpdateSchema,
  panelCreateSchema,
  panelIdSchema,
  panelStatusSchema,
  panelUpdateSchema,
} from "./leadership.js";
import {
  centralSecretariatCreateSchema,
  centralSecretariatIdSchema,
  centralSecretariatPersonCreateSchema,
  centralSecretariatPersonIdSchema,
  centralSecretariatPersonStatusSchema,
  centralSecretariatPersonUpdateSchema,
  centralSecretariatStatusSchema,
  centralSecretariatUpdateSchema,
} from "./central-secretariats.js";
import {
  governorateSecretariatCreateSchema,
  governorateSecretariatIdSchema,
  governorateSecretariatListQuerySchema,
  governorateSecretariatStatusSchema,
  governorateSecretariatUpdateSchema,
} from "./governorate-secretariats.js";
import {
  parliamentaryUnitCreateSchema,
  parliamentaryUnitIdSchema,
  parliamentaryUnitStatusSchema,
  parliamentaryUnitUpdateSchema,
} from "./parliamentary-unit.js";

test("popup schemas: CRUD/status/id/list validation", () => {
  assert.equal(popupIdSchema.safeParse("1").success, true);
  assert.equal(popupIdSchema.safeParse("0").success, false);
  assert.equal(popupIdSchema.safeParse("abc").success, false);
  assert.deepEqual(popupListQuerySchema.parse({}), { page: 1, page_size: 25 });

  const created = popupCreateSchema.parse({
    slug: "popup-about",
    title: "من نحن؟",
    body: "نص",
    sort_order: 2,
    is_published: false,
  });
  assert.equal(created.slug, "popup-about");
  assert.equal(created.sort_order, 2);
  assert.equal(created.is_published, false);

  assert.equal(popupCreateSchema.safeParse({ slug: "Bad Slug", title: "x" }).success, false);
  assert.equal(popupCreateSchema.safeParse({ slug: "ok-slug", title: "  " }).success, false);
  assert.equal(popupCreateSchema.safeParse({ slug: "ok-slug", title: "x", sort_order: 32768 }).success, false);

  assert.equal(popupUpdateSchema.safeParse({}).success, false);
  assert.equal(popupUpdateSchema.safeParse({ title: "جديد", sort_order: 5 }).success, true);
  assert.equal(popupUpdateSchema.safeParse({ is_published: true }).success, true);

  assert.equal(popupStatusSchema.safeParse({ is_published: true }).success, true);
  assert.equal(popupStatusSchema.safeParse({ is_published: "true" }).success, false);
  assert.equal(popupStatusSchema.safeParse({}).success, false);
});

test("leadership schemas: panels/leaders/contents and decision data", () => {
  assert.equal(panelIdSchema.safeParse("10").success, true);
  assert.equal(leaderIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success, true);
  assert.equal(leadershipContentIdSchema.safeParse("3").success, true);
  assert.equal(panelCreateSchema.safeParse({ slug: "panel-1", title: "لوحة" }).success, true);
  assert.equal(panelUpdateSchema.safeParse({}).success, false);
  assert.equal(panelStatusSchema.safeParse({ is_published: false }).success, true);

  assert.equal(leaderCreateSchema.safeParse({ panel_id: 1, full_name: "اسم" }).success, true);
  assert.equal(leaderCreateSchema.safeParse({ panel_id: 0, full_name: "اسم" }).success, false);
  assert.equal(leaderCreateSchema.safeParse({ panel_id: 1, full_name: "اسم", photo_url: "notaurl" }).success, false);
  assert.equal(leaderCreateSchema.safeParse({ panel_id: 1, full_name: "اسم", photo_url: "https://x.test/a.png" }).success, true);
  assert.equal(leaderUpdateSchema.safeParse({}).success, false);
  assert.equal(leaderStatusSchema.safeParse({ is_published: true }).success, true);
  assert.deepEqual(leaderListQuerySchema.parse({ panel_id: "2", page: "1" }), { panel_id: 2, page: 1, page_size: 25 });

  assert.equal(leadershipContentCreateSchema.parse({
    slug: "speech-1",
    button_label: "كلمة",
    title: "عنوان",
    person_name: "الاسم",
    person_role_title: "المنصب",
    body: "النص",
    decision_number: "12/2026",
    decision_date: "2026-11-18",
  }).decision_date, "2026-11-18");
  assert.equal(leadershipContentCreateSchema.parse({
    slug: "speech-2", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "",
  }).decision_date, null);
  assert.equal(leadershipContentCreateSchema.safeParse({
    slug: "speech-3", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "18-11-2026",
  }).success, false);
  // F-04: rejects impossible calendar dates
  assert.equal(leadershipContentCreateSchema.safeParse({
    slug: "speech-4", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "2026-02-31",
  }).success, false);
  assert.equal(leadershipContentCreateSchema.safeParse({
    slug: "speech-5", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "2026-13-01",
  }).success, false);
  assert.equal(leadershipContentCreateSchema.safeParse({
    slug: "speech-6", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "2026-04-31",
  }).success, false);
  assert.equal(leadershipContentCreateSchema.safeParse({
    slug: "speech-7", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "2026-02-29",
  }).success, false);
  assert.equal(leadershipContentCreateSchema.parse({
    slug: "speech-8", button_label: "ب", title: "ت", person_name: "ش", person_role_title: "م", body: "ن", decision_date: "2024-02-29",
  }).decision_date, "2024-02-29");
  assert.equal(leadershipContentCreateSchema.safeParse({ slug: "s", button_label: "ب", title: "ت" }).success, false);
  assert.equal(leadershipContentUpdateSchema.safeParse({}).success, false);
  assert.equal(leadershipContentUpdateSchema.safeParse({ decision_number: "99" }).success, true);
  assert.equal(leadershipContentStatusSchema.safeParse({ is_published: false }).success, true);
});

test("central secretariat schemas: multiple people, optional image/details, publish/delete inputs", () => {
  assert.equal(centralSecretariatIdSchema.safeParse("5").success, true);
  assert.equal(centralSecretariatPersonIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success, true);
  assert.equal(centralSecretariatCreateSchema.safeParse({ info_item_id: 1, name_ar: "أمانة" }).success, true);
  assert.equal(centralSecretariatCreateSchema.safeParse({ name_ar: "أمانة" }).success, false);
  assert.equal(centralSecretariatUpdateSchema.safeParse({}).success, false);
  assert.equal(centralSecretariatStatusSchema.safeParse({ is_published: true }).success, true);

  const person = centralSecretariatPersonCreateSchema.parse({
    full_name: "شخص",
    position_title: "منصب",
    image_url: "",
    details: "",
    sort_order: 3,
    is_published: false,
  });
  assert.equal(person.image_url, null);
  assert.equal(person.details, null);
  assert.equal(centralSecretariatPersonCreateSchema.safeParse({ full_name: "شخص", image_url: "https://cdn.test/img.jpg", details: "تفاصيل" }).success, true);
  assert.equal(centralSecretariatPersonCreateSchema.safeParse({ full_name: "شخص", image_url: "ftp://x" }).success, false);
  assert.equal(centralSecretariatPersonUpdateSchema.safeParse({}).success, false);
  assert.equal(centralSecretariatPersonUpdateSchema.safeParse({ sort_order: 1, is_published: true }).success, true);
  assert.equal(centralSecretariatPersonStatusSchema.safeParse({ is_published: false }).success, true);
});

test("governorate secretariat schemas: multi-person content and filters", () => {
  assert.equal(governorateSecretariatIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success, true);
  assert.deepEqual(governorateSecretariatListQuerySchema.parse({ governorate_id: "7" }), { page: 1, page_size: 25, governorate_id: 7 });
  assert.equal(governorateSecretariatCreateSchema.safeParse({ governorate_id: 1, full_name: "شخص" }).success, true);
  assert.equal(governorateSecretariatCreateSchema.safeParse({ full_name: "شخص" }).success, false);
  assert.equal(governorateSecretariatUpdateSchema.safeParse({}).success, false);
  assert.equal(governorateSecretariatUpdateSchema.safeParse({ role_title: "أمين", photo_url: "https://x/y.png" }).success, true);
  assert.equal(governorateSecretariatStatusSchema.safeParse({ is_published: true }).success, true);
});

test("parliamentary unit schemas and delete confirmation", () => {
  assert.equal(parliamentaryUnitIdSchema.safeParse("1").success, true);
  assert.equal(parliamentaryUnitCreateSchema.safeParse({ slug: "par-unit", title: "الوحدة" }).success, true);
  assert.equal(parliamentaryUnitCreateSchema.safeParse({ title: "الوحدة" }).success, false);
  assert.equal(parliamentaryUnitUpdateSchema.safeParse({}).success, false);
  assert.equal(parliamentaryUnitUpdateSchema.safeParse({ head_name: "اسم", sort_order: 4 }).success, true);
  assert.equal(parliamentaryUnitStatusSchema.safeParse({ is_published: false }).success, true);

  assert.equal(deleteConfirmSchema.safeParse({ confirm: true }).success, true);
  assert.equal(deleteConfirmSchema.safeParse({ confirm: false }).success, false);
  assert.equal(deleteConfirmSchema.safeParse({}).success, false);
  assert.equal(deleteConfirmSchema.safeParse({ confirm: true, extra: 1 }).success, false);
});
