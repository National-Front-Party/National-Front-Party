import { createAdminParliamentaryItemHandlers } from "../../../../../../../lib/content/handlers/parliamentary-unit.js";

const handlers = createAdminParliamentaryItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
