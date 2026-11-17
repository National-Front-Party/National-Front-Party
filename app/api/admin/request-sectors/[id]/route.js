import { createServiceCatalogItemHandlers } from "../../../../../lib/service-catalogs/handlers.js";

const handlers = createServiceCatalogItemHandlers("request_sectors");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
