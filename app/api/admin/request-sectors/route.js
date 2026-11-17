import { createServiceCatalogCollectionHandlers } from "../../../../lib/service-catalogs/handlers.js";

const handlers = createServiceCatalogCollectionHandlers("request_sectors");

export const GET = handlers.GET;
export const POST = handlers.POST;
