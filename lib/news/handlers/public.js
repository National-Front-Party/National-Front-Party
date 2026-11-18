import { createRateLimiter } from "../../rate-limit.js";
import { getClientIp, logAuthError } from "../../auth/http.js";
import { articlePublicQuerySchema } from "../../validation/news.js";
import {
  getArticlePublicBySlug,
  listArticlesPublic,
} from "../../services/news-articles.js";

export const PUBLIC_CACHE_HEADERS = Object.freeze({
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
});

export const NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
});

const defaultRateLimiter = createRateLimiter({
  limit: 120,
  windowMs: 60 * 1000,
});

export function createPublicNewsHandlers({
  listFn = listArticlesPublic,
  getFn = getArticlePublicBySlug,
  rateLimiter = defaultRateLimiter,
} = {}) {
  return {
    list: async (request) => {
      const ip = getClientIp(request);
      const rateLimit = rateLimiter(ip ?? "unknown");
      if (!rateLimit.allowed) {
        return Response.json(
          { error: "RATE_LIMITED" },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              "Retry-After": String(rateLimit.retryAfterSeconds),
            },
          },
        );
      }

      const url = new URL(request.url);
      const entries = [...url.searchParams.entries()];
      if (new Set(entries.map(([key]) => key)).size !== entries.length) {
        return Response.json(
          { error: "VALIDATION" },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }

      const parsed = articlePublicQuerySchema.safeParse(Object.fromEntries(entries));
      if (!parsed.success) {
        return Response.json(
          { error: "VALIDATION" },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }

      try {
        const result = await listFn(parsed.data);
        if (!result.ok) {
          return Response.json(
            { error: "SERVER_ERROR" },
            { status: 500, headers: NO_STORE_HEADERS },
          );
        }
        return Response.json(
          { news: result.data.items, pagination: result.data.pagination },
          { status: 200, headers: PUBLIC_CACHE_HEADERS },
        );
      } catch (error) {
        logAuthError(error);
        return Response.json(
          { error: "SERVER_ERROR" },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    },

    get: async (request, context) => {
      const ip = getClientIp(request);
      const rateLimit = rateLimiter(ip ?? "unknown");
      if (!rateLimit.allowed) {
        return Response.json(
          { error: "RATE_LIMITED" },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              "Retry-After": String(rateLimit.retryAfterSeconds),
            },
          },
        );
      }

      const { slug } = await context.params;
      let decodedSlug = slug;
      try {
        decodedSlug = decodeURIComponent(slug);
      } catch {
        return Response.json(
          { error: "NOT_FOUND" },
          { status: 404, headers: NO_STORE_HEADERS },
        );
      }

      try {
        const result = await getFn(decodedSlug);
        if (!result.ok || !result.data) {
          return Response.json(
            { error: "NOT_FOUND" },
            { status: 404, headers: NO_STORE_HEADERS },
          );
        }
        return Response.json(
          { article: result.data },
          { status: 200, headers: PUBLIC_CACHE_HEADERS },
        );
      } catch (error) {
        logAuthError(error);
        return Response.json(
          { error: "SERVER_ERROR" },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    },
  };
}
