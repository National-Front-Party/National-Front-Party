import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const select = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  icon: true,
  head_name: true,
  head_role: true,
  body: true,
  source_note: true,
  sort_order: true,
  is_published: true,
  created_at: true,
  updated_at: true,
};

const publicSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  icon: true,
  head_name: true,
  head_role: true,
  body: true,
  source_note: true,
  sort_order: true,
};

function target(item) {
  return { id: item.id, name: item.title, slug: item.slug };
}

export async function listParliamentaryAdmin({ page, page_size }, db) {
  const database = await getDatabase(db);
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.parliamentary_unit_items.findMany({
      skip,
      take: page_size,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select,
    }),
    database.parliamentary_unit_items.count(),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}

export async function getParliamentaryAdmin(id, db) {
  const database = await getDatabase(db);
  return database.parliamentary_unit_items.findUnique({ where: { id }, select });
}

export async function createParliamentary(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.parliamentary_unit_items.create({
      data: { ...input, updated_by: actor.id },
      select,
    });
    await writeContentAudit(tx, actor, target(item), "content_created", {
      entity_type: "parliamentary_unit_item",
      entity_id: String(item.id),
      slug: item.slug,
    });
    return item;
  });
}

export async function updateParliamentary(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.parliamentary_unit_items.findUnique({ where: { id }, select });
    if (!current) return null;
    const item = await tx.parliamentary_unit_items.update({
      where: { id },
      data: { ...input, updated_by: actor.id },
      select,
    });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, target(item), "content_updated", {
      entity_type: "parliamentary_unit_item",
      entity_id: String(item.id),
      slug: item.slug,
      ...(changed.length ? { changed_fields: changed } : {}),
    });
    return item;
  });
}

export async function setParliamentaryPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.parliamentary_unit_items.findUnique({ where: { id }, select });
    if (!current) return null;
    const item = await tx.parliamentary_unit_items.update({
      where: { id },
      data: { is_published: isPublished, updated_by: actor.id },
      select,
    });
    await writeContentAudit(
      tx,
      actor,
      target(item),
      isPublished ? "content_published" : "content_unpublished",
      { entity_type: "parliamentary_unit_item", entity_id: String(item.id), slug: item.slug },
    );
    return item;
  });
}

export async function deleteParliamentary(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.parliamentary_unit_items.findUnique({ where: { id }, select });
    if (!current) return null;
    await tx.parliamentary_unit_items.delete({ where: { id } });
    await writeContentAudit(tx, actor, target(current), "content_deleted", {
      entity_type: "parliamentary_unit_item",
      entity_id: String(current.id),
      slug: current.slug,
    });
    return { deleted: true };
  });
}

export async function listParliamentaryPublic(db) {
  const database = await getDatabase(db);
  return database.parliamentary_unit_items.findMany({
    where: { is_published: true },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: publicSelect,
  });
}

export async function getParliamentaryPublic(id, db) {
  const database = await getDatabase(db);
  return database.parliamentary_unit_items.findFirst({
    where: { id, is_published: true },
    select: publicSelect,
  });
}
