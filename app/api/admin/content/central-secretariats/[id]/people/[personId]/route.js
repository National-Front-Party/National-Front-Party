import { createAdminCentralSecretariatPersonItemHandlers } from "../../../../../../../../lib/content/handlers/central-secretariats.js";

const handlers = createAdminCentralSecretariatPersonItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
