import assert from "node:assert/strict";
import test from "node:test";
import {
  auditLogQuerySchema,
  staffCreateSchema,
  staffListQuerySchema,
  staffResetPasswordSchema,
  staffStatusSchema,
  staffUpdateSchema,
} from "./staff.js";

const validCreate = {
  full_name: "Test Staff",
  email: " STAFF@example.test ",
  role: "news_editor",
  temporary_password: "NewPassword123",
};

test("staff create validates roles/password and normalizes email", () => {
  const parsed = staffCreateSchema.parse(validCreate);
  assert.equal(parsed.email, "staff@example.test");
  for (const role of ["unknown", "membership_officer", "service_officer", "content_editor"]) {
    assert.equal(staffCreateSchema.safeParse({ ...validCreate, role }).success, false);
  }
  assert.equal(staffCreateSchema.safeParse({ ...validCreate, temporary_password: "weak" }).success, false);
  assert.equal(staffCreateSchema.safeParse({ ...validCreate, extra: true }).success, false);
});

test("staff update and status require allowed non-empty values", () => {
  assert.equal(staffUpdateSchema.safeParse({}).success, false);
  assert.equal(staffUpdateSchema.safeParse({ email: "NEW@example.test" }).data.email, "new@example.test");
  for (const role of ["membership_officer", "service_officer", "content_editor"]) {
    assert.equal(staffUpdateSchema.safeParse({ role }).success, false);
  }
  assert.equal(staffUpdateSchema.safeParse({ role: "news_editor" }).success, true);
  assert.equal(staffStatusSchema.safeParse({ is_active: false }).success, true);
  assert.equal(staffStatusSchema.safeParse({ is_active: "false" }).success, false);
});

test("reset-password schema rejects weak or extra data; audit pagination is bounded", () => {
  assert.equal(staffResetPasswordSchema.safeParse({ temporary_password: "StrongPassword1" }).success, true);
  assert.equal(staffResetPasswordSchema.safeParse({ temporary_password: "StrongPassword1", hash: "x" }).success, false);
  assert.equal(auditLogQuerySchema.safeParse({ page: "2", page_size: "100" }).success, true);
  assert.equal(auditLogQuerySchema.safeParse({ page_size: "101" }).success, false);
});

test("staff and audit pagination accept page 10,000 and reject larger values", () => {
  for (const schema of [staffListQuerySchema, auditLogQuerySchema]) {
    assert.equal(schema.safeParse({ page: "10000" }).success, true);
    assert.equal(schema.safeParse({ page: "10001" }).success, false);
  }
});
