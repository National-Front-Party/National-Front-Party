import { createStaffCollectionHandlers } from "../../../../lib/staff/handlers.js";

const handlers = createStaffCollectionHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
