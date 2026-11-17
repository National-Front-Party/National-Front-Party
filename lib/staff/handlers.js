import { requireStaff } from "../auth/guard.js";
import {
  logAuthError,
  jsonResponse,
  readJsonBody,
} from "../auth/http.js";
import {
  auditLogQuerySchema,
  staffCreateSchema,
  staffIdSchema,
  staffListQuerySchema,
  staffResetPasswordSchema,
  staffStatusSchema,
  staffUpdateSchema,
} from "../validation/staff.js";
import {
  createStaff,
  getStaff,
  listStaff,
  listStaffAuditLog,
  resetStaffPassword,
  setStaffActive,
  updateStaff,
} from "../services/staff.js";

function failure(error) {
  if (error?.code === "P2002") {
    return jsonResponse({ error: "EMAIL_ALREADY_EXISTS" }, 409);
  }
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

async function authorize(request, guard) {
  const staff = await guard(request, { permission: "staff:manage" });
  return staff instanceof Response ? { response: staff } : { staff };
}

async function parseBody(request, schema) {
  const body = await readJsonBody(request);
  if (body.response) return body;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  }
  return { value: parsed.data };
}

function parseId(id) {
  const parsed = staffIdSchema.safeParse(id);
  return parsed.success ? { value: parsed.data } : { response: jsonResponse({ error: "VALIDATION" }, 400) };
}

export function createStaffCollectionHandlers({
  guard = requireStaff,
  listFn = listStaff,
  createFn = createStaff,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const url = new URL(request.url);
      const parsed = staffListQuerySchema.safeParse({
        page: url.searchParams.get("page") ?? undefined,
        page_size: url.searchParams.get("page_size") ?? undefined,
      });
      if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);
      try {
        return jsonResponse(await listFn(parsed.data));
      } catch (error) {
        return failure(error);
      }
    },
    POST: async (request) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, staffCreateSchema);
      if (parsed.response) return parsed.response;
      try {
        const staff = await createFn(parsed.value, auth.staff);
        return jsonResponse({ staff }, 201);
      } catch (error) {
        return failure(error);
      }
    },
  };
}

export function createStaffItemHandlers({
  guard = requireStaff,
  getFn = getStaff,
  updateFn = updateStaff,
} = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id);
      if (parsedId.response) return parsedId.response;
      try {
        const staff = await getFn(parsedId.value);
        return staff
          ? jsonResponse({ staff })
          : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return failure(error);
      }
    },
    PATCH: async (request, context) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, staffUpdateSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await updateFn(parsedId.value, parsed.value, auth.staff);
        if (!result.ok && result.code === "NOT_FOUND") {
          return jsonResponse({ error: "NOT_FOUND" }, 404);
        }
        if (!result.ok && result.code === "LAST_ACTIVE_SUPER_ADMIN") {
          return jsonResponse({ error: result.code }, 409);
        }
        return jsonResponse({ staff: result.staff });
      } catch (error) {
        return failure(error);
      }
    },
  };
}

export function createStaffStatusHandler({
  guard = requireStaff,
  setActiveFn = setStaffActive,
} = {}) {
  return async (request, context) => {
    const auth = await authorize(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseId(id);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, staffStatusSchema);
    if (parsed.response) return parsed.response;
    try {
      const result = await setActiveFn(
        parsedId.value,
        parsed.value.is_active,
        auth.staff,
      );
      if (!result.ok && result.code === "NOT_FOUND") {
        return jsonResponse({ error: "NOT_FOUND" }, 404);
      }
      if (!result.ok && result.code === "LAST_ACTIVE_SUPER_ADMIN") {
        return jsonResponse({ error: result.code }, 409);
      }
      return jsonResponse({ staff: result.staff });
    } catch (error) {
      return failure(error);
    }
  };
}

export function createStaffResetPasswordHandler({
  guard = requireStaff,
  resetFn = resetStaffPassword,
} = {}) {
  return async (request, context) => {
    const auth = await authorize(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseId(id);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, staffResetPasswordSchema);
    if (parsed.response) return parsed.response;
    try {
      const result = await resetFn(
        parsedId.value,
        parsed.value.temporary_password,
        auth.staff,
      );
      if (result?.ok === false && result.code === "NOT_FOUND") {
        return jsonResponse({ error: "NOT_FOUND" }, 404);
      }
      return jsonResponse({ staff: result });
    } catch (error) {
      return failure(error);
    }
  };
}

export function createStaffAuditLogHandler({
  guard = requireStaff,
  listFn = listStaffAuditLog,
} = {}) {
  return async (request) => {
    const auth = await authorize(request, guard);
    if (auth.response) return auth.response;
    const url = new URL(request.url);
    const parsed = auditLogQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      page_size: url.searchParams.get("page_size") ?? undefined,
      target_id: url.searchParams.get("target_id") ?? undefined,
      actor_id: url.searchParams.get("actor_id") ?? undefined,
    });
    if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);
    try {
      return jsonResponse(await listFn(parsed.data));
    } catch (error) {
      return failure(error);
    }
  };
}
