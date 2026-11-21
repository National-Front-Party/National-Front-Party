import assert from "node:assert/strict";
import test from "node:test";
import {
  centerCreateSchema,
  localSecretariatCreateSchema,
  partyUnitCreateSchema,
  partyUnitPersonCreateSchema,
  partyUnitPersonUpdateSchema,
} from "./organization.js";

test("organization parent records require valid positive smallint ids and names", () => {
  assert.equal(centerCreateSchema.safeParse({ governorate_id: 1, name_ar: "مركز" }).success, true);
  assert.equal(centerCreateSchema.safeParse({ governorate_id: 0, name_ar: "مركز" }).success, false);
  assert.equal(centerCreateSchema.safeParse({ governorate_id: 32768, name_ar: "مركز" }).success, false);
  assert.equal(localSecretariatCreateSchema.safeParse({ center_id: 2, name_ar: "أمانة" }).success, true);
  assert.equal(partyUnitCreateSchema.safeParse({ secretariat_id: 3, name_ar: "وحدة" }).success, true);
});

test("party-unit people support either an active member reference or a manual name", () => {
  assert.equal(partyUnitPersonCreateSchema.safeParse({ full_name: "شخص يدوي", position_title: "أمين" }).success, true);
  assert.equal(partyUnitPersonCreateSchema.safeParse({ member_id: "4a1d1b7b-7d5f-4f30-8d5e-3f8b2e7a1a11", position_title: "أمين" }).success, true);
  assert.equal(partyUnitPersonCreateSchema.safeParse({ position_title: "أمين" }).success, false);
  assert.equal(partyUnitPersonCreateSchema.safeParse({ member_id: "4a1d1b7b-7d5f-4f30-8d5e-3f8b2e7a1a11", full_name: "اسم مختلف", position_title: "أمين" }).success, false);
});

test("unlinking a member requires a manual name", () => {
  assert.equal(partyUnitPersonUpdateSchema.safeParse({ member_id: null, full_name: "اسم يدوي" }).success, true);
  assert.equal(partyUnitPersonUpdateSchema.safeParse({ member_id: null }).success, false);
});

test("organization updates, status changes, and hard deletes require explicit valid payloads", async () => {
  const { centerUpdateSchema, organizationDeleteSchema, organizationStatusSchema } = await import("./organization.js");
  assert.equal(centerUpdateSchema.safeParse({ name_ar: "اسم جديد" }).success, true);
  assert.equal(centerUpdateSchema.safeParse({}).success, false);
  assert.equal(organizationStatusSchema.safeParse({ is_active: false }).success, true);
  assert.equal(organizationStatusSchema.safeParse({ is_published: false }).success, false);
  assert.equal(organizationDeleteSchema.safeParse({ confirm: true }).success, true);
  assert.equal(organizationDeleteSchema.safeParse({ confirm: false }).success, false);
});
