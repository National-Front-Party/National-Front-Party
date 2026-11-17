import { createStaffItemHandlers } from "../../../../../lib/staff/handlers.js";

const handlers = createStaffItemHandlers();

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
