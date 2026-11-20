import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { createApplicationsExcelExportHandler } from "./applications-excel-handler.js";

const admin = { id: "11111111-1111-4111-8111-111111111111", role: "super_admin" };

function request(url) {
  return new Request(url, { method: "GET" });
}

test("excel export requires applications:export and returns formatted .xlsx workbook with 2 sheets", async () => {
  let permission;
  let filters;
  const sampleRows = [
    {
      application_no: 101n,
      application_type: "member",
      status: "accepted",
      full_name: "مروان طارق",
      governorate: { name_ar: "القاهرة" },
      assigned_staff_user: { full_name: "المسؤول الأول" },
      created_at: new Date("2026-11-15T10:00:00Z"),
      updated_at: new Date("2026-11-16T12:00:00Z"),
      reviewed_at: new Date("2026-11-16T12:00:00Z"),
    },
    {
      application_no: 102n,
      application_type: "volunteer",
      status: "new",
      full_name: "سارة أحمد",
      governorate: { name_ar: "الجيزة" },
      assigned_staff_user: null,
      created_at: new Date("2026-11-16T11:00:00Z"),
      updated_at: null,
      reviewed_at: null,
    },
  ];

  const handler = createApplicationsExcelExportHandler({
    guard: async (_request, options) => {
      permission = options.permission;
      return admin;
    },
    exportFn: async (input, _db, onRow) => {
      filters = input;
      sampleRows.forEach((r) => onRow(r));
      return { rowCount: sampleRows.length };
    },
    now: () => new Date("2026-11-20T10:00:00Z"),
  });

  const response = await handler(request("http://localhost/api/admin/applications/export/excel?name=مروان&status=accepted"));
  assert.equal(response.status, 200);
  assert.equal(permission, "applications:export");
  assert.equal(filters.name, "مروان");
  assert.equal(filters.status, "accepted");
  assert.equal(response.headers.get("cache-control"), "no-store, private, max-age=0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="membership-applications-report-2026-11-20.xlsx"');

  const arrayBuffer = await response.arrayBuffer();
  assert.ok(arrayBuffer.byteLength > 1000);

  // Validate workbook structure with ExcelJS
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(arrayBuffer));
  assert.equal(wb.worksheets.length, 2);
  assert.equal(wb.worksheets[0].name, "الإحصائيات ولوحة المؤشرات");
  assert.equal(wb.worksheets[1].name, "بيانات الطلبات");

  // Verify Sheet 1 rightToLeft
  assert.equal(wb.worksheets[0].views[0].rightToLeft, true);

  // Verify Sheet 2 rightToLeft and frozen header
  assert.equal(wb.worksheets[1].views[0].rightToLeft, true);
  assert.equal(wb.worksheets[1].views[0].ySplit, 1);

  // Verify data rows in Sheet 2
  const row2 = wb.worksheets[1].getRow(2);
  assert.equal(row2.getCell(1).value, "#101");
  assert.equal(row2.getCell(2).value, "مروان طارق");
  assert.equal(row2.getCell(3).value, "عضوية عاملة");
  assert.equal(row2.getCell(4).value, "مقبول");
  assert.equal(row2.getCell(5).value, "القاهرة");
});

test("excel export rejects non-super-admin, malformed and duplicate query params", async () => {
  let exports = 0;
  const handler = createApplicationsExcelExportHandler({
    guard: async () => Response.json({ error: "FORBIDDEN" }, { status: 403 }),
    exportFn: async () => { exports += 1; return { rowCount: 0 }; },
  });
  assert.equal((await handler(request("http://localhost/api/admin/applications/export/excel"))).status, 403);
  assert.equal(exports, 0);

  const allow = createApplicationsExcelExportHandler({
    guard: async () => admin,
    exportFn: async () => { exports += 1; return { rowCount: 0 }; },
  });
  for (const url of [
    "http://localhost/api/admin/applications/export/excel?status=invalid",
    "http://localhost/api/admin/applications/export/excel?page=1",
    "http://localhost/api/admin/applications/export/excel?name=a&name=b",
  ]) {
    assert.equal((await allow(request(url))).status, 400);
  }
  assert.equal(exports, 0);
});

test("excel export returns 413 on row limits", async () => {
  const tooMany = createApplicationsExcelExportHandler({
    guard: async () => admin,
    exportFn: async () => ({ tooManyRows: true }),
  });
  const res = await tooMany(request("http://localhost/api/admin/applications/export/excel"));
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { error: "EXPORT_LIMIT_EXCEEDED" });
});

test("excel export maps service failures to 500 without leaking details", async () => {
  const failing = createApplicationsExcelExportHandler({
    guard: async () => admin,
    exportFn: async () => { throw new Error("database crash details"); },
  });
  const res = await failing(request("http://localhost/api/admin/applications/export/excel"));
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "SERVER_ERROR" });
  assert.equal(res.headers.get("cache-control"), "no-store, private, max-age=0");
});
