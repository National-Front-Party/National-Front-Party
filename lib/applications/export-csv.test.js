import assert from "node:assert/strict";
import test from "node:test";
import {
  createApplicationsCsvWriter,
  MAX_APPLICATION_EXPORT_BYTES,
} from "./export-csv.js";

function row(overrides = {}) {
  return {
    application_no: 123n,
    application_type: "member",
    status: "new",
    full_name: "أحمد, علي",
    governorate: { name_ar: "القاهرة" },
    assigned_staff_user: { full_name: 'Editor "A"' },
    created_at: new Date("2026-11-17T12:00:00.000Z"),
    updated_at: new Date("2026-11-17T12:30:00.000Z"),
    reviewed_at: null,
    ...overrides,
  };
}

function serialize(rows) {
  const writer = createApplicationsCsvWriter();
  for (const value of rows) assert.equal(writer.append(value), true);
  return { csv: Buffer.from(writer.toBuffer()).toString("utf8"), byteLength: writer.byteLength };
}

test("exports a UTF-8 BOM and fixed safe columns while preserving Arabic and escaping CSV", () => {
  const { csv, byteLength } = serialize([row({ full_name: 'أحمد, "علي"\nمحمد' })]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(byteLength, Buffer.byteLength(csv, "utf8"));
  assert.match(csv, /"أحمد, ""علي""\nمحمد"/);
  assert.match(csv, /"Editor ""A"""/);
  assert.match(csv, /"القاهرة"/);
  assert.match(csv, /""\r\n$/);
  assert.match(csv, /^\uFEFF"Application Number","Application Type","Status","Full Name","Governorate","Assigned Staff","Created At","Updated At","Reviewed At"/);
  for (const excluded of ["National ID", "Phone", "Birth Date", "Gender", "Qualification", "Profession", "Rejection Reason", "Internal Notes", "Submitted IP"]) {
    assert.equal(csv.includes(excluded), false);
  }
});

test("protects formula prefixes including prefixes preceded by whitespace/control characters", () => {
  for (const value of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "  =1+1", "\t+1", "\r\n@value"]) {
    const { csv } = serialize([row({ full_name: value })]);
    assert.ok(csv.includes(`'${value.replaceAll('"', '""')}`), value);
  }
  const { csv } = serialize([row({ full_name: "أحمد علي" })]);
  assert.ok(csv.includes('"أحمد علي"'));
  assert.ok(!csv.includes("'أحمد علي"));
});

test("BOM is included in UTF-8 byte accounting and bounded exports retain exact bytes", () => {
  const empty = createApplicationsCsvWriter();
  assert.deepEqual([...empty.toBuffer().subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(empty.byteLength, Buffer.byteLength(Buffer.from(empty.toBuffer()).toString("utf8"), "utf8"));
  assert.equal(Buffer.from(empty.toBuffer()).toString("utf8").split("\r\n").length, 2);

  const arabicRow = row({ full_name: "القاهرة — أحمد" });
  const { csv, byteLength } = serialize([arabicRow]);
  assert.equal(byteLength, Buffer.byteLength(csv, "utf8"));
  assert.equal(byteLength, Buffer.from(csv, "utf8").length);
  assert.ok(csv.includes("القاهرة — أحمد"));
});

test("writer stops before appending a row that would exceed 10 MB", () => {
  const writer = createApplicationsCsvWriter();
  const hugeRow = row({ full_name: "x".repeat(MAX_APPLICATION_EXPORT_BYTES) });
  assert.equal(writer.append(hugeRow), false);
  assert.equal(writer.tooLarge, true);
  assert.equal(writer.toBuffer(), null);
  assert.equal(writer.rowCount, 0);
});
