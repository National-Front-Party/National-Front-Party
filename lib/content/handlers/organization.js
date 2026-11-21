import { requireStaff } from "../../auth/guard.js";
import { jsonResponse } from "../../auth/http.js";
import { smallintIdSchema, statusSchema } from "../../validation/content/common.js";
import {
  centerCreateSchema, centerUpdateSchema, localSecretariatCreateSchema, localSecretariatUpdateSchema,
  organizationDeleteSchema, organizationIdSchema, organizationPersonIdSchema, organizationStatusSchema,
  partyUnitCreateSchema, partyUnitPersonCreateSchema, partyUnitPersonUpdateSchema, partyUnitUpdateSchema,
} from "../../validation/organization.js";
import * as service from "../../services/organization.js";
import { contentFailure, parseBody, parseId } from "../http.js";

const permission = "organization:manage";
async function authorize(request, guard) {
  const staff = await guard(request, { permission });
  return staff instanceof Response ? { response: staff } : { staff };
}
function queryId(request, key) {
  const raw = new URL(request.url).searchParams.get(key);
  if (raw == null) return undefined;
  const parsed = smallintIdSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
function idParam(context, key = "id", schema = organizationIdSchema) {
  return context.params.then((params) => parseId(params[key], schema));
}
function failure(error) {
  if (error?.code === "ORGANIZATION_PARENT_HAS_CHILDREN") return jsonResponse({ error: "HAS_CHILDREN" }, 409);
  if (error?.code === "P2002") return jsonResponse({ error: "DUPLICATE_NAME" }, 409);
  if (error?.code === "P2003") return jsonResponse({ error: "INVALID_PARENT" }, 400);
  return contentFailure(error);
}
function collectionHandlers({ list, create, schema, queryKey }) {
  return {
    GET: async (request) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parentId = queryKey ? queryId(request, queryKey) : undefined;
      if (parentId === null) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse({ items: await list(queryKey ? { [queryKey]: parentId } : {}) }); }
      catch (error) { return failure(error); }
    },
    POST: async (request) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parsed = await parseBody(request, schema);
      if (parsed.response) return parsed.response;
      try {
        const result = await create(parsed.value, auth.staff);
        if (result?.code) return jsonResponse({ error: result.code }, result.code.startsWith("INVALID_") ? 400 : 409);
        return jsonResponse({ item: result?.item ?? result }, 201);
      } catch (error) { return failure(error); }
    },
  };
}
function itemHandlers({ entity, updateSchema, update, remove, status }) {
  return {
    PATCH: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parsedId = await idParam(context);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, updateSchema);
      if (parsed.response) return parsed.response;
      try {
        const item = await update(parsedId.value, parsed.value, auth.staff);
        return item ? jsonResponse({ [entity]: item }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return failure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parsedId = await idParam(context);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, organizationDeleteSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await remove(parsedId.value, auth.staff);
        if (!result) return jsonResponse({ error: "NOT_FOUND" }, 404);
        if (result.code === "HAS_CHILDREN") return jsonResponse({ error: "HAS_CHILDREN" }, 409);
        return jsonResponse({ deleted: true });
      } catch (error) { return failure(error); }
    },
    status: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parsedId = await idParam(context);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, organizationStatusSchema);
      if (parsed.response) return parsed.response;
      try {
        const item = await status(parsedId.value, parsed.value.is_active, auth.staff);
        return item ? jsonResponse({ [entity]: item }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return failure(error); }
    },
  };
}

export function createAdminCentersHandlers() {
  return collectionHandlers({ list: service.listCentersAdmin, create: service.createCenter, schema: centerCreateSchema, queryKey: "governorate_id" });
}
export function createAdminCenterItemHandlers() {
  return itemHandlers({ entity: "center", updateSchema: centerUpdateSchema, update: service.updateCenter, remove: service.deleteCenter, status: service.setCenterActive });
}
export function createAdminLocalSecretariatsHandlers() {
  return collectionHandlers({ list: service.listLocalSecretariatsAdmin, create: service.createLocalSecretariat, schema: localSecretariatCreateSchema, queryKey: "center_id" });
}
export function createAdminLocalSecretariatItemHandlers() {
  return itemHandlers({ entity: "local_secretariat", updateSchema: localSecretariatUpdateSchema, update: service.updateLocalSecretariat, remove: service.deleteLocalSecretariat, status: service.setLocalSecretariatActive });
}
export function createAdminPartyUnitsHandlers() {
  return collectionHandlers({ list: service.listPartyUnitsAdmin, create: service.createPartyUnit, schema: partyUnitCreateSchema, queryKey: "secretariat_id" });
}
export function createAdminPartyUnitItemHandlers() {
  return itemHandlers({ entity: "party_unit", updateSchema: partyUnitUpdateSchema, update: service.updatePartyUnit, remove: service.deletePartyUnit, status: service.setPartyUnitActive });
}

export function createAdminPartyUnitPeopleHandlers() {
  return {
    GET: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parsedId = await idParam(context);
      if (parsedId.response) return parsedId.response;
      try { return jsonResponse({ people: await service.listPartyUnitPeopleAdmin(parsedId.value) }); }
      catch (error) { return failure(error); }
    },
    POST: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const parsedId = await idParam(context);
      if (parsedId.response) return parsedId.response;
      const parsed = await parseBody(request, partyUnitPersonCreateSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await service.createPartyUnitPerson(parsedId.value, parsed.value, auth.staff);
        if (result.code === "NOT_FOUND") return jsonResponse({ error: "NOT_FOUND" }, 404);
        if (result.code === "INVALID_MEMBER") return jsonResponse({ error: "INVALID_MEMBER" }, 400);
        return jsonResponse({ person: result.item }, 201);
      } catch (error) { return failure(error); }
    },
  };
}
export function createAdminPartyUnitPersonItemHandlers() {
  return {
    PATCH: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const params = await context.params;
      const unitId = parseId(params.id, organizationIdSchema);
      const personId = parseId(params.personId, organizationPersonIdSchema);
      if (unitId.response) return unitId.response;
      if (personId.response) return personId.response;
      const parsed = await parseBody(request, partyUnitPersonUpdateSchema);
      if (parsed.response) return parsed.response;
      try {
        const person = await service.updatePartyUnitPerson(unitId.value, personId.value, parsed.value, auth.staff);
        if (person?.code === "INVALID_MEMBER") return jsonResponse({ error: "INVALID_MEMBER" }, 400);
        if (person?.code === "MEMBER_NAME_READ_ONLY") return jsonResponse({ error: "MEMBER_NAME_READ_ONLY" }, 400);
        return person ? jsonResponse({ person }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return failure(error); }
    },
    DELETE: async (request, context) => {
      const auth = await authorize(request, requireStaff);
      if (auth.response) return auth.response;
      const params = await context.params;
      const unitId = parseId(params.id, organizationIdSchema);
      const personId = parseId(params.personId, organizationPersonIdSchema);
      if (unitId.response) return unitId.response;
      if (personId.response) return personId.response;
      const parsed = await parseBody(request, organizationDeleteSchema);
      if (parsed.response) return parsed.response;
      try {
        const result = await service.deletePartyUnitPerson(unitId.value, personId.value, auth.staff);
        return result ? jsonResponse({ deleted: true }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return failure(error); }
    },
  };
}
export function createAdminPartyUnitPersonStatusHandler() {
  return async (request, context) => {
    const auth = await authorize(request, requireStaff);
    if (auth.response) return auth.response;
    const params = await context.params;
    const unitId = parseId(params.id, organizationIdSchema);
    const personId = parseId(params.personId, organizationPersonIdSchema);
    if (unitId.response) return unitId.response;
    if (personId.response) return personId.response;
    const parsed = await parseBody(request, statusSchema);
    if (parsed.response) return parsed.response;
    try {
      const person = await service.setPartyUnitPersonPublished(unitId.value, personId.value, parsed.value.is_published, auth.staff);
      return person ? jsonResponse({ person }) : jsonResponse({ error: "NOT_FOUND" }, 404);
    } catch (error) { return failure(error); }
  };
}

export function createPublicOrganizationHandlers() {
  return {
    governorates: async () => {
      try { return jsonResponse({ governorates: await service.listOrganizationGovernorates() }, 200, { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }); }
      catch (error) { return failure(error); }
    },
    centers: async (request) => {
      const governorateId = queryId(request, "governorate_id");
      if (!governorateId) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse({ centers: await service.listOrganizationCenters(governorateId) }, 200, { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }); }
      catch (error) { return failure(error); }
    },
    units: async (request) => {
      const centerId = queryId(request, "center_id");
      if (!centerId) return jsonResponse({ error: "VALIDATION" }, 400);
      try { return jsonResponse({ party_units: await service.listOrganizationPartyUnits(centerId) }, 200, { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }); }
      catch (error) { return failure(error); }
    },
    unit: async (_request, context) => {
      const parsedId = await idParam(context);
      if (parsedId.response) return parsedId.response;
      try {
        const partyUnit = await service.getOrganizationPartyUnitPublic(parsedId.value);
        return partyUnit ? jsonResponse({ party_unit: partyUnit }, 200, { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }) : jsonResponse({ error: "NOT_FOUND" }, 404);
      } catch (error) { return failure(error); }
    },
  };
}


export function createAdminOrganizationMembersSearchHandler() {
  return async (request) => {
    const auth = await authorize(request, requireStaff);
    if (auth.response) return auth.response;
    const url = new URL(request.url);
    const entries = [...url.searchParams.entries()];
    if (entries.length !== 1 || entries[0][0] !== "q") {
      return jsonResponse({ error: "VALIDATION" }, 400);
    }
    const query = entries[0][1].trim();
    if (query.length < 2 || query.length > 100) {
      return jsonResponse({ error: "VALIDATION" }, 400);
    }
    try {
      return jsonResponse({ members: await service.searchActiveMembersForOrganization(query) });
    } catch (error) {
      return failure(error);
    }
  };
}
