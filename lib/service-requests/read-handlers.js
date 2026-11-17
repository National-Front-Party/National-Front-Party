import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError } from "../auth/http.js";
import {
  getServiceRequest,
  listServiceRequests,
} from "../services/service-request-queries.js";
import {
  serviceRequestIdSchema,
  serviceRequestsListQuerySchema,
} from "../validation/service-request-query.js";

function serverError(error) {
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

async function authorizeRead(request, guard) {
  const staff = await guard(request, { permission: "services:manage" });
  return staff instanceof Response ? { response: staff } : { staff };
}

function queryObject(url) {
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  return Object.fromEntries(entries);
}

export function createServiceRequestsListHandler({
  guard = requireStaff,
  listFn = listServiceRequests,
} = {}) {
  return async function GET(request) {
    const auth = await authorizeRead(request, guard);
    if (auth.response) return auth.response;

    const params = queryObject(new URL(request.url));
    if (!params) return jsonResponse({ error: "VALIDATION" }, 400);
    const parsed = serviceRequestsListQuerySchema.safeParse(params);
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      return jsonResponse(await listFn(parsed.data));
    } catch (error) {
      return serverError(error);
    }
  };
}

export function createServiceRequestDetailHandler({
  guard = requireStaff,
  getFn = getServiceRequest,
} = {}) {
  return async function GET(request, context) {
    const auth = await authorizeRead(request, guard);
    if (auth.response) return auth.response;

    const { id } = await context.params;
    const parsedId = serviceRequestIdSchema.safeParse(id);
    if (!parsedId.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      const serviceRequest = await getFn(parsedId.data);
      return serviceRequest
        ? jsonResponse({ service_request: serviceRequest })
        : jsonResponse({ error: "NOT_FOUND" }, 404);
    } catch (error) {
      return serverError(error);
    }
  };
}
