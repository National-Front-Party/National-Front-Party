import { createServiceCatalogItemHandlers } from "../../../../../lib/service-catalogs/handlers.js";

const handlers = createServiceCatalogItemHandlers("ministries");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
