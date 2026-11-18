import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  parliamentaryUnitCreateSchema,
  parliamentaryUnitIdSchema,
  parliamentaryUnitListQuerySchema,
  parliamentaryUnitStatusSchema,
  parliamentaryUnitUpdateSchema,
} from "../../validation/content/parliamentary-unit.js";
import {
  createParliamentary,
  deleteParliamentary,
  getParliamentaryAdmin,
  getParliamentaryPublic,
  listParliamentaryAdmin,
  listParliamentaryPublic,
  setParliamentaryPublished,
  updateParliamentary,
} from "../../services/content-parliamentary.js";
import {
  authorizeContent,
  authorizeContentDelete,
  contentFailure,
  parseBody,
  parseId,
  parseQuery,
} from "../http.js";

export function createAdminParliamentaryCollectionHandlers({ guard = requireStaff, listFn = listParliamentaryAdmin, createFn = createParliamentary } = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, parliamentaryUnitListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse(await listFn(query)); } catch (error) { return contentFailure(error); }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, parliamentaryUnitCreateSchema);
      if (parsed.response) return parsed.response;
      try { return jsonResponse({ item: await createFn(parsed.value, auth.staff) }, 201); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminParliamentaryItemHandlers({ guard = requireStaff, getFn = getParliamentaryAdmin, updateFn = updateParliamentary, deleteFn = deleteParliamentary } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, parliamentaryUnitIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const item = await getFn(parsedId.value); return item ? jsonResponse({ item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, parliamentaryUnitIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, parliamentaryUnitUpdateSchema);
      if (parsed.response) return parsed.response;
      try { const item = await updateFn(parsedId.value, parsed.value, auth.staff); return item ? jsonResponse({ item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, parliamentaryUnitIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try { const result = await deleteFn(parsedId.value, auth.staff); return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminParliamentaryStatusHandler({ guard = requireStaff, setFn = setParliamentaryPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, parliamentaryUnitIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, parliamentaryUnitStatusSchema);
    if (parsed.response) return parsed.response;
    try { const item = await setFn(parsedId.value, parsed.value.is_published, auth.staff); return item ? jsonResponse({ item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
  };
}
export function createPublicParliamentaryHandlers({ listFn = listParliamentaryPublic, getFn = getParliamentaryPublic } = {}) {
  return {
    list: async () => { try { return jsonResponse({ parliamentary_items: await listFn() }); } catch (error) { return contentFailure(error); } },
    get: async (_request, context) => {
      const parsedId = parseId((await context.params).id, parliamentaryUnitIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const item = await getFn(parsedId.value); return item ? jsonResponse({ item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
