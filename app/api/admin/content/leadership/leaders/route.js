import { createAdminLeadersCollectionHandlers } from "../../../../../../lib/content/handlers/leadership.js";

const handlers = createAdminLeadersCollectionHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
