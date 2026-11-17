import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError } from "../auth/http.js";
import {
  applicationIdSchema,
  applicationsListQuerySchema,
} from "../validation/application-query.js";
import {
  getApplication,
  listApplications,
} from "../services/application-queries.js";

function serverError(error) {
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

async function authorizeRead(request, guard) {
  const staff = await guard(request, { permission: "applications:read" });
  return staff instanceof Response ? { response: staff } : { staff };
}

function queryObject(url) {
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  return Object.fromEntries(entries);
}

export function createApplicationsListHandler({
  guard = requireStaff,
  listFn = listApplications,
} = {}) {
  return async function GET(request) {
    const auth = await authorizeRead(request, guard);
    if (auth.response) return auth.response;

    const params = queryObject(new URL(request.url));
    if (!params) return jsonResponse({ error: "VALIDATION" }, 400);
    const parsed = applicationsListQuerySchema.safeParse(params);
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      return jsonResponse(await listFn(parsed.data));
    } catch (error) {
      return serverError(error);
    }
  };
}

export function createApplicationDetailHandler({
  guard = requireStaff,
  getFn = getApplication,
} = {}) {
  return async function GET(request, context) {
    const auth = await authorizeRead(request, guard);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const parsedId = applicationIdSchema.safeParse(id);
    if (!parsedId.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      const application = await getFn(parsedId.data);
      return application
        ? jsonResponse({ application })
        : jsonResponse({ error: "NOT_FOUND" }, 404);
    } catch (error) {
      return serverError(error);
    }
  };
}
