import { requireStaff } from "../auth/guard.js";
import { jsonResponse, logAuthError, readJsonBody } from "../auth/http.js";
import {
  createServiceCatalogItem,
  getServiceCatalogItem,
  listServiceCatalog,
  setServiceCatalogActive,
  updateServiceCatalogItem,
} from "../services/service-catalogs.js";
import {
  catalogIdSchema,
  catalogListQuerySchema,
  catalogStatusSchema,
  ministryCreateSchema,
  ministryUpdateSchema,
  requestSectorCreateSchema,
  requestSectorUpdateSchema,
} from "../validation/service-catalogs.js";

const CATALOG_CONFIG = Object.freeze({
  ministries: Object.freeze({
    pluralKey: "ministries",
    singularKey: "ministry",
    createSchema: ministryCreateSchema,
    updateSchema: ministryUpdateSchema,
    conflict: "DUPLICATE_SLUG",
  }),
  request_sectors: Object.freeze({
    pluralKey: "request_sectors",
    singularKey: "request_sector",
    createSchema: requestSectorCreateSchema,
    updateSchema: requestSectorUpdateSchema,
    conflict: "DUPLICATE_CODE",
  }),
});

function configFor(catalog) {
  const config = CATALOG_CONFIG[catalog];
  if (!config) throw new TypeError("Unknown service catalog");
  return config;
}

function failure(error, duplicateCode) {
  if (error?.code === "P2002") {
    return jsonResponse({ error: duplicateCode }, 409);
  }
  if (error?.code === "P2025") {
    return jsonResponse({ error: "NOT_FOUND" }, 404);
  }
  logAuthError(error);
  return jsonResponse({ error: "SERVER_ERROR" }, 500);
}

async function authorize(request, guard) {
  const staff = await guard(request, { permission: "services:manage" });
  return staff instanceof Response ? { response: staff } : { staff };
}

async function parseBody(request, schema) {
  const body = await readJsonBody(request);
  if (body.response) return body;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  return { value: parsed.data };
}

function parseId(id) {
  const parsed = catalogIdSchema.safeParse(id);
  return parsed.success
    ? { value: parsed.data }
    : { response: jsonResponse({ error: "VALIDATION" }, 400) };
}

function parseListQuery(request) {
  const url = new URL(request.url);
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return null;
  const parsed = catalogListQuerySchema.safeParse(Object.fromEntries(entries));
  return parsed.success ? parsed.data : null;
}

export function createServiceCatalogCollectionHandlers(catalog, {
  guard = requireStaff,
  listFn = listServiceCatalog,
  createFn = createServiceCatalogItem,
} = {}) {
  const config = configFor(catalog);
  return {
    GET: async (request) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const query = parseListQuery(request);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try {
        const result = await listFn(catalog, query);
        return jsonResponse({ [config.pluralKey]: result.items, pagination: result.pagination });
      } catch (error) {
        return failure(error, config.conflict);
      }
    },
    POST: async (request) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, config.createSchema);
      if (parsed.response) return parsed.response;
      try {
        const item = await createFn(catalog, parsed.value);
        return jsonResponse({ [config.singularKey]: item }, 201);
      } catch (error) {
        return failure(error, config.conflict);
      }
    },
  };
}

export function createServiceCatalogItemHandlers(catalog, {
  guard = requireStaff,
  getFn = getServiceCatalogItem,
  updateFn = updateServiceCatalogItem,
} = {}) {
  const config = configFor(catalog);
  return {
    GET: async (request, context) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id);
      if (parsedId.response) return parsedId.response;
      try {
        const item = await getFn(catalog, parsedId.value);
        return item
          ? jsonResponse({ [config.singularKey]: item })
          : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return failure(error, config.conflict);
      }
    },
    PATCH: async (request, context) => {
      const auth = await authorize(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseId(id);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, config.updateSchema);
      if (parsed.response) return parsed.response;
      try {
        const item = await updateFn(catalog, parsedId.value, parsed.value);
        return jsonResponse({ [config.singularKey]: item });
      } catch (error) {
        return failure(error, config.conflict);
      }
    },
  };
}

export function createServiceCatalogStatusHandler(catalog, {
  guard = requireStaff,
  setActiveFn = setServiceCatalogActive,
} = {}) {
  const config = configFor(catalog);
  return async (request, context) => {
    const auth = await authorize(request, guard);
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const parsedId = parseId(id);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, catalogStatusSchema);
    if (parsed.response) return parsed.response;
    try {
      const item = await setActiveFn(catalog, parsedId.value, parsed.value.is_active);
      return jsonResponse({ [config.singularKey]: item });
    } catch (error) {
      return failure(error, config.conflict);
    }
  };
}
