import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  centralSecretariatCreateSchema,
  centralSecretariatIdSchema,
  centralSecretariatListQuerySchema,
  centralSecretariatPersonCreateSchema,
  centralSecretariatPersonIdSchema,
  centralSecretariatPersonStatusSchema,
  centralSecretariatPersonUpdateSchema,
  centralSecretariatStatusSchema,
  centralSecretariatUpdateSchema,
} from "../../validation/content/central-secretariats.js";
import {
  createCentralSecretariat,
  createCentralSecretariatPerson,
  deleteCentralSecretariat,
  deleteCentralSecretariatPerson,
  getCentralSecretariatAdmin,
  getCentralSecretariatPersonAdmin,
  getCentralSecretariatPublic,
  listCentralSecretariatsAdmin,
  listCentralSecretariatsPublic,
  setCentralSecretariatPersonPublished,
  setCentralSecretariatPublished,
  updateCentralSecretariat,
  updateCentralSecretariatPerson,
} from "../../services/content-central-secretariats.js";
import {
  authorizeContent,
  authorizeContentDelete,
  contentFailure,
  parseBody,
  parseId,
  parseQuery,
} from "../http.js";

export function createAdminCentralSecretariatsCollectionHandlers({ guard = requireStaff, listFn = listCentralSecretariatsAdmin, createFn = createCentralSecretariat } = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, centralSecretariatListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse(await listFn(query)); } catch (error) { return contentFailure(error); }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, centralSecretariatCreateSchema);
      if (parsed.response) return parsed.response;
      try { return jsonResponse({ central_secretariat: await createFn(parsed.value, auth.staff) }, 201); } catch (error) { return contentFailure(error); }
    },
  };
}

export function createAdminCentralSecretariatItemHandlers({ guard = requireStaff, getFn = getCentralSecretariatAdmin, updateFn = updateCentralSecretariat, deleteFn = deleteCentralSecretariat } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, centralSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const item = await getFn(parsedId.value); return item ? jsonResponse({ central_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, centralSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, centralSecretariatUpdateSchema);
      if (parsed.response) return parsed.response;
      try { const item = await updateFn(parsedId.value, parsed.value, auth.staff); return item ? jsonResponse({ central_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, centralSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try { const result = await deleteFn(parsedId.value, auth.staff); return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}

export function createAdminCentralSecretariatStatusHandler({ guard = requireStaff, setFn = setCentralSecretariatPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, centralSecretariatIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, centralSecretariatStatusSchema);
    if (parsed.response) return parsed.response;
    try { const item = await setFn(parsedId.value, parsed.value.is_published, auth.staff); return item ? jsonResponse({ central_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    };
}

export function createAdminCentralSecretariatPeopleCollectionHandlers({ guard = requireStaff, createFn = createCentralSecretariatPerson } = {}) {
  return {
    POST: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, centralSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, centralSecretariatPersonCreateSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await createFn(parsedId.value, parsed.value, auth.staff);
        if (result?.notFound) return jsonResponse({ error: "NOT_FOUND" }, 404);
        return jsonResponse({ person: result.person }, 201);
      } catch (error) { return contentFailure(error); }
    },
  };
}

export function createAdminCentralSecretariatPersonItemHandlers({ guard = requireStaff, getFn = getCentralSecretariatPersonAdmin, updateFn = updateCentralSecretariatPerson, deleteFn = deleteCentralSecretariatPerson } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const params = await context.params;
      const parsedSecretariatId = parseId(params.id, centralSecretariatIdSchema);
      if (parsedSecretariatId.response) return parsedSecretariatId.response;
      const parsedPersonId = parseId(params.personId, centralSecretariatPersonIdSchema);
      if (parsedPersonId.response) return parsedPersonId.response;
      try {
        const person = await getFn(parsedSecretariatId.value, parsedPersonId.value);
        return person ? jsonResponse({ person }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const params = await context.params;
      const parsedSecretariatId = parseId(params.id, centralSecretariatIdSchema);
      if (parsedSecretariatId.response) return parsedSecretariatId.response;
      const parsedPersonId = parseId(params.personId, centralSecretariatPersonIdSchema);
      if (parsedPersonId.response) return parsedPersonId.response;
      const parsed = await parseBody(request, centralSecretariatPersonUpdateSchema);
      if (parsed.response) return parsed.response;
      try {
        const person = await updateFn(parsedSecretariatId.value, parsedPersonId.value, parsed.value, auth.staff);
        return person ? jsonResponse({ person }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const params = await context.params;
      const parsedSecretariatId = parseId(params.id, centralSecretariatIdSchema);
      if (parsedSecretariatId.response) return parsedSecretariatId.response;
      const parsedPersonId = parseId(params.personId, centralSecretariatPersonIdSchema);
      if (parsedPersonId.response) return parsedPersonId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await deleteFn(parsedSecretariatId.value, parsedPersonId.value, auth.staff);
        return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return contentFailure(error); }
    },
  };
}

export function createAdminCentralSecretariatPersonStatusHandler({ guard = requireStaff, setFn = setCentralSecretariatPersonPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const params = await context.params;
    const parsedSecretariatId = parseId(params.id, centralSecretariatIdSchema);
    if (parsedSecretariatId.response) return parsedSecretariatId.response;
    const parsedPersonId = parseId(params.personId, centralSecretariatPersonIdSchema);
    if (parsedPersonId.response) return parsedPersonId.response;
    const parsed = await parseBody(request, centralSecretariatPersonStatusSchema);
    if (parsed.response) return parsed.response;
    try {
      const person = await setFn(parsedSecretariatId.value, parsedPersonId.value, parsed.value.is_published, auth.staff);
      return person ? jsonResponse({ person }) : jsonResponse({ error: "NOT_FOUND" }, 404);
    } catch (error) { return contentFailure(error); }
  };
}

export function createPublicCentralSecretariatsHandlers({ listFn = listCentralSecretariatsPublic, getFn = getCentralSecretariatPublic } = {}) {
  return {
    list: async () => { try { return jsonResponse({ central_secretariats: await listFn() }); } catch (error) { return contentFailure(error); } },
    get: async (_request, context) => {
      const parsedId = parseId((await context.params).id, centralSecretariatIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const item = await getFn(parsedId.value); return item ? jsonResponse({ central_secretariat: item }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); } },
  };
}
