import { createPublicNewsHandlers } from "../../../../../lib/news/handlers/public.js";

const handlers = createPublicNewsHandlers();

export const GET = handlers.get;
