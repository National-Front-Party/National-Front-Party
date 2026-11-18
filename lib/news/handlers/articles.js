import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  articleCreateSchema,
  articleIdSchema,
  articleQuerySchema,
  articleUpdateSchema,
  requestChangesSchema,
} from "../../validation/news.js";
import {
  createArticle,
  deleteArticle,
  getArticle,
  listArticlesAdmin,
  publishArticle,
  requestArticleChanges,
  submitArticleForReview,
  unpublishArticle,
  updateArticle,
} from "../../services/news-articles.js";
import {
  authorizeNewsAuthor,
  authorizeNewsDelete,
  authorizeNewsRead,
  authorizeNewsReviewer,
  newsFailure,
  parseNewsBody,
  parseNewsId,
  parseNewsQuery,
  serviceResultToResponse,
} from "../http.js";

const ARTICLE_BODY_MAX_BYTES = 256 * 1024;

export function createAdminNewsArticlesCollectionHandlers({
  guard = requireStaff,
  listFn = listArticlesAdmin,
  createFn = createArticle,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeNewsRead(request, guard);
      if (auth.response) return auth.response;
      const query = parseNewsQuery(request, articleQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try {
        const result = await listFn(query, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
    POST: async (request) => {
      const auth = await authorizeNewsAuthor(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseNewsBody(
        request,
        articleCreateSchema,
        ARTICLE_BODY_MAX_BYTES,
      );
      if (parsed.response) return parsed.response;
      try {
        const result = await createFn(parsed.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 201,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsArticleItemHandlers({
  guard = requireStaff,
  getFn = getArticle,
  updateFn = updateArticle,
  deleteFn = deleteArticle,
} = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeNewsRead(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const result = await getFn(parsedId.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeNewsAuthor(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseNewsBody(
        request,
        articleUpdateSchema,
        ARTICLE_BODY_MAX_BYTES,
      );
      if (parsed.response) return parsed.response;
      try {
        const result = await updateFn(parsedId.value, parsed.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeNewsDelete(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseNewsBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await deleteFn(parsedId.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsArticleSubmitHandler({
  guard = requireStaff,
  submitFn = submitArticleForReview,
} = {}) {
  return {
    POST: async (request, context) => {
      const auth = await authorizeNewsAuthor(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const result = await submitFn(parsedId.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsArticlePublishHandler({
  guard = requireStaff,
  publishFn = publishArticle,
} = {}) {
  return {
    POST: async (request, context) => {
      const auth = await authorizeNewsReviewer(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const result = await publishFn(parsedId.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsArticleRequestChangesHandler({
  guard = requireStaff,
  requestChangesFn = requestArticleChanges,
} = {}) {
  return {
    POST: async (request, context) => {
      const auth = await authorizeNewsReviewer(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseNewsBody(request, requestChangesSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await requestChangesFn(
          parsedId.value,
          parsed.value,
          auth.staff,
        );
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}

export function createAdminNewsArticleUnpublishHandler({
  guard = requireStaff,
  unpublishFn = unpublishArticle,
} = {}) {
  return {
    POST: async (request, context) => {
      const auth = await authorizeNewsReviewer(request, guard);
      if (auth.response) return auth.response;
      const { id } = await context.params;
      const parsedId = parseNewsId(id, articleIdSchema);
      if (parsedId.response) return parsedId.response;
      try {
        const result = await unpublishFn(parsedId.value, auth.staff);
        return serviceResultToResponse(result, {
          successStatus: 200,
          entityKey: "article",
        });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}
