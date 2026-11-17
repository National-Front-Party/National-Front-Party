export function jsonResponse(body, status = 200, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  return Response.json(body, { status, headers: responseHeaders });
}

export async function readJsonBody(request, maxBytes = 10 * 1024) {
  const contentType = request.headers.get("content-type");
  if (
    !contentType ||
    contentType.split(";")[0].trim().toLowerCase() !== "application/json"
  ) {
    return { response: jsonResponse({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415) };
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  }
  if (new TextEncoder().encode(rawBody).byteLength > maxBytes) {
    return { response: jsonResponse({ error: "PAYLOAD_TOO_LARGE" }, 413) };
  }

  try {
    return { value: JSON.parse(rawBody) };
  } catch {
    return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  }
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0].trim();
  return forwardedIp || request.headers.get("x-real-ip")?.trim() || null;
}

export function logAuthError(error) {
  console.error({
    name: error?.name,
    code: error?.code,
  });
}
