import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  newsSourceCreateSchema,
  newsSourceQuerySchema,
  newsSourceStatusSchema,
  newsSourceUpdateSchema,
  sourceIdSchema,
} from "../../validation/news.js";
import {
  createNewsSource,
  deleteAllNewsSources,
  deleteNewsSource,
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

function sourceDeletionResponse(result) {
  if (result.ok) {
    const data = result.data ?? {};
    return jsonResponse(
      {
        ok: true,
        ...(data.id !== undefined ? { id: data.id } : {}),
        ...(data.deleted_count !== undefined
          ? { deleted_count: data.deleted_count }
          : {}),
      },
      200,
    );
  }

  switch (result.code) {
    case "UNAUTHORIZED":
      return jsonResponse({ error: "FORBIDDEN" }, 403);
    case "NOT_FOUND":
      return jsonResponse({ error: "NOT_FOUND" }, 404);
    case "SOURCE_IN_USE":
      return jsonResponse(
        {
          error: "SOURCE_IN_USE",
          ...(result.source_id !== undefined ? { source_id: result.source_id } : {}),
          ...(result.source_ids !== undefined ? { source_ids: result.source_ids } : {}),
          ...(result.reference_count !== undefined
            ? { reference_count: result.reference_count }
            : {}),
        },
        409,
      );
    default:
      return jsonResponse({ error: "SERVER_ERROR" }, 500);
  }
}

function isSourceReferenceConstraintError(error) {
  return error?.code === "P2003" &&
    String(error.meta?.field_name ?? "").includes("source_id");
}

export function createAdminNewsSourcesCollectionHandlers({
  guard = requireStaff,
  listFn = listNewsSourcesAdmin,
  createFn = createNewsSource,
  deleteAllFn = deleteAllNewsSources,
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
    DELETE: async (request) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseNewsBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await deleteAllFn(auth.staff);
        return sourceDeletionResponse(result);
      } catch (error) {
        if (isSourceReferenceConstraintError(error)) {
          return jsonResponse({ error: "SOURCE_IN_USE" }, 409);
        }
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsSourceItemHandlers({
  guard = requireStaff,
  getFn = getNewsSource,
  updateFn = updateNewsSource,
  deleteFn = deleteNewsSource,
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
    DELETE: async (request, context) => {
      const auth = await authorizeNewsSuperAdmin(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, sourceIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseNewsBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await deleteFn(parsedId.value, auth.staff);
        return sourceDeletionResponse(result);
      } catch (error) {
        if (isSourceReferenceConstraintError(error)) {
          return jsonResponse(
            { error: "SOURCE_IN_USE", source_id: parsedId.value },
            409,
          );
        }
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
