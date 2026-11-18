import { createAdminNewsSourceStatusHandler } from "../../../../../../../lib/news/handlers/sources.js";

const handlers = createAdminNewsSourceStatusHandler();

export const PATCH = handlers.PATCH;
