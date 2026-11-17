import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDigits, parseNationalId } from "./national-id.js";

function makeNationalId(year, month, day, serialDigit = 3) {
  const centuryDigit = year < 2000 ? "2" : "3";
  const yearDigits = String(year).slice(-2);
  const monthDigits = String(month).padStart(2, "0");
  const dayDigits = String(day).padStart(2, "0");

  return `${centuryDigit}${yearDigits}${monthDigits}${dayDigits}01001${serialDigit}0`;
}

test("parses a male national ID from the 1900s", () => {
  const result = parseNationalId(makeNationalId(1999, 2, 1));

  assert.ok(result);
  assert.equal(result.birthDate.toISOString(), "1999-02-01T00:00:00.000Z");
  assert.equal(result.gender, "male");
});

test("parses a female national ID from the 1900s", () => {
  const result = parseNationalId(makeNationalId(1999, 2, 1, 4));

  assert.ok(result);
  assert.equal(result.gender, "female");
});

test("parses national IDs for people born in 2000 or later", () => {
  const result = parseNationalId(makeNationalId(2000, 1, 1));

  assert.ok(result);
  assert.equal(result.birthDate.toISOString(), "2000-01-01T00:00:00.000Z");
});

test("rejects impossible months and days", () => {
  assert.equal(parseNationalId("29913010012330"), null);
  assert.equal(parseNationalId("29902310012330"), null);
});

test("rejects birth dates in the future", () => {
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  assert.equal(
    parseNationalId(
      makeNationalId(
        tomorrow.getUTCFullYear(),
        tomorrow.getUTCMonth() + 1,
        tomorrow.getUTCDate(),
      ),
    ),
    null,
  );
});

test("normalizes Arabic-Indic digits", () => {
  assert.equal(normalizeDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
});
