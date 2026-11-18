import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { deleteConfirmSchema } from "../../validation/content/common.js";
import {
  leaderCreateSchema,
  leaderIdSchema,
  leaderListQuerySchema,
  leaderStatusSchema,
  leaderUpdateSchema,
  leadershipContentCreateSchema,
  leadershipContentIdSchema,
  leadershipContentListQuerySchema,
  leadershipContentStatusSchema,
  leadershipContentUpdateSchema,
  panelCreateSchema,
  panelIdSchema,
  panelListQuerySchema,
  panelStatusSchema,
  panelUpdateSchema,
} from "../../validation/content/leadership.js";
import {
  createLeader,
  createLeadershipContent,
  createPanel,
  deleteLeader,
  deleteLeadershipContent,
  deletePanel,
  getLeaderAdmin,
  getLeadershipContentAdmin,
  getPanelAdmin,
  getLeadershipPublic,
  listLeadersAdmin,
  listLeadershipContentsAdmin,
  listPanelsAdmin,
  setLeaderPublished,
  setLeadershipContentPublished,
  setPanelPublished,
  updateLeader,
  updateLeadershipContent,
  updatePanel,
} from "../../services/content-leadership.js";
import {
  authorizeContent,
  authorizeContentDelete,
  contentFailure,
  parseBody,
  parseId,
  parseQuery,
} from "../http.js";

export function createAdminPanelsCollectionHandlers({ guard = requireStaff, listFn = listPanelsAdmin, createFn = createPanel } = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, panelListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse(await listFn(query)); } catch (error) { return contentFailure(error); }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, panelCreateSchema);
      if (parsed.response) return parsed.response;
      try { return jsonResponse({ panel: await createFn(parsed.value, auth.staff) }, 201); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminPanelItemHandlers({ guard = requireStaff, getFn = getPanelAdmin, updateFn = updatePanel, deleteFn = deletePanel } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, panelIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const p = await getFn(parsedId.value); return p ? jsonResponse({ panel: p }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, panelIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, panelUpdateSchema);
      if (parsed.response) return parsed.response;
      try { const p = await updateFn(parsedId.value, parsed.value, auth.staff); return p ? jsonResponse({ panel: p }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, panelIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try { const r = await deleteFn(parsedId.value, auth.staff); return r ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminPanelStatusHandler({ guard = requireStaff, setFn = setPanelPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, panelIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, panelStatusSchema);
    if (parsed.response) return parsed.response;
    try { const p = await setFn(parsedId.value, parsed.value.is_published, auth.staff); return p ? jsonResponse({ panel: p }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
  };
}

export function createAdminLeadersCollectionHandlers({ guard = requireStaff, listFn = listLeadersAdmin, createFn = createLeader } = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, leaderListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse(await listFn(query)); } catch (error) { return contentFailure(error); }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, leaderCreateSchema);
      if (parsed.response) return parsed.response;
      try { return jsonResponse({ leader: await createFn(parsed.value, auth.staff) }, 201); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminLeaderItemHandlers({ guard = requireStaff, getFn = getLeaderAdmin, updateFn = updateLeader, deleteFn = deleteLeader } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, leaderIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const l = await getFn(parsedId.value); return l ? jsonResponse({ leader: l }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, leaderIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, leaderUpdateSchema);
      if (parsed.response) return parsed.response;
      try { const l = await updateFn(parsedId.value, parsed.value, auth.staff); return l ? jsonResponse({ leader: l }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, leaderIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try { const r = await deleteFn(parsedId.value, auth.staff); return r ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminLeaderStatusHandler({ guard = requireStaff, setFn = setLeaderPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, leaderIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, leaderStatusSchema);
    if (parsed.response) return parsed.response;
    try { const l = await setFn(parsedId.value, parsed.value.is_published, auth.staff); return l ? jsonResponse({ leader: l }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
  };
}

export function createAdminLeadershipContentsCollectionHandlers({ guard = requireStaff, listFn = listLeadershipContentsAdmin, createFn = createLeadershipContent } = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const query = parseQuery(request, leadershipContentListQuerySchema);
      if (!query) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse(await listFn(query)); } catch (error) { return contentFailure(error); }
    },
    POST: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, leadershipContentCreateSchema);
      if (parsed.response) return parsed.response;
      try { return jsonResponse({ content: await createFn(parsed.value, auth.staff) }, 201); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminLeadershipContentItemHandlers({ guard = requireStaff, getFn = getLeadershipContentAdmin, updateFn = updateLeadershipContent, deleteFn = deleteLeadershipContent } = {}) {
  return {
    GET: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, leadershipContentIdSchema);
      if (parsedId.response) return parsedId.response;
      try { const c = await getFn(parsedId.value); return c ? jsonResponse({ content: c }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    PATCH: async (request, context) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, leadershipContentIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, leadershipContentUpdateSchema);
      if (parsed.response) return parsed.response;
      try { const c = await updateFn(parsedId.value, parsed.value, auth.staff); return c ? jsonResponse({ content: c }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorizeContentDelete(request, guard);
      if (auth.response) return auth.response;
      const parsedId = parseId((await context.params).id, leadershipContentIdSchema);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, deleteConfirmSchema);
      if (parsed.response) return parsed.response;
      try { const r = await deleteFn(parsedId.value, auth.staff); return r ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
    },
  };
}
export function createAdminLeadershipContentStatusHandler({ guard = requireStaff, setFn = setLeadershipContentPublished } = {}) {
  return async (request, context) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const parsedId = parseId((await context.params).id, leadershipContentIdSchema);
    if (parsedId.response) return parsedId.response;
    const parsed = await parseBody(request, leadershipContentStatusSchema);
    if (parsed.response) return parsed.response;
    try { const c = await setFn(parsedId.value, parsed.value.is_published, auth.staff); return c ? jsonResponse({ content: c }) : jsonResponse({ error: "NOT_FOUND" }, 404); } catch (error) { return contentFailure(error); }
  };
}

export function createPublicLeadershipHandler({ getFn = getLeadershipPublic } = {}) {
  return async () => {
    try { return jsonResponse(await getFn()); } catch (error) { return contentFailure(error); }
  };
}
