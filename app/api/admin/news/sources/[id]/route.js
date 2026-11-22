import { createAdminNewsSourceItemHandlers } from "../../../../../../lib/news/handlers/sources.js";

const handlers = createAdminNewsSourceItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
