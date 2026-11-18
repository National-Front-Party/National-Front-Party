import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  governorateSecretariatCreateSchema,
  governorateSecretariatIdSchema,
  governorateSecretariatListQuerySchema,
  governorateSecretariatStatusSchema,
  governorateSecretariatUpdateSchema,
} from "../../validation/content/governorate-secretariats.js";
import {
  createGovernorateSecretariat,
  deleteGovernorateSecretariat,
  getGovernorateSecretariatAdmin,
  getGovernorateSecretariatPublic,
  listGovernorateSecretariatsAdmin,
  listGovernorateSecretariatsPublic,
  setGovernorateSecretariatPublished,
  updateGovernorateSecretariat,
} from "../../services/content-governorate-secretariats.js";
import {
  authorizeContent,
  authorizeContentDelete,
  contentFailure,
  parseBody,
  parseId,
  parseQuery,
} from "../http.js";

export function createAdminGovernorateSecretariatsCollectionHandlers({ guard = requireStaff, listFn = listGovernorateSecretariatsAdmin, createFn = createGovernorateSecretariat } = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, governorateSecretariatListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse(await listFn(query)); } catch (error) { return contentFailure(error); }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, governorateSecretariatCreateSchema);
      if (parsed.response) return parsed.response;
      try { return jsonResponse({ governorate_secretariat: await createFn(parsed.value, auth.staff) }, 201); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminGovernorateSecretariatItemHandlers({ guard = requireStaff, getFn = getGovernorateSecretariatAdmin, updateFn = updateGovernorateSecretariat, deleteFn = deleteGovernorateSecretariat } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, governorateSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const item = await getFn(parsedId.value); return item ? jsonResponse({ governorate_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, governorateSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, governorateSecretariatUpdateSchema);
      if (parsed.response) return parsed.response;
      try { const item = await updateFn(parsedId.value, parsed.value, auth.staff); return item ? jsonResponse({ governorate_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, governorateSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try { const result = await deleteFn(parsedId.value, auth.staff); return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminGovernorateSecretariatStatusHandler({ guard = requireStaff, setFn = setGovernorateSecretariatPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, governorateSecretariatIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, governorateSecretariatStatusSchema);
    if (parsed.response) return parsed.response;
    try { const item = await setFn(parsedId.value, parsed.value.is_published, auth.staff); return item ? jsonResponse({ governorate_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
  };
}
export function createPublicGovernorateSecretariatsHandlers({ listFn = listGovernorateSecretariatsPublic, getFn = getGovernorateSecretariatPublic } = {}) {
  return {
    list: async (request) => {
      const url = new URL(request.url);
      const governorateId = url.searchParams.get("governorate_id");
      const parsedGid = governorateId ? zSafeGovernorateId(governorateId) : null;
      if (governorateId && !parsedGid) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse({ governorate_secretariats: await listFn(parsedGid) }); } catch (error) { return contentFailure(error); }
    },
    get: async (_request, context) => {
      const parsedId = parseId((await context.params).id, governorateSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const item = await getFn(parsedId.value); return item ? jsonResponse({ governorate_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
function zSafeGovernorateId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 32767 ? n : null;
}
