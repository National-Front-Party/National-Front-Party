import { requireStaff } from "../../auth/guard.js";
import { jsonResponse, readJsonBody } from "../../auth/http.js";
import {
  partyProgramDiscardSchema,
  partyProgramDraftSchema,
  partyProgramPublishSchema,
} from "../../validation/content/party-program.js";
import {
  discardPartyProgramDraft,
  getPartyProgramAdmin,
  publishPartyProgramDraft,
  savePartyProgramDraft,
} from "../../services/content-party-program.js";
import { authorizeContent, contentFailure } from "../http.js";

const DRAFT_MAX_BYTES = 250 * 1024;

async function parseBody(request, schema, maxBytes = 10 * 1024) {
  const body = await readJsonBody(request, maxBytes);
  if (body.response) return body;
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return { response: jsonResponse({ error: "VALIDATION" }, 400) };
  return { value: parsed.data };
}

export function createAdminPartyProgramHandlers({
  guard = requireStaff,
  getFn = getPartyProgramAdmin,
} = {}) {
  return {
    GET: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      try {
        const result = await getFn();
        return jsonResponse(result);
      } catch (error) {
        return contentFailure(error);
      }
    },
  };
}

export function createAdminPartyProgramDraftHandlers({
  guard = requireStaff,
  saveDraftFn = savePartyProgramDraft,
  discardFn = discardPartyProgramDraft,
} = {}) {
  return {
    PUT: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, partyProgramDraftSchema, DRAFT_MAX_BYTES);
      if (parsed.response) return parsed.response;
      try {
        const draft = await saveDraftFn(parsed.value, auth.staff);
        return jsonResponse({ draft }, 200);
      } catch (error) {
        return contentFailure(error);
      }
    },
    DELETE: async (request) => {
      const auth = await authorizeContent(request, guard);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, partyProgramDiscardSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await discardFn(auth.staff);
        return result ? jsonResponse(result, 200) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        if (error?.code === "NOT_FOUND" || error?.status === 404) {
          return jsonResponse({ error: "NOT_FOUND" }, 404);
        }
        return contentFailure(error);
      }
    },
  };
}

export function createAdminPartyProgramPublishHandler({
  guard = requireStaff,
  publishFn = publishPartyProgramDraft,
} = {}) {
  const handler = async (request) => {
    const auth = await authorizeContent(request, guard);
    if (auth.response) return auth.response;
    const contentType = request.headers.get("content-type");
    if (contentType) {
      const parsed = await parseBody(request, partyProgramPublishSchema);
      if (parsed.response) return parsed.response;
    }
    try {
      const result = await publishFn(auth.staff);
      return jsonResponse(result, 200);
    } catch (error) {
      if (error?.code === "NO_DRAFT_TO_PUBLISH" || error?.status === 400) {
        return jsonResponse({ error: "NO_DRAFT_TO_PUBLISH" }, 400);
      }
      return contentFailure(error);
    }
  };
  handler.POST = handler;
  return handler;
}
