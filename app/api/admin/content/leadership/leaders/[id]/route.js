import { createAdminLeaderItemHandlers } from "../../../../../../../lib/content/handlers/leadership.js";

const handlers = createAdminLeaderItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
