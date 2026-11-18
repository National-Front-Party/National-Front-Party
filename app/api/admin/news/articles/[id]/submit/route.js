import { createAdminNewsArticleSubmitHandler } from "../../../../../../../lib/news/handlers/articles.js";

const handlers = createAdminNewsArticleSubmitHandler();

export const POST = handlers.POST;
