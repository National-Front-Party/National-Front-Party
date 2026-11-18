import { createAdminGovernorateSecretariatItemHandlers } from "../../../../../../lib/content/handlers/governorate-secretariats.js";

const handlers = createAdminGovernorateSecretariatItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
