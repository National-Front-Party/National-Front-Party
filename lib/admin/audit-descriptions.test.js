import assert from "node:assert/strict";
import test from "node:test";
import { getOperationDescription } from "./audit-descriptions.js";

const actionTypes = [
  "staff_created",
  "staff_profile_updated",
  "staff_role_changed",
  "staff_activated",
  "staff_deactivated",
  "staff_password_reset",
  "content_created",
  "content_updated",
  "content_published",
  "content_unpublished",
  "content_deleted",
];

test("all persisted operation types produce useful Arabic descriptions", () => {
  for (const action_type of actionTypes) {
    const description = getOperationDescription({
      action_type,
      target_name: "اسم تجريبي",
      details: { entity_type: "news_article", new_role: "news_editor" },
    });
    assert.equal(typeof description, "string", action_type);
    assert.ok(description.length > 20, action_type);
    assert.ok(description.includes("اسم تجريبي"), action_type);
    assert.ok(!description.includes(action_type), action_type);
  }
});

test("staff descriptions explain account, role, and password effects from available data", () => {
  assert.match(
    getOperationDescription({ action_type: "staff_deactivated", target_name: "منى" }),
    /أصبح الحساب غير نشط ولن يتمكن من تسجيل الدخول/,
  );
  assert.match(
    getOperationDescription({ action_type: "staff_activated", target_name: "منى" }),
    /أصبحت حالة الحساب نشطة في النظام/,
  );
  assert.match(
    getOperationDescription({
      action_type: "staff_role_changed",
      target_name: "منى",
      details: { previous_role: "news_editor", new_role: "news_reviewer" },
    }),
    /محرر الأخبار إلى مراجع الأخبار/,
  );
  assert.match(
    getOperationDescription({ action_type: "staff_password_reset", target_name: "منى", details: {} }),
    /سيُطلب منه تغييرها عند تسجيل الدخول التالي/,
  );
});

test("content descriptions use friendly entity labels and describe publication effects", () => {
  const published = getOperationDescription({
    action_type: "content_published",
    target_name: "عنوان الخبر",
    details: { entity_type: "news_article", entity_id: "internal-123" },
  });
  assert.match(published, /تم نشر الخبر «عنوان الخبر»/);
  assert.match(published, /متاحًا للزوار على الموقع/);
  assert.doesNotMatch(published, /internal-123/);

  const unpublished = getOperationDescription({
    action_type: "content_unpublished",
    target_name: "عنوان الخبر",
    details: { entity_type: "news_article" },
  });
  assert.match(unpublished, /لن يظهر ضمن المحتوى المنشور الذي يعرضه الموقع/);

  const updated = getOperationDescription({
    action_type: "content_updated",
    target_name: "أحمد",
    details: { entity_type: "leader", changed_fields: ["full_name", "password_hash"], new_is_published: false },
  });
  assert.match(updated, /تحديث بيانات القيادي «أحمد»/);
  assert.match(updated, /حالة النشر الآن غير منشورة/);
  assert.doesNotMatch(updated, /full_name|password_hash|changed_fields/);
});

test("missing and unknown values fall back safely without exposing technical keys", () => {
  for (const record of [
    null,
    { action_type: "content_created", details: null },
    { action_type: "future_internal_action", target_name: "عنصر" },
    { action_type: "future_internal_action", details: [] },
  ]) {
    const description = getOperationDescription(record);
    assert.ok(description.length > 0);
    assert.doesNotMatch(description, /future_internal_action|undefined|null/);
  }

  for (const action_type of actionTypes) {
    const description = getOperationDescription({ action_type });
    assert.ok(description.length > 0, action_type);
    assert.ok(!description.includes(action_type), action_type);
  }
});

test("deleted central secretariat description includes only the useful cascade result", () => {
  const description = getOperationDescription({
    action_type: "content_deleted",
    target_name: "أمانة الشباب",
    details: { entity_type: "central_secretariat", cascade_deleted_people_count: 3 },
  });
  assert.match(description, /حذف 3 من الأعضاء المرتبطين بها/);
});
