import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError, readJsonBody } from "../auth/http.js";
import { serviceRequestIdSchema } from "../validation/service-request-query.js";
import { serviceRequestStatusSchema } from "../validation/service-request.js";
import { updateServiceRequestStatus } from "../services/service-requests.js";

function serverError(error) {
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

export function createServiceRequestStatusHandler({
  guard = requireStaff,
  updateFn = updateServiceRequestStatus,
} = {}) {
  return async function PATCH(request, context) {
    const staff = await guard(request, { permission: "services:manage" });
    if (staff instanceof Response) return staff;

    const { id } = await context.params;
    const parsedId = serviceRequestIdSchema.safeParse(id);
    if (!parsedId.success) return jsonResponse({ error: "VALIDATION" }, 400);

    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const parsed = serviceRequestStatusSchema.safeParse(body.value);
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);

    try {
      const result = await updateFn(
        parsedId.data,
        parsed.data.status,
        staff.id,
        parsed.data.note,
      );
      if (!result.ok) {
        return jsonResponse(
          { error: result.code },
          result.code === "NOT_FOUND" ? 404 : 400,
        );
      }
      return jsonResponse({
        ok: true,
        status: result.status,
        request_no: result.request_no,
      });
    } catch (error) {
      return serverError(error);
    }
  };
}
