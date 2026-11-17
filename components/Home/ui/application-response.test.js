import assert from "node:assert/strict";
import test from "node:test";
import { mapApplicationResponse } from "./application-response.js";

test("maps successful API responses to the application number", () => {
  assert.deepEqual(
    mapApplicationResponse({
      status: 201,
      body: { application_no: "20260042" },
    }),
    { kind: "success", applicationNo: "20260042" },
  );
});

test("maps backend validation issues to form field names", () => {
  assert.deepEqual(
    mapApplicationResponse({
      status: 400,
      body: {
        error: "VALIDATION",
        issues: {
          full_name: ["الاسم لازم يكون رباعي"],
          national_id: ["الرقم القومي غير صحيح"],
          ignored: ["do not expose this field"],
        },
      },
    }),
    {
      kind: "error",
      errors: {
        fullName: "الاسم لازم يكون رباعي",
        nationalId: "الرقم القومي غير صحيح",
      },
    },
  );
});

test("maps business errors, duplicate requests, and rounded retry time", () => {
  assert.deepEqual(
    mapApplicationResponse({
      status: 400,
      body: { error: "INVALID_NATIONAL_ID" },
    }),
    {
      kind: "error",
      errors: { nationalId: "الرقم القومي غير صحيح" },
    },
  );
  assert.deepEqual(
    mapApplicationResponse({
      status: 400,
      body: { error: "INVALID_GOVERNORATE" },
    }),
    {
      kind: "error",
      errors: {
        governorate: "المحافظة غير صحيحة، اختر محافظة من القائمة",
      },
    },
  );
  assert.deepEqual(
    mapApplicationResponse({
      status: 409,
      body: { error: "DUPLICATE" },
    }),
    {
      kind: "error",
      message: "تم استلام طلب سابق بنفس الرقم القومي",
    },
  );
  assert.deepEqual(
    mapApplicationResponse({
      status: 429,
      body: { error: "RATE_LIMITED" },
      retryAfter: "61",
    }),
    {
      kind: "error",
      message: "محاولات كثيرة، حاول مرة أخرى بعد 2 دقيقة",
    },
  );
});

test("uses a generic message for unexpected or malformed responses", () => {
  assert.deepEqual(
    mapApplicationResponse({
      status: 500,
      body: { error: "SERVER_ERROR" },
    }),
    {
      kind: "error",
      message: "حدث خطأ، حاول مرة أخرى لاحقا",
    },
  );
});
