import assert from "node:assert/strict";
import test from "node:test";
import { serviceRequestSchema } from "./service-request.js";

function valid(overrides = {}) {
  return {
    full_name: "مواطن تجريبي",
    phone: "01012345678",
    ministry_id: 1,
    sector_id: 2,
    ...overrides,
  };
}

test("accepts trimmed names, local Egyptian mobile formats, and integer IDs", () => {
  for (const phone of ["01012345678", "01112345678", "01212345678", "01512345678"]) {
    const parsed = serviceRequestSchema.parse(valid({ full_name: "  مواطن  ", phone, ministry_id: "12" }));
    assert.equal(parsed.full_name, "مواطن");
    assert.equal(parsed.phone, phone);
    assert.equal(parsed.ministry_id, 12);
  }
});

test("rejects international, landline, malformed, invalid-prefix, and wrong-length numbers", () => {
  for (const phone of [
    "+201012345678", "201012345678", "02012345678", "0101234567", "010123456789",
    "01312345678", " 010 12345678 ", "٠١٠١٢٣٤٥٦٧٨", "",
  ]) {
    assert.equal(serviceRequestSchema.safeParse(valid({ phone })).success, false, phone);
  }
});

test("rejects missing values, unknown fields, and invalid catalog IDs", () => {
  for (const input of [
    { phone: "01012345678", ministry_id: 1, sector_id: 2 },
    valid({ status: "published" }),
    valid({ assigned_to: "11111111-1111-4111-8111-111111111111" }),
    valid({ internal_notes: "no" }),
    valid({ ministry_id: 0 }),
    valid({ sector_id: 32_768 }),
    valid({ ministry_id: 1.5 }),
    valid({ sector_id: "1e2" }),
    valid({ ministry_id: " 1" }),
    valid({ full_name: "   " }),
    valid({ full_name: "x".repeat(201) }),
  ]) assert.equal(serviceRequestSchema.safeParse(input).success, false);
});
