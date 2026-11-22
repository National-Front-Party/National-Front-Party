import { createServiceRequestDetailHandler } from "../../../../../lib/service-requests/read-handlers.js";
import { createServiceRequestDeleteHandler } from "../../../../../lib/service-requests/delete-handler.js";

export const GET = createServiceRequestDetailHandler();

export const DELETE = createServiceRequestDeleteHandler();
