import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { listActiveNewsSources } from "../../services/news-sources.js";
import { authorizeNewsAuthor, newsFailure } from "../http.js";

export function createArticleSourcesHandler({
  guard = requireStaff,
  listFn = listActiveNewsSources,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeNewsAuthor(request, guard);
      if (auth.response) return auth.response;

      try {
        const sources = await listFn();
        return jsonResponse({ sources });
      } catch (error) {
        return newsFailure(error);
      }
    },
  };
}
