import { requireStaff } from "../auth/guard.js";
import {
  jsonResponse,
  logAuthError,
  readJsonBody,
} from "../auth/http.js";
import {
  applicationStatusActionSchema,
  applicationInternalNoteSchema,
  applicationAssignmentSchema,
} from "../validation/application-actions.js";
import { applicationIdSchema } from "../validation/application-query.js";
import {
  addApplicationInternalNote,
  assignApplication,
  changeApplicationStatus,
  unassignApplication,
} from "../services/applications.js";

function serverError(error) {
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

async function authorizeUpdate(request, guard) {
  const staff = await guard(request, { permission: "applications:update" });
  return staff instanceof Response ? { response: staff } : { staff };
}

async function parseBody(request, schema) {
  const body = await readJsonBody(request);
  if (body.response) return body;
  const parsed = schema.safeParse(body.value);
  return parsed.success
    ? { value: parsed.data }
    : { response: jsonResponse({ error: "VALIDATION" }, 400) };
}

function parseApplicationId(id) {
  const parsed = applicationIdSchema.safeParse(id);
  return parsed.success
    ? { value: parsed.data }
    : { response: jsonResponse({ error: "VALIDATION" }, 400) };
}

function serviceError(result) {
  switch (result.code) {
    case "NOT_FOUND":
      return jsonResponse({ error: "NOT_FOUND" }, 404);
    case "INVALID_STATUS":
    case "INVALID_TRANSITION":
    case "INVALID_REJECTION_REASON":
    case "INVALID_NOTE":
      return jsonResponse({ error: "INVALID_TRANSITION" }, 400);
    case "CONFLICT":
      return jsonResponse({ error: "CONFLICT" }, 409);
    case "ASSIGNEE_NOT_FOUND":
      return jsonResponse({ error: "ASSIGNEE_NOT_FOUND" }, 404);
    case "ASSIGNEE_INACTIVE":
    case "ASSIGNEE_UNAUTHORIZED":
      return jsonResponse({ error: "INVALID_ASSIGNEE" }, 403);
    default:
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
  }
}

export function createApplicationStatusActionHandler({
  guard = requireStaff,
  changeStatusFn = changeApplicationStatus,
} = {}) {
  return async function PATCH(request, context) {
    const auth = await authorizeUpdate(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseApplicationId(id);
    if (parsedId.response) return parsedId.response;
    const parsedBody = await parseBody(request, applicationStatusActionSchema);
    if (parsedBody.response) return parsedBody.response;

    try {
      const { status, rejection_reason } = parsedBody.value;
      const result = await changeStatusFn(
        parsedId.value,
        status,
        auth.staff.id,
        rejection_reason,
      );
      if (!result.ok) return serviceError(result);
      return jsonResponse({
        ok: true,
        status: result.status,
        membership_no: result.membershipNo,
      });
    } catch (error) {
      return serverError(error);
    }
  };
}

export function createApplicationInternalNoteHandler({
  guard = requireStaff,
  addNoteFn = addApplicationInternalNote,
} = {}) {
  return async function POST(request, context) {
    const auth = await authorizeUpdate(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseApplicationId(id);
    if (parsedId.response) return parsedId.response;
    const parsedBody = await parseBody(request, applicationInternalNoteSchema);
    if (parsedBody.response) return parsedBody.response;

    try {
      const result = await addNoteFn(parsedId.value, parsedBody.value.note);
      if (!result.ok) return serviceError(result);
      return jsonResponse({ ok: true });
    } catch (error) {
      return serverError(error);
    }
  };
}

export function createApplicationAssignmentHandler({
  guard = requireStaff,
  assignFn = assignApplication,
  unassignFn = unassignApplication,
} = {}) {
  return async function PATCH(request, context) {
    const auth = await authorizeUpdate(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseApplicationId(id);
    if (parsedId.response) return parsedId.response;
    const parsedBody = await parseBody(request, applicationAssignmentSchema);
    if (parsedBody.response) return parsedBody.response;

    try {
      const result = parsedBody.value.assigned_to === null
        ? await unassignFn(parsedId.value)
        : await assignFn(parsedId.value, parsedBody.value.assigned_to);
      if (!result.ok) return serviceError(result);
      return jsonResponse({ ok: true, assigned_to: result.assignedTo });
    } catch (error) {
      return serverError(error);
    }
  };
}
