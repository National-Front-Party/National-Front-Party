import { createAdminLeadershipContentItemHandlers } from "../../../../../../../lib/content/handlers/leadership.js";

const handlers = createAdminLeadershipContentItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
