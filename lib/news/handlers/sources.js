import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import {
  newsSourceCreateSchema,
  newsSourceQuerySchema,
  newsSourceStatusSchema,
  newsSourceUpdateSchema,
  sourceIdSchema,
} from "../../validation/news.js";
import {
  createNewsSource,
  getNewsSource,
  listNewsSourcesAdmin,
  setNewsSourceActive,
  updateNewsSource,
} from "../../services/news-sources.js";
import {
  authorizeNewsSuperAdmin,
  newsFailure,
  parseNewsBody,
  parseNewsId,
  parseNewsQuery,
  serviceResultToResponse,
} from "../http.js";

export function createAdminNewsSourcesCollectionHandlers({
  guard = requireStaff,
  listFn = listNewsSourcesAdmin,
  createFn = createNewsSource,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const query = parseNewsQuery(request, newsSourceQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try {
        const result = await listFn(query, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "source",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
    POST: async (request) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseNewsBody(request, newsSourceCreateSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await createFn(parsed.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 201,
          entityKey: "source",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsSourceItemHandlers({
  guard = requireStaff,
  getFn = getNewsSource,
  updateFn = updateNewsSource,
} = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, sourceIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const result = await getFn(parsedId.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "source",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, sourceIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseNewsBody(request, newsSourceUpdateSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await updateFn(parsedId.value, parsed.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "source",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsSourceStatusHandler({
  guard = requireStaff,
  setStatusFn = setNewsSourceActive,
} = {}) {
  return {
    PATCH: async (request, context) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, sourceIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseNewsBody(request, newsSourceStatusSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await setStatusFn(
          parsedId.value,
          parsed.value.is_active,
          auth.staff,
        );
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "source",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}
