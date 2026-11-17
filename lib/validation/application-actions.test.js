import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationAssignmentSchema,
  applicationInternalNoteSchema,
  applicationStatusActionSchema,
} from "./application-actions.js";

test("status action schema accepts only the approved transition targets", () => {
  assert.equal(applicationStatusActionSchema.safeParse({ status: "under_review" }).success, true);
  assert.equal(applicationStatusActionSchema.safeParse({ status: "accepted" }).success, true);
  assert.equal(applicationStatusActionSchema.safeParse({ status: "rejected", rejection_reason: "Incomplete" }).success, true);
  assert.equal(applicationStatusActionSchema.safeParse({ status: "rejected", rejection_reason: "  " }).success, false);
  assert.equal(applicationStatusActionSchema.safeParse({ status: "rejected", rejection_reason: "x".repeat(1001) }).success, false);
  assert.equal(applicationStatusActionSchema.safeParse({ status: "new" }).success, false);
  assert.equal(applicationStatusActionSchema.safeParse({ status: "accepted", rejection_reason: "extra" }).success, false);
});

test("internal note is trimmed, required, and capped at 1000 characters", () => {
  assert.equal(applicationInternalNoteSchema.parse({ note: "  New note  " }).note, "New note");
  assert.equal(applicationInternalNoteSchema.safeParse({ note: "  " }).success, false);
  assert.equal(applicationInternalNoteSchema.safeParse({ note: "x".repeat(1001) }).success, false);
  assert.equal(applicationInternalNoteSchema.safeParse({ note: "ok", extra: true }).success, false);
});

test("assignment accepts a valid UUID or null and rejects malformed IDs", () => {
  assert.equal(applicationAssignmentSchema.safeParse({ assigned_to: "11111111-1111-4111-8111-111111111111" }).success, true);
  assert.equal(applicationAssignmentSchema.safeParse({ assigned_to: null }).success, true);
  assert.equal(applicationAssignmentSchema.safeParse({ assigned_to: "not-a-uuid" }).success, false);
  assert.equal(applicationAssignmentSchema.safeParse({}).success, false);
});
