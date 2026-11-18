import { createAdminCentralSecretariatItemHandlers } from "../../../../../../../lib/content/handlers/central-secretariats.js";

const handlers = createAdminCentralSecretariatItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
