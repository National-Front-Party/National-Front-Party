import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError, readJsonBody } from "../auth/http.js";
import { hasPermission } from "../auth/permissions.js";
import { saveUploadedNewsImage } from "../services/news-storage.js";

export function newsFailure(error, conflictMap = {}) {
  if (error?.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(",")
      : String(error.meta?.target ?? "");
    if (target.includes("slug")) {
      return jsonResponse({ error: "DUPLICATE_SLUG" }, 409);
    }
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
  if (error?.code === "P2025") {
    return jsonResponse({ error: "NOT_FOUND" }, 404);
  }
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

export function serviceResultToResponse(
  result,
  { successStatus = 200, entityKey = "article" } = {},
) {
  if (result.ok) {
    if (
      result.data &&
      typeof result.data === "object" &&
      "items" in result.data &&
      "pagination" in result.data
    ) {
      const pluralKey =
        entityKey === "article"
          ? "articles"
          : entityKey === "source"
            ? "sources"
            : `${entityKey}s`;
      return jsonResponse(
        {
          [pluralKey]: result.data.items,
          pagination: result.data.pagination,
        },
        successStatus,
      );
    }
    if (result.data?.deleted === true) {
      return jsonResponse({ ok: true, id: result.data.id }, successStatus);
    }
    return jsonResponse({ [entityKey]: result.data }, successStatus);
  }

  switch (result.code) {
    case "UNAUTHORIZED":
      return jsonResponse({ error: "FORBIDDEN" }, 403);
    case "NOT_FOUND":
      return jsonResponse({ error: "NOT_FOUND" }, 404);
    case "CANNOT_EDIT_IN_CURRENT_STATUS":
      return jsonResponse({ error: "CANNOT_EDIT_IN_CURRENT_STATUS" }, 400);
    case "INVALID_STATUS_TRANSITION":
      return jsonResponse({ error: "INVALID_STATUS_TRANSITION" }, 400);
    case "REVIEW_NOTE_REQUIRED":
      return jsonResponse({ error: "REVIEW_NOTE_REQUIRED" }, 400);
    case "SELF_PUBLISHING_PROHIBITED":
      return jsonResponse({ error: "SELF_PUBLISHING_PROHIBITED" }, 403);
    case "SELF_REVIEW_PROHIBITED":
      return jsonResponse({ error: "SELF_REVIEW_PROHIBITED" }, 403);
    case "SOURCE_NOT_FOUND":
      return jsonResponse({ error: "INVALID_REFERENCE" }, 400);
    case "SOURCE_INACTIVE":
      return jsonResponse({ error: "SOURCE_INACTIVE" }, 400);
    case "DUPLICATE_SLUG":
      return jsonResponse({ error: "DUPLICATE_SLUG" }, 409);
    default:
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
  }
}

export async function authorizeNewsRead(request, guard = requireStaff) {
  const staff = await guard(request);
  if (staff instanceof Response) return { response: staff };
  if (!staff || staff.is_active !== true) {
    return { response: jsonResponse({ error: "UNAUTHENTICATED" }, 401) };
  }
  const canRead =
    hasPermission(staff.role, "news:read_all") ||
    hasPermission(staff.role, "news:read_own") ||
    staff.role === "super_admin";
  if (!canRead) {
    return { response: jsonResponse({ error: "FORBIDDEN" }, 403) };
  }
  return { staff };
}

export async function authorizeNewsAuthor(request, guard = requireStaff) {
  const staff = await guard(request);
  if (staff instanceof Response) return { response: staff };
  if (!staff || staff.is_active !== true) {
    return { response: jsonResponse({ error: "UNAUTHENTICATED" }, 401) };
  }
  if (staff.role !== "super_admin" && staff.role !== "news_editor") {
    return { response: jsonResponse({ error: "FORBIDDEN" }, 403) };
  }
  return { staff };
}

export async function authorizeNewsReviewer(request, guard = requireStaff) {
  const staff = await guard(request);
  if (staff instanceof Response) return { response: staff };
  if (!staff || staff.is_active !== true) {
    return { response: jsonResponse({ error: "UNAUTHENTICATED" }, 401) };
  }
  if (staff.role !== "super_admin" && staff.role !== "news_reviewer") {
    return { response: jsonResponse({ error: "FORBIDDEN" }, 403) };
  }
  return { staff };
}

export async function authorizeNewsSuperAdmin(request, guard = requireStaff) {
  const staff = await guard(request);
  if (staff instanceof Response) return { response: staff };
  if (!staff || staff.is_active !== true) {
    return { response: jsonResponse({ error: "UNAUTHENTICATED" }, 401) };
  }
  if (staff.role !== "super_admin") {
    return { response: jsonResponse({ error: "FORBIDDEN" }, 403) };
  }
  return { staff };
}

export async function authorizeNewsDelete(request, guard = requireStaff) {
  const staff = await guard(request, { permission: "records:delete" });
  if (staff instanceof Response) return { response: staff };
  if (!staff || staff.is_active !== true) {
    return { response: jsonResponse({ error: "UNAUTHENTICATED" }, 401) };
  }
  if (staff.role !== "super_admin") {
    return { response: jsonResponse({ error: "FORBIDDEN" }, 403) };
  }
  return { staff };
}

export async function parseNewsBody(request, schema, maxBytes = 10 * 1024) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const raw = {};
      let imageFile = null;

      for (const [key, value] of formData.entries()) {
        if (value && typeof value === "object" && typeof value.arrayBuffer === "function") {
          if (key === "file" || key === "image" || key === "image_file") {
            imageFile = value;
          }
        } else if (typeof value === "string") {
          if (value === "true") raw[key] = true;
          else if (value === "false") raw[key] = false;
          else if (key === "source_id" || key === "sort_order") {
            const num = Number(value);
            raw[key] = Number.isFinite(num) ? num : value;
          } else {
            raw[key] = value;
          }
        }
      }

      if (imageFile && imageFile.size > 0) {
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const uploadResult = await saveUploadedNewsImage(buffer, imageFile.name, imageFile.type);
        if (!uploadResult.ok) {
          return {
            response: jsonResponse(
              { error: uploadResult.code, message: uploadResult.message },
              400,
            ),
          };
        }
        raw.image_url = uploadResult.url;
      }

      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return { response: jsonResponse({ error: "VALIDATION" }, 400) };
      }
      return { value: parsed.data };
    } catch {
      return { response: jsonResponse({ error: "VALIDATION" }, 400) };
    }
  }

  const body = await readJsonBody(request, maxBytes);
  if (body.response) return body;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  }
  return { value: parsed.data };
}

export function parseNewsQuery(request, schema) {
  const url = new URL(request.url);
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  const parsed = schema.safeParse(Object.fromEntries(entries));
  return parsed.success ? parsed.data : null;
}

export function parseNewsId(id, schema) {
  const parsed = schema.safeParse(id);
  return parsed.success
    ? { value: parsed.data }
    : { response: jsonResponse({ error: "VALIDATION" }, 400) };
}
