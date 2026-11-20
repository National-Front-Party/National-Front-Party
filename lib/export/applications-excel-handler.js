import { requireStaff } from "../auth/guard.js";
import { logAuthError } from "../auth/http.js";
import { exportApplications } from "../services/application-queries.js";
import { applicationsExportQuerySchema } from "../validation/application-query.js";
import { generateApplicationsWorkbook } from "./applications-excel.js";

function errorResponse(error, status) {
  return Response.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store, private, max-age=0" },
  });
}

function queryObject(url) {
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  return Object.fromEntries(entries);
}

function exportFilename(now) {
  const date = now.toISOString().slice(0, 10);
  return `membership-applications-report-${date}.xlsx`;
}

export function createApplicationsExcelExportHandler({
  guard = requireStaff,
  exportFn = exportApplications,
  generator = generateApplicationsWorkbook,
  now = () => new Date(),
} = {}) {
  return async function GET(request) {
    const staff = await guard(request, { permission: "applications:export" });
    if (staff instanceof Response) return staff;

    const params = queryObject(new URL(request.url));
    if (!params) return errorResponse("VALIDATION", 400);
    const parsed = applicationsExportQuerySchema.safeParse(params);
    if (!parsed.success) return errorResponse("VALIDATION", 400);

    try {
      const rows = [];
      const result = await exportFn(parsed.data, undefined, (row) => {
        rows.push(row);
        return true;
      });

      if (result.tooManyRows) {
        return errorResponse("EXPORT_LIMIT_EXCEEDED", 413);
      }

      // Build descriptive filter summary for Dashboard metadata
      const filterParts = [];
      if (parsed.data.name) filterParts.push(`الاسم: "${parsed.data.name}"`);
      if (parsed.data.status) {
        const statusMap = {
          new: "جديد",
          under_review: "قيد المراجعة",
          accepted: "مقبول",
          rejected: "مرفوض",
        };
        filterParts.push(`الحالة: ${statusMap[parsed.data.status] || parsed.data.status}`);
      }
      if (parsed.data.application_type) {
        const typeMap = {
          member: "عضوية عاملة",
          volunteer: "عمل تطوعي",
          follower: "مناصرة ومتابعة",
        };
        filterParts.push(`النوع: ${typeMap[parsed.data.application_type] || parsed.data.application_type}`);
      }
      if (parsed.data.governorate_id) filterParts.push(`كود المحافظة: ${parsed.data.governorate_id}`);
      if (parsed.data.created_from) filterParts.push(`من: ${parsed.data.created_from.toISOString().slice(0, 10)}`);
      if (parsed.data.created_to) filterParts.push(`إلى: ${parsed.data.created_to.toISOString().slice(0, 10)}`);

      const filtersText = filterParts.length > 0 ? filterParts.join(" • ") : "جميع الطلبات المسجلة دون فلاتر";

      const buffer = await generator(rows, { filtersText, exportDate: now() });

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${exportFilename(now())}"`,
          "Content-Length": String(buffer.byteLength),
          "Cache-Control": "no-store, private, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (error) {
      logAuthError(error);
      return errorResponse("SERVER_ERROR", 500);
    }
  };
}
