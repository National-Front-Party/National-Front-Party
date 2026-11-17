import { randomInt } from "node:crypto";
import { createRateLimiter } from "../../../lib/rate-limit.js";
import { apiDependencies } from "../../../lib/services/api-dependencies.js";
import { applicationSchema } from "../../../lib/validation/application.js";

const responseStatusByCode = {
  INVALID_NATIONAL_ID: 400,
  INVALID_GOVERNORATE: 400,
  DUPLICATE: 409,
};
const applicationRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});
const unknownIpRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 15 * 60 * 1000,
});
const maxBodyBytes = 10 * 1024;

function logUnexpectedError(error) {
  console.error({
    name: error?.name,
    code: error?.code,
  });
}

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedIp || realIp || null;
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit =
      ip === null
        ? unknownIpRateLimiter("unknown")
        : applicationRateLimiter(ip);

    if (!rateLimit.allowed) {
      return Response.json(
        { error: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const contentType = request.headers.get("content-type");
    if (
      !contentType ||
      contentType.split(";")[0].trim().toLowerCase() !== "application/json"
    ) {
      return Response.json(
        { error: "UNSUPPORTED_MEDIA_TYPE" },
        { status: 415 },
      );
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
      return Response.json(
        { error: "PAYLOAD_TOO_LARGE" },
        { status: 413 },
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "VALIDATION",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (parsed.data.website) {
      return Response.json(
        { application_no: String(randomInt(1, 1_000_000_000)) },
        { status: 201 },
      );
    }

    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!parsed.data.turnstileToken) {
        return Response.json({ error: "CAPTCHA_REQUIRED" }, { status: 400 });
      }

      const captchaPassed = await apiDependencies.verifyTurnstile(
        parsed.data.turnstileToken,
        ip,
      );
      if (!captchaPassed) {
        return Response.json({ error: "CAPTCHA_FAILED" }, { status: 400 });
      }
    }

    const result = await apiDependencies.createApplication(parsed.data, ip);

    if (result.ok) {
      return Response.json(
        { application_no: result.applicationNo },
        { status: 201 },
      );
    }

    const status = responseStatusByCode[result.code];
    if (status === undefined) {
      const error = new Error();
      error.name = "UnexpectedApplicationResult";
      error.code = "UNEXPECTED_APPLICATION_RESULT";
      throw error;
    }

    return Response.json({ error: result.code }, { status });
  } catch (error) {
    logUnexpectedError(error);
    return Response.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
