import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  popupCreateSchema,
  popupIdSchema,
  popupListQuerySchema,
  popupStatusSchema,
  popupUpdateSchema,
} from "../../validation/content/popups.js";
import {
  createPopup,
  deletePopup,
  getPopupAdmin,
  getPopupPublic,
  listPopupsAdmin,
  listPopupsPublic,
  setPopupPublished,
  updatePopup,
} from "../../services/content-popups.js";
import {
  authorizeContent,
  authorizeContentDelete,
  contentFailure,
  parseBody,
  parseId,
  parseQuery,
} from "../http.js";

export function createAdminPopupsCollectionHandlers({
  guard = requireStaff,
  listFn = listPopupsAdmin,
  createFn = createPopup,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, popupListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try {
        return jsonResponse(await listFn(query));
      } catch (error) {
        return contentFailure(error);
      }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, popupCreateSchema);
      if (parsed.response) return parsed.response;
      try {
        const popup = await createFn(parsed.value, auth.staff);
        return jsonResponse({ popup }, 201);
      } catch (error) {
        return contentFailure(error);
      }
    },
  };
}

export function createAdminPopupItemHandlers({
  guard = requireStaff,
  getFn = getPopupAdmin,
  updateFn = updatePopup,
  deleteFn = deletePopup,
} = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id, popupIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const popup = await getFn(parsedId.value);
        return popup ? jsonResponse({ popup }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return contentFailure(error);
      }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id, popupIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, popupUpdateSchema);
      if (parsed.response) return parsed.response;
      try {
        const popup = await updateFn(parsedId.value, parsed.value, auth.staff);
        return popup ? jsonResponse({ popup }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return contentFailure(error);
      }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id, popupIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await deleteFn(parsedId.value, auth.staff);
        return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return contentFailure(error);
      }
    },
  };
}

export function createAdminPopupStatusHandler({
  guard = requireStaff,
  setFn = setPopupPublished,
} = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseId(id, popupIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, popupStatusSchema);
    if (parsed.response) return parsed.response;
    try {
      const popup = await setFn(parsedId.value, parsed.value.is_published, auth.staff);
      return popup ? jsonResponse({ popup }) : jsonResponse({ error: "NOT_FOUND" }, 404);
    } catch (error) {
      return contentFailure(error);
    }
  };
}

export function createPublicPopupsHandlers({
  listFn = listPopupsPublic,
  getFn = getPopupPublic,
} = {}) {
  return {
    list: async () => {
      try {
        return jsonResponse({ popups: await listFn() });
      } catch (error) {
        return contentFailure(error);
      }
    },
    get: async (_request, context) => {
      const { id } = await context.params;
      const parsedId = parseId(id, popupIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const popup = await getFn(parsedId.value);
        return popup ? jsonResponse({ popup }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return contentFailure(error);
      }
    },
  };
}
