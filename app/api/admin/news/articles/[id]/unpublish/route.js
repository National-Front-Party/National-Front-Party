import { createAdminNewsArticleUnpublishHandler } from "../../../../../../../lib/news/handlers/articles.js";

const handlers = createAdminNewsArticleUnpublishHandler();

export const POST = handlers.POST;
