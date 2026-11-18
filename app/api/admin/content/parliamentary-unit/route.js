import { createAdminParliamentaryCollectionHandlers } from "../../../../../../lib/content/handlers/parliamentary-unit.js";

const handlers = createAdminParliamentaryCollectionHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
