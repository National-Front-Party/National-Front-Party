import { createRateLimiter } from "../../../lib/rate-limit.js";
import { apiDependencies } from "../../../lib/services/api-dependencies.js";

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};
const governoratesRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000,
});

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedIp || realIp || null;
}

export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = governoratesRateLimiter(ip ?? "unknown");
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            ...cacheHeaders,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const governorates = await apiDependencies.getActiveGovernorates();
    return Response.json({ governorates }, { headers: cacheHeaders });
  } catch (error) {
    console.error({
      name: error?.name,
      code: error?.code,
    });
    return Response.json(
      { error: "SERVER_ERROR" },
      { status: 500, headers: cacheHeaders },
    );
  }
}
