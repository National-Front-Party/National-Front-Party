import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const select = {
  id: true,
  governorate_id: true,
  full_name: true,
  role_title: true,
  photo_url: true,
  sort_order: true,
  is_published: true,
  created_at: true,
  updated_at: true,
  governorate: { select: { id: true, name_ar: true } },
};

const publicSelect = {
  id: true,
  governorate_id: true,
  full_name: true,
  role_title: true,
  photo_url: true,
  sort_order: true,
  governorate: { select: { id: true, name_ar: true } },
};

function target(item) {
  return { id: item.id, name: item.full_name };
}

export async function listGovernorateSecretariatsAdmin({ page, page_size, governorate_id }, db) {
  const database = await getDatabase(db);
  const where = governorate_id ? { governorate_id } : {};
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.governorate_secretariats_info.findMany({
      where,
      skip,
      take: page_size,
      orderBy: [{ governorate_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
      select,
    }),
    database.governorate_secretariats_info.count({ where }),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}

export async function getGovernorateSecretariatAdmin(id, db) {
  const database = await getDatabase(db);
  return database.governorate_secretariats_info.findUnique({ where: { id }, select });
}

export async function createGovernorateSecretariat(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.governorate_secretariats_info.create({
      data: { ...input, updated_by: actor.id },
      select,
    });
    await writeContentAudit(tx, actor, target(item), "content_created", {
      entity_type: "governorate_secretariat_person",
      entity_id: String(item.id),
    });
    return item;
  });
}

export async function updateGovernorateSecretariat(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.governorate_secretariats_info.findUnique({ where: { id }, select });
    if (!current) return null;
    const item = await tx.governorate_secretariats_info.update({
      where: { id },
      data: { ...input, updated_by: actor.id },
      select,
    });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, target(item), "content_updated", {
      entity_type: "governorate_secretariat_person",
      entity_id: String(item.id),
      ...(changed.length ? { changed_fields: changed } : {}),
    });
    return item;
  });
}

export async function setGovernorateSecretariatPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.governorate_secretariats_info.findUnique({ where: { id }, select });
    if (!current) return null;
    const item = await tx.governorate_secretariats_info.update({
      where: { id },
      data: { is_published: isPublished, updated_by: actor.id },
      select,
    });
    await writeContentAudit(
      tx,
      actor,
      target(item),
      isPublished ? "content_published" : "content_unpublished",
      { entity_type: "governorate_secretariat_person", entity_id: String(item.id) },
    );
    return item;
  });
}

export async function deleteGovernorateSecretariat(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.governorate_secretariats_info.findUnique({ where: { id }, select });
    if (!current) return null;
    await tx.governorate_secretariats_info.delete({ where: { id } });
    await writeContentAudit(tx, actor, target(current), "content_deleted", {
      entity_type: "governorate_secretariat_person",
      entity_id: String(current.id),
    });
    return { deleted: true };
  });
}

export async function listGovernorateSecretariatsPublic(governorateId, db) {
  const database = await getDatabase(db);
  return database.governorate_secretariats_info.findMany({
    where: {
      is_published: true,
      ...(governorateId ? { governorate_id: governorateId } : {}),
      governorate: { is_active: true },
    },
    orderBy: [{ governorate_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
    select: publicSelect,
  });
}

export async function getGovernorateSecretariatPublic(id, db) {
  const database = await getDatabase(db);
  return database.governorate_secretariats_info.findFirst({
    where: { id, is_published: true, governorate: { is_active: true } },
    select: publicSelect,
  });
}
