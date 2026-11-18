import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError, readJsonBody } from "../auth/http.js";

export function contentFailure(error, conflictMap = {}) {
  if (error?.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";
    if (target.includes("slug")) return jsonResponse({ error: "DUPLICATE_SLUG" }, 409);
    for (const [needle, code] of Object.entries(conflictMap)) {
      if (target.includes(needle)) return jsonResponse({ error: code }, 409);
    }
    return jsonResponse({ error: "DUPLICATE" }, 409);
  }
  if (error?.code === "P2003") {
    const field = String(error.meta?.field_name ?? "");
    for (const [needle, code] of Object.entries(conflictMap)) {
      if (field.includes(needle)) {
        const status = typeof code === "object" ? (code.status ?? 400) : 400;
        const errCode = typeof code === "object" ? code.error : code;
        return jsonResponse({ error: errCode }, status);
      }
    }
    return jsonResponse({ error: "INVALID_REFERENCE" }, 400);
  }
  if (error?.code === "P2025") return jsonResponse({ error: "NOT_FOUND" }, 404);
  if (error?.code === "PANEL_HAS_LEADERS") {
    return jsonResponse({ error: "PANEL_HAS_LEADERS" }, 409);
  }
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

export async function authorizeContent(request, guard = requireStaff) {
  const staff = await guard(request, { permission: "content:manage" });
  return staff instanceof Response ? { response: staff } : { staff };
}

export async function authorizeContentDelete(request, guard = requireStaff) {
  const staff = await guard(request, {
    permission: "records:delete",
  });
  return staff instanceof Response ? { response: staff } : { staff };
}

export async function parseBody(request, schema) {
  const body = await readJsonBody(request);
  if (body.response) return body;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  return { value: parsed.data };
}

export function parseQuery(request, schema) {
  const url = new URL(request.url);
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  const parsed = schema.safeParse(Object.fromEntries(entries));
  return parsed.success ? parsed.data : null;
}

export function parseId(id, schema) {
  const parsed = schema.safeParse(id);
  return parsed.success
    ? { value: parsed.data }
    : { response: jsonResponse({ error: "VALIDATION" }, 400) };
}
