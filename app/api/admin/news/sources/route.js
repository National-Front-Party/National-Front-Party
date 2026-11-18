import { createAdminNewsSourcesCollectionHandlers } from "../../../../../lib/news/handlers/sources.js";

const handlers = createAdminNewsSourcesCollectionHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
