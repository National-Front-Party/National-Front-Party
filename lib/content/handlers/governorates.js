import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  governorateCreateSchema,
  governorateIdSchema,
  governorateStatusSchema,
  governorateUpdateSchema,
} from "../../validation/content/governorates.js";
import {
  createGovernorate,
  deleteGovernorate,
  getGovernorateAdmin,
  listGovernoratesAdmin,
  setGovernorateActive,
  updateGovernorate,
} from "../../services/governorates.js";
import {
  authorizeContent,
  authorizeContentDelete,
  contentFailure,
  parseBody,
  parseId,
} from "../http.js";

export function createAdminGovernoratesCollectionHandlers({
  guard = requireStaff,
  listFn = listGovernoratesAdmin,
  createFn = createGovernorate,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      try {
        const governorates = await listFn();
        return jsonResponse({ governorates });
      } catch (error) {
        return contentFailure(error);
      }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, governorateCreateSchema);
      if (parsed.response) return parsed.response;
      try {
        const governorate = await createFn(parsed.value, auth.staff);
        return jsonResponse({ governorate }, 201);
      } catch (error) {
        if (error?.code === "P2002") {
          return jsonResponse({ error: "DUPLICATE_CODE" }, 409);
        }
        return contentFailure(error);
      }
    },
  };
}

export function createAdminGovernorateItemHandlers({
  guard = requireStaff,
  getFn = getGovernorateAdmin,
  updateFn = updateGovernorate,
  deleteFn = deleteGovernorate,
} = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, governorateIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const item = await getFn(parsedId.value);
        return item ? jsonResponse({ governorate: item }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return contentFailure(error);
      }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, governorateIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, governorateUpdateSchema);
      if (parsed.response) return parsed.response;
      try {
        const governorate = await updateFn(parsedId.value, parsed.value, auth.staff);
        return governorate ? jsonResponse({ governorate }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        if (error?.code === "P2002") {
          return jsonResponse({ error: "DUPLICATE_CODE" }, 409);
        }
        return contentFailure(error);
      }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, governorateIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await deleteFn(parsedId.value, auth.staff);
        return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        if (error?.code === "GOVERNORATE_HAS_DATA") {
          return jsonResponse({ error: "GOVERNORATE_HAS_DATA" }, 409);
        }
        return contentFailure(error);
      }
    },
  };
}

export function createAdminGovernorateStatusHandler({
  guard = requireStaff,
  setFn = setGovernorateActive,
} = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, governorateIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, governorateStatusSchema);
    if (parsed.response) return parsed.response;
    try {
      const governorate = await setFn(parsedId.value, parsed.value.is_active, auth.staff);
      return governorate ? jsonResponse({ governorate }) : jsonResponse({ error: "NOT_FOUND" }, 404);
    } catch (error) {
      return contentFailure(error);
    }
  };
}
