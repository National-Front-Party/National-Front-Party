import { createAdminNewsArticlesCollectionHandlers } from "../../../../../lib/news/handlers/articles.js";

const handlers = createAdminNewsArticlesCollectionHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
