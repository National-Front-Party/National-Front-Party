import { createAdminNewsArticleItemHandlers } from "../../../../../../lib/news/handlers/articles.js";

const handlers = createAdminNewsArticleItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
