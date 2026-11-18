import { createPublicCentralSecretariatsHandlers } from "../../../../lib/content/handlers/central-secretariats.js";

const handlers = createPublicCentralSecretariatsHandlers();

export const GET = handlers.list;
