import { createApplicationDetailHandler } from "../../../../../lib/applications/read-handlers.js";
import { createApplicationDeleteHandler } from "../../../../../lib/applications/delete-handler.js";

export const GET = createApplicationDetailHandler();

export const DELETE = createApplicationDeleteHandler();
