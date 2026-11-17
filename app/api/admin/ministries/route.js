import { createServiceCatalogCollectionHandlers } from "../../../../lib/service-catalogs/handlers.js";

const handlers = createServiceCatalogCollectionHandlers("ministries");

export const GET = handlers.GET;
export const POST = handlers.POST;
