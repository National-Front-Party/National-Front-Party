import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const centerSelect = {
  id: true, governorate_id: true, name_ar: true, sort_order: true, is_active: true, created_at: true,
  governorate: { select: { id: true, name_ar: true, is_active: true } },
  _count: { select: { local_secretariats: true } },
};
const secretariatSelect = {
  id: true, center_id: true, name_ar: true, sort_order: true, is_active: true, created_at: true,
  center: { select: { id: true, name_ar: true, governorate_id: true } },
  _count: { select: { party_units: true } },
};
const unitSelect = {
  id: true, secretariat_id: true, name_ar: true, sort_order: true, is_active: true, created_at: true,
  secretariat: { select: { id: true, name_ar: true, center_id: true, center: { select: { id: true, name_ar: true, governorate_id: true } } } },
  _count: { select: { people: true } },
};
const personAdminSelect = {
  id: true, party_unit_id: true, member_id: true, full_name: true, position_title: true,
  details: true, sort_order: true, is_published: true, updated_by: true, created_at: true, updated_at: true,
  member: { select: { id: true, status: true, membership_application: { select: { full_name: true } } } },
};

function auditTarget(item, name) {
  return { id: item.id, name: name ?? item.name_ar ?? item.full_name ?? String(item.id) };
}
async function audit(tx, actor, item, entityType, action, changedFields) {
  await writeContentAudit(tx, actor, auditTarget(item), action, {
    entity_type: entityType,
    entity_id: String(item.id),
    ...(changedFields?.length ? { changed_fields: changedFields } : {}),
  });
}
function parentConflict(entity) {
  const error = new Error(entity);
  error.code = "ORGANIZATION_PARENT_HAS_CHILDREN";
  return error;
}
function mapPerson(person) {
  return {
    id: person.id,
    party_unit_id: person.party_unit_id,
    full_name: person.member?.membership_application?.full_name ?? person.full_name,
    position_title: person.position_title,
    details: person.details,
    sort_order: person.sort_order,
    is_published: person.is_published,
    ...(person.member_id ? { member_id: person.member_id, member_status: person.member?.status } : {}),
    created_at: person.created_at,
    updated_at: person.updated_at,
  };
}

export async function listCentersAdmin({ governorate_id } = {}, db) {
  const database = await getDatabase(db);
  return database.centers.findMany({
    where: governorate_id ? { governorate_id } : {},
    orderBy: [{ governorate_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
    select: centerSelect,
  });
}
export async function createCenter(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const parent = await tx.governorates.findFirst({ where: { id: input.governorate_id, is_active: true }, select: { id: true } });
    if (!parent) return { code: "INVALID_GOVERNORATE" };
    const item = await tx.centers.create({ data: { ...input, sort_order: input.sort_order ?? 0, is_active: input.is_active ?? true }, select: centerSelect });
    await audit(tx, actor, item, "organization_center", "content_created");
    return { item };
  });
}
export async function updateCenter(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.centers.findUnique({ where: { id }, select: centerSelect });
    if (!current) return null;
    const item = await tx.centers.update({ where: { id }, data: input, select: centerSelect });
    await audit(tx, actor, item, "organization_center", "content_updated", Object.keys(input));
    return item;
  });
}
export async function setCenterActive(id, is_active, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.centers.findUnique({ where: { id }, select: centerSelect });
    if (!current) return null;
    const item = await tx.centers.update({ where: { id }, data: { is_active }, select: centerSelect });
    await audit(tx, actor, item, "organization_center", is_active ? "content_published" : "content_unpublished");
    return item;
  });
}
export async function deleteCenter(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.centers.findUnique({ where: { id }, select: { ...centerSelect, _count: { select: { local_secretariats: true } } } });
    if (!current) return null;
    if (current._count.local_secretariats) return { code: "HAS_CHILDREN" };
    await tx.centers.delete({ where: { id } });
    await audit(tx, actor, current, "organization_center", "content_deleted");
    return { deleted: true };
  });
}

export async function listLocalSecretariatsAdmin({ center_id } = {}, db) {
  const database = await getDatabase(db);
  return database.local_secretariats.findMany({
    where: center_id ? { center_id } : {},
    orderBy: [{ center_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
    select: secretariatSelect,
  });
}
export async function createLocalSecretariat(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const parent = await tx.centers.findFirst({ where: { id: input.center_id, is_active: true, governorate: { is_active: true } }, select: { id: true } });
    if (!parent) return { code: "INVALID_CENTER" };
    const item = await tx.local_secretariats.create({ data: { ...input, sort_order: input.sort_order ?? 0, is_active: input.is_active ?? true }, select: secretariatSelect });
    await audit(tx, actor, item, "organization_local_secretariat", "content_created");
    return { item };
  });
}
export async function updateLocalSecretariat(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.local_secretariats.findUnique({ where: { id }, select: secretariatSelect });
    if (!current) return null;
    const item = await tx.local_secretariats.update({ where: { id }, data: input, select: secretariatSelect });
    await audit(tx, actor, item, "organization_local_secretariat", "content_updated", Object.keys(input));
    return item;
  });
}
export async function setLocalSecretariatActive(id, is_active, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.local_secretariats.findUnique({ where: { id }, select: secretariatSelect });
    if (!current) return null;
    const item = await tx.local_secretariats.update({ where: { id }, data: { is_active }, select: secretariatSelect });
    await audit(tx, actor, item, "organization_local_secretariat", is_active ? "content_published" : "content_unpublished");
    return item;
  });
}
export async function deleteLocalSecretariat(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.local_secretariats.findUnique({ where: { id }, select: { ...secretariatSelect, _count: { select: { party_units: true } } } });
    if (!current) return null;
    if (current._count.party_units) return { code: "HAS_CHILDREN" };
    await tx.local_secretariats.delete({ where: { id } });
    await audit(tx, actor, current, "organization_local_secretariat", "content_deleted");
    return { deleted: true };
  });
}

export async function listPartyUnitsAdmin({ secretariat_id } = {}, db) {
  const database = await getDatabase(db);
  return database.party_units.findMany({
    where: secretariat_id ? { secretariat_id } : {},
    orderBy: [{ secretariat_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
    select: unitSelect,
  });
}
export async function createPartyUnit(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const parent = await tx.local_secretariats.findFirst({ where: { id: input.secretariat_id, is_active: true, center: { is_active: true, governorate: { is_active: true } } }, select: { id: true } });
    if (!parent) return { code: "INVALID_SECRETARIAT" };
    const item = await tx.party_units.create({ data: { ...input, sort_order: input.sort_order ?? 0, is_active: input.is_active ?? true }, select: unitSelect });
    await audit(tx, actor, item, "organization_party_unit", "content_created");
    return { item };
  });
}
export async function updatePartyUnit(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.party_units.findUnique({ where: { id }, select: unitSelect });
    if (!current) return null;
    const item = await tx.party_units.update({ where: { id }, data: input, select: unitSelect });
    await audit(tx, actor, item, "organization_party_unit", "content_updated", Object.keys(input));
    return item;
  });
}
export async function setPartyUnitActive(id, is_active, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.party_units.findUnique({ where: { id }, select: unitSelect });
    if (!current) return null;
    const item = await tx.party_units.update({ where: { id }, data: { is_active }, select: unitSelect });
    await audit(tx, actor, item, "organization_party_unit", is_active ? "content_published" : "content_unpublished");
    return item;
  });
}
export async function deletePartyUnit(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.party_units.findUnique({ where: { id }, select: { ...unitSelect, _count: { select: { people: true } } } });
    if (!current) return null;
    if (current._count.people) return { code: "HAS_CHILDREN" };
    await tx.party_units.delete({ where: { id } });
    await audit(tx, actor, current, "organization_party_unit", "content_deleted");
    return { deleted: true };
  });
}

export async function createPartyUnitPerson(unitId, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const parent = await tx.party_units.findFirst({ where: { id: unitId, is_active: true, secretariat: { is_active: true, center: { is_active: true, governorate: { is_active: true } } } }, select: { id: true } });
    if (!parent) return { code: "NOT_FOUND" };
    let member = null;
    if (input.member_id) {
      member = await tx.members.findFirst({ where: { id: input.member_id, status: "active" }, select: { id: true, membership_application: { select: { full_name: true } } } });
      if (!member) return { code: "INVALID_MEMBER" };
    }
    const item = await tx.party_unit_people.create({
      data: {
        party_unit_id: unitId, member_id: member?.id ?? null,
        full_name: member ? null : input.full_name,
        position_title: input.position_title, details: input.details ?? null,
        sort_order: input.sort_order ?? 0, is_published: input.is_published ?? false,
        updated_by: actor.id,
      },
      select: personAdminSelect,
    });
    await audit(tx, actor, { ...item, full_name: member?.membership_application.full_name ?? item.full_name }, "organization_party_unit_person", "content_created");
    return { item: mapPerson(item) };
  });
}
export async function updatePartyUnitPerson(unitId, personId, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.party_unit_people.findFirst({ where: { id: personId, party_unit_id: unitId }, select: personAdminSelect });
    if (!current) return null;
    let memberId = current.member_id;
    let fullName = current.full_name;
    if (input.member_id !== undefined) {
      memberId = input.member_id;
      if (memberId) {
        const member = await tx.members.findFirst({ where: { id: memberId, status: "active" }, select: { id: true } });
        if (!member) return { code: "INVALID_MEMBER" };
        fullName = null;
      } else {
        fullName = input.full_name ?? current.member?.membership_application?.full_name ?? current.full_name;
      }
    } else if (input.full_name !== undefined) {
      if (memberId) return { code: "MEMBER_NAME_READ_ONLY" };
      fullName = input.full_name;
    }
    const data = { ...input, member_id: memberId, full_name: fullName, updated_by: actor.id };
    delete data.member_id;
    delete data.full_name;
    if (input.member_id !== undefined) { data.member_id = memberId; data.full_name = fullName; }
    else if (input.full_name !== undefined) data.full_name = fullName;
    const item = await tx.party_unit_people.update({ where: { id: personId }, data, select: personAdminSelect });
    await audit(tx, actor, { ...item, full_name: item.member?.membership_application?.full_name ?? item.full_name }, "organization_party_unit_person", "content_updated", Object.keys(input));
    return mapPerson(item);
  });
}
export async function setPartyUnitPersonPublished(unitId, personId, is_published, actor, db) {
  return updatePartyUnitPerson(unitId, personId, { is_published }, actor, db);
}
export async function deletePartyUnitPerson(unitId, personId, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.party_unit_people.findFirst({ where: { id: personId, party_unit_id: unitId }, select: personAdminSelect });
    if (!current) return null;
    await tx.party_unit_people.delete({ where: { id: personId } });
    await audit(tx, actor, current, "organization_party_unit_person", "content_deleted");
    return { deleted: true };
  });
}
export async function listPartyUnitPeopleAdmin(unitId, db) {
  const database = await getDatabase(db);
  const rows = await database.party_unit_people.findMany({ where: { party_unit_id: unitId }, orderBy: [{ sort_order: "asc" }, { id: "asc" }], select: personAdminSelect });
  return rows.map(mapPerson);
}

export async function listOrganizationGovernorates(db) {
  const database = await getDatabase(db);
  return database.governorates.findMany({
    where: { is_active: true, centers: { some: { is_active: true } } },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: { id: true, name_ar: true },
  });
}
export async function listOrganizationCenters(governorateId, db) {
  const database = await getDatabase(db);
  return database.centers.findMany({
    where: { governorate_id: governorateId, is_active: true, governorate: { is_active: true } },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: { id: true, name_ar: true, governorate_id: true },
  });
}
export async function listOrganizationPartyUnits(centerId, db) {
  const database = await getDatabase(db);
  return database.party_units.findMany({
    where: {
      is_active: true,
      secretariat: { is_active: true, center_id: centerId, center: { is_active: true, governorate: { is_active: true } } },
    },
    orderBy: [{ secretariat: { sort_order: "asc" } }, { sort_order: "asc" }, { id: "asc" }],
    select: {
      id: true, name_ar: true, secretariat_id: true,
      secretariat: { select: { id: true, name_ar: true, center: { select: { id: true, name_ar: true, governorate_id: true } } } },
    },
  });
}
export async function getOrganizationPartyUnitPublic(id, db) {
  const database = await getDatabase(db);
  const item = await database.party_units.findFirst({
    where: { id, is_active: true, secretariat: { is_active: true, center: { is_active: true, governorate: { is_active: true } } } },
    select: {
      id: true, name_ar: true,
      secretariat: { select: { id: true, name_ar: true, center: { select: { id: true, name_ar: true, governorate: { select: { id: true, name_ar: true } } } } } },
      people: {
        where: { is_published: true, OR: [{ member_id: null }, { member: { status: "active" } }] },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        select: { id: true, full_name: true, position_title: true, details: true, sort_order: true, member: { select: { status: true, membership_application: { select: { full_name: true } } } } },
      },
    },
  });
  if (!item) return null;
  return {
    id: item.id, name_ar: item.name_ar,
    governorate: item.secretariat.center.governorate,
    center: { id: item.secretariat.center.id, name_ar: item.secretariat.center.name_ar },
    local_secretariat: { id: item.secretariat.id, name_ar: item.secretariat.name_ar },
    people: item.people.map((person) => ({
      id: person.id,
      full_name: person.member?.membership_application?.full_name ?? person.full_name,
      position_title: person.position_title,
      details: person.details,
      sort_order: person.sort_order,
    })),
  };
}
