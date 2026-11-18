import { createAdminNewsArticlePublishHandler } from "../../../../../../../lib/news/handlers/articles.js";

const handlers = createAdminNewsArticlePublishHandler();

export const POST = handlers.POST;
