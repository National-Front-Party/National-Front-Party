import { createApplicationDetailHandler } from "../../../../../lib/applications/read-handlers.js";
import { requireStaff } from "../../../../../lib/auth/guard.js";
import { jsonResponse, logAuthError, readJsonBody } from "../../../../../lib/auth/http.js";
import { hasPermission } from "../../../../../lib/auth/permissions.js";
import { deleteApplication } from "../../../../../lib/services/applications.js";
import { deleteConfirmSchema } from "../../../../../lib/validation/content/common.js";

export const GET = createApplicationDetailHandler();

export async function DELETE(request, context) {
  const staff = await requireStaff(request);
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
    const result = await deleteApplication(id);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") {
        return jsonResponse({ error: "NOT_FOUND" }, 404);
      }
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
    }
    return jsonResponse({ ok: true, id: result.id, application_no: result.application_no }, 200);
  } catch (err) {
    logAuthError(err);
    return jsonResponse({ error: "SERVER_ERROR" }, 500);
  }
}
