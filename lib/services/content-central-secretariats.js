import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const personSelect = {
  id: true,
  secretariat_id: true,
  full_name: true,
  position_title: true,
  image_url: true,
  details: true,
  sort_order: true,
  is_published: true,
  created_at: true,
  updated_at: true,
};

const personPublicSelect = {
  id: true,
  secretariat_id: true,
  full_name: true,
  position_title: true,
  image_url: true,
  details: true,
  sort_order: true,
};

const secretariatSelect = {
  id: true,
  info_item_id: true,
  name_ar: true,
  head_name: true,
  source_note: true,
  sort_order: true,
  is_published: true,
};

function targetSecretariat(item) {
  return { id: item.id, name: item.name_ar };
}

function targetPerson(item) {
  return { id: item.id, name: item.full_name };
}

export async function listCentralSecretariatsAdmin({ page, page_size }, db) {
  const database = await getDatabase(db);
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.central_secretariats.findMany({
      skip,
      take: page_size,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: {
        ...secretariatSelect,
        people: { orderBy: [{ sort_order: "asc" }, { id: "asc" }], select: personSelect },
      },
    }),
    database.central_secretariats.count(),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}

export async function getCentralSecretariatAdmin(id, db) {
  const database = await getDatabase(db);
  return database.central_secretariats.findUnique({
    where: { id },
    select: {
      ...secretariatSelect,
      people: { orderBy: [{ sort_order: "asc" }, { id: "asc" }], select: personSelect },
    },
  });
}

export async function createCentralSecretariat(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.central_secretariats.create({ data: input, select: secretariatSelect });
    await writeContentAudit(tx, actor, targetSecretariat(item), "content_created", {
      entity_type: "central_secretariat",
      entity_id: String(item.id),
    });
    return item;
  });
}

export async function updateCentralSecretariat(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.central_secretariats.findUnique({ where: { id }, select: secretariatSelect });
    if (!current) return null;
    const item = await tx.central_secretariats.update({ where: { id }, data: input, select: secretariatSelect });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, targetSecretariat(item), "content_updated", {
      entity_type: "central_secretariat",
      entity_id: String(item.id),
      ...(changed.length ? { changed_fields: changed } : {}),
    });
    return item;
  });
}

export async function setCentralSecretariatPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.central_secretariats.findUnique({ where: { id }, select: secretariatSelect });
    if (!current) return null;
    const item = await tx.central_secretariats.update({
      where: { id },
      data: { is_published: isPublished },
      select: secretariatSelect,
    });
    await writeContentAudit(
      tx,
      actor,
      targetSecretariat(item),
      isPublished ? "content_published" : "content_unpublished",
      { entity_type: "central_secretariat", entity_id: String(item.id) },
    );
    return item;
  });
}

export async function deleteCentralSecretariat(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    if (typeof tx.$queryRaw !== "function") {
      throw new TypeError("PostgreSQL row locks are required");
    }

    const lockedRows = await tx.$queryRaw`
      SELECT "id", "name_ar"
      FROM "central_secretariats"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
    if (!Array.isArray(lockedRows) || lockedRows.length === 0) return null;
    const current = lockedRows[0];

    const cascadePeopleCount = await tx.central_secretariat_people.count({ where: { secretariat_id: id } });
    await tx.central_secretariats.delete({ where: { id } });
    await writeContentAudit(tx, actor, targetSecretariat(current), "content_deleted", {
      entity_type: "central_secretariat",
      entity_id: String(current.id),
      cascade_deleted_people_count: cascadePeopleCount,
    });
    return { deleted: true, cascade_deleted_people_count: cascadePeopleCount };
  });
}

export async function createCentralSecretariatPerson(secretariatId, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const parent = await tx.central_secretariats.findUnique({ where: { id: secretariatId }, select: { id: true } });
    if (!parent) return { notFound: true };
    const person = await tx.central_secretariat_people.create({
      data: { ...input, secretariat_id: secretariatId, updated_by: actor.id },
      select: personSelect,
    });
    await writeContentAudit(tx, actor, targetPerson(person), "content_created", {
      entity_type: "central_secretariat_person",
      entity_id: String(person.id),
    });
    return { person };
  });
}

export async function updateCentralSecretariatPerson(secretariatId, personId, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.central_secretariat_people.findFirst({
      where: { id: personId, secretariat_id: secretariatId },
      select: personSelect,
    });
    if (!current) return null;
    const person = await tx.central_secretariat_people.update({
      where: { id: personId },
      data: { ...input, updated_by: actor.id },
      select: personSelect,
    });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, targetPerson(person), "content_updated", {
      entity_type: "central_secretariat_person",
      entity_id: String(person.id),
      ...(changed.length ? { changed_fields: changed } : {}),
    });
    return person;
  });
}

export async function setCentralSecretariatPersonPublished(secretariatId, personId, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.central_secretariat_people.findFirst({
      where: { id: personId, secretariat_id: secretariatId },
      select: personSelect,
    });
    if (!current) return null;
    const person = await tx.central_secretariat_people.update({
      where: { id: personId },
      data: { is_published: isPublished, updated_by: actor.id },
      select: personSelect,
    });
    await writeContentAudit(
      tx,
      actor,
      targetPerson(person),
      isPublished ? "content_published" : "content_unpublished",
      { entity_type: "central_secretariat_person", entity_id: String(person.id) },
    );
    return person;
  });
}

export async function deleteCentralSecretariatPerson(secretariatId, personId, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.central_secretariat_people.findFirst({
      where: { id: personId, secretariat_id: secretariatId },
      select: personSelect,
    });
    if (!current) return null;
    await tx.central_secretariat_people.delete({ where: { id: personId } });
    await writeContentAudit(tx, actor, targetPerson(current), "content_deleted", {
      entity_type: "central_secretariat_person",
      entity_id: String(current.id),
    });
    return { deleted: true };
  });
}

export async function getCentralSecretariatPersonAdmin(secretariatId, personId, db) {
  const database = await getDatabase(db);
  return database.central_secretariat_people.findFirst({
    where: { id: personId, secretariat_id: secretariatId },
    select: personSelect,
  });
}

export async function listCentralSecretariatsPublic(db) {
  const database = await getDatabase(db);
  return database.central_secretariats.findMany({
    where: { is_published: true },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name_ar: true,
      head_name: true,
      source_note: true,
      sort_order: true,
      people: {
        where: { is_published: true },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        select: personPublicSelect,
      },
    },
  });
}

export async function getCentralSecretariatPublic(id, db) {
  const database = await getDatabase(db);
  return database.central_secretariats.findFirst({
    where: { id, is_published: true },
    select: {
      id: true,
      name_ar: true,
      head_name: true,
      source_note: true,
      sort_order: true,
      people: {
        where: { is_published: true },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        select: personPublicSelect,
      },
    },
  });
}
