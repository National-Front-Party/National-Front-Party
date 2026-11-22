import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError, readJsonBody } from "../auth/http.js";
import { hasPermission } from "../auth/permissions.js";
import { deleteServiceRequest } from "../services/service-requests.js";
import { deleteConfirmSchema } from "../validation/content/common.js";

export function createServiceRequestDeleteHandler({
  guard = requireStaff,
  deleteFn = deleteServiceRequest,
} = {}) {
  return async function DELETE(request, context) {
    const staff = await guard(request);
    if (staff instanceof Response) return staff;
    if (!staff || staff.is_active !== true) {
      return jsonResponse({ error: "UNAUTHENTICATED" }, 401);
    }

    const canDelete =
      hasPermission(staff.role, "records:delete") ||
      staff.role === "super_admin";

    if (!canDelete) {
      return jsonResponse({ error: "FORBIDDEN" }, 403);
    }

    const { id } = await context.params;
    if (!id || typeof id !== "string") {
      return jsonResponse({ error: "VALIDATION" }, 400);
    }

    const body = await readJsonBody(request, 1024);
    if (body.response) return body.response;

    const parsed = deleteConfirmSchema.safeParse(body.value);
    if (!parsed.success) {
      return jsonResponse({ error: "VALIDATION" }, 400);
    }

    try {
      const result = await deleteFn(id);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") {
          return jsonResponse({ error: "NOT_FOUND" }, 404);
        }
        return jsonResponse({ error: "SERVER_ERROR" }, 500);
      }
      return jsonResponse({ ok: true, id: result.id, request_no: result.request_no }, 200);
    } catch (err) {
      logAuthError(err);
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
    }
  };
}
