import { requireStaff } from "../auth/guard.js";
import { logAuthError } from "../auth/http.js";
import { exportApplications } from "../services/application-queries.js";
import { applicationsExportQuerySchema } from "../validation/application-query.js";
import {
  createApplicationsCsvWriter,
  MAX_APPLICATION_EXPORT_BYTES,
} from "./export-csv.js";

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
  return `applications-${date}.csv`;
}

export function createApplicationsExportHandler({
  guard = requireStaff,
  exportFn = exportApplications,
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
      const writer = createApplicationsCsvWriter();
      const result = await exportFn(parsed.data, undefined, (row) => writer.append(row));
      if (result.tooManyRows) {
        return errorResponse("EXPORT_LIMIT_EXCEEDED", 413);
      }
      if (result.tooLarge || writer.tooLarge || writer.byteLength > MAX_APPLICATION_EXPORT_BYTES) {
        return errorResponse("EXPORT_SIZE_LIMIT_EXCEEDED", 413);
      }

      return new Response(writer.toBuffer(), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${exportFilename(now())}"`,
          "Content-Length": String(writer.byteLength),
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
