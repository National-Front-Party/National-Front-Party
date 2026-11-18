import { createAdminNewsArticleRequestChangesHandler } from "../../../../../../../lib/news/handlers/articles.js";

const handlers = createAdminNewsArticleRequestChangesHandler();

export const POST = handlers.POST;
