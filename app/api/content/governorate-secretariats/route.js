import { createPublicGovernorateSecretariatsHandlers } from "../../../../lib/content/handlers/governorate-secretariats.js";

const handlers = createPublicGovernorateSecretariatsHandlers();

export const GET = handlers.list;
