import { createRateLimiter } from "../rate-limit.js";
import { apiDependencies } from "../services/api-dependencies.js";
import { getClientIp, jsonResponse, logAuthError, readJsonBody } from "../auth/http.js";
import { serviceRequestSchema } from "../validation/service-request.js";

const publicReadLimit = { limit: 60, windowMs: 60 * 1000 };
const publicSubmitLimit = { limit: 5, windowMs: 15 * 60 * 1000 };
const unknownIpSubmitLimit = { limit: 20, windowMs: 15 * 60 * 1000 };

function rateLimited(result) {
  return jsonResponse(
    { error: "RATE_LIMITED" },
    429,
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

export function createPublicCatalogHandler({
  catalog,
  service,
  limiter = createRateLimiter(publicReadLimit),
}) {
  if (!Object.hasOwn({ ministries: true, request_sectors: true }, catalog)) {
    throw new TypeError("Unknown public catalog");
  }

  const responseKey = catalog;
  return async function GET(request) {
    const rate = limiter(getClientIp(request) ?? "unknown");
    if (!rate.allowed) return rateLimited(rate);
    try {
      const records = await service();
      return jsonResponse({ [responseKey]: records });
    } catch (error) {
      logAuthError(error);
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
    }
  };
}

export function createPublicServiceRequestHandler({
  createFn = (...args) => apiDependencies.createServiceRequest(...args),
  limiter = createRateLimiter(publicSubmitLimit),
  unknownIpLimiter = createRateLimiter(unknownIpSubmitLimit),
} = {}) {
  return async function POST(request) {
    const ip = getClientIp(request);
    const rate = ip === null ? unknownIpLimiter("unknown") : limiter(ip);
    if (!rate.allowed) return rateLimited(rate);

    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const parsed = serviceRequestSchema.safeParse(body.value);
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      const result = await createFn(parsed.data);
      if (!result.ok && result.code === "INVALID_SELECTION") {
        return jsonResponse({ error: "INVALID_SELECTION" }, 400);
      }
      if (!result.ok) throw new Error("Unexpected service request result");
      return jsonResponse({ success: true }, 201);
    } catch (error) {
      logAuthError(error);
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
    }
  };
}

export const getPublicMinistries = createPublicCatalogHandler({
  catalog: "ministries",
  service: (...args) => apiDependencies.getActiveMinistries(...args),
});

export const getPublicRequestSectors = createPublicCatalogHandler({
  catalog: "request_sectors",
  service: (...args) => apiDependencies.getActiveRequestSectors(...args),
});

export const postPublicServiceRequest = createPublicServiceRequestHandler();
