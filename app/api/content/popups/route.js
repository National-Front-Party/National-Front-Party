import { createPublicPopupsHandlers } from "../../../../lib/content/handlers/popups.js";

const handlers = createPublicPopupsHandlers();

export const GET = handlers.list;
