import {
  createStaffAuditLogDeleteHandler,
  createStaffAuditLogHandler,
} from "../../../../../lib/staff/handlers.js";

export const GET = createStaffAuditLogHandler();
export const DELETE = createStaffAuditLogDeleteHandler();
