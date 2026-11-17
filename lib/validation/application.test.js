import assert from "node:assert/strict";
import test from "node:test";
import { applicationSchema } from "./application.js";

function validApplication(overrides = {}) {
  return {
    type: "member",
    full_name: "محمد علي أحمد حسن",
    phone: "01012345678",
    national_id: "30001010012330",
    governorate_id: "1",
    terms_accepted: true,
    ...overrides,
  };
}

test("normalizes Arabic-Indic phone and national ID digits", () => {
  const result = applicationSchema.safeParse(
    validApplication({
      phone: "٠١٠١٢٣٤٥٦٧٨",
      national_id: "٣٠٠٠١٠١٠٠١٢٣٣٠",
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.data.phone, "01012345678");
  assert.equal(result.data.national_id, "30001010012330");
  assert.equal(result.data.governorate_id, 1);
});

test("rejects a name with fewer than four words", () => {
  const result = applicationSchema.safeParse(
    validApplication({ full_name: "محمد علي أحمد" }),
  );

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some(
      (issue) =>
        issue.path[0] === "full_name" &&
        issue.message === "الاسم لازم يكون رباعي",
    ),
  );
});

test("rejects an invalid mobile number with the required message", () => {
  const result = applicationSchema.safeParse(
    validApplication({ phone: "02012345678" }),
  );

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some(
      (issue) =>
        issue.path[0] === "phone" &&
        issue.message === "رقم الموبايل غير صحيح",
    ),
  );
});

test("requires terms_accepted to be true", () => {
  const result = applicationSchema.safeParse(
    validApplication({ terms_accepted: false }),
  );

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some(
      (issue) =>
        issue.path[0] === "terms_accepted" &&
        issue.message === "لازم توافق على الشروط",
    ),
  );
});

test("rejects unknown fields", () => {
  const result = applicationSchema.safeParse(
    validApplication({ unexpected_field: "value" }),
  );

  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) => issue.code === "unrecognized_keys"),
  );
});
