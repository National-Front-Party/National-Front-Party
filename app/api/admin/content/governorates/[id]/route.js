import { createAdminGovernorateItemHandlers } from "../../../../../../lib/content/handlers/governorates.js";

const handlers = createAdminGovernorateItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
