import { createPublicParliamentaryHandlers } from "../../../../lib/content/handlers/parliamentary-unit.js";

const handlers = createPublicParliamentaryHandlers();

export const GET = handlers.list;
