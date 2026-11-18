import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const select = {
  id: true,
  slug: true,
  title: true,
  body: true,
  source_note: true,
  icon: true,
  sort_order: true,
  is_published: true,
  kind: true,
  created_at: true,
  updated_at: true,
};

const publicSelect = {
  id: true,
  slug: true,
  title: true,
  body: true,
  source_note: true,
  icon: true,
  sort_order: true,
};

function target(popup) {
  return { id: popup.id, name: popup.title, slug: popup.slug };
}

export async function listPopupsAdmin({ page, page_size }, db) {
  const database = await getDatabase(db);
  const where = { kind: "popup" };
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.info_items.findMany({
      where,
      skip,
      take: page_size,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select,
    }),
    database.info_items.count({ where }),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}

export async function getPopupAdmin(id, db) {
  const database = await getDatabase(db);
  return database.info_items.findFirst({ where: { id, kind: "popup" }, select });
}

export async function createPopup(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const popup = await tx.info_items.create({
      data: { ...input, kind: "popup", updated_by: actor.id },
      select,
    });
    await writeContentAudit(tx, actor, target(popup), "content_created", {
      entity_type: "popup",
      entity_id: String(popup.id),
      slug: popup.slug,
    });
    return popup;
  });
}

export async function updatePopup(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.info_items.findFirst({ where: { id, kind: "popup" }, select });
    if (!current) return null;
    const popup = await tx.info_items.update({
      where: { id },
      data: { ...input, updated_by: actor.id },
      select,
    });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, target(popup), "content_updated", {
      entity_type: "popup",
      entity_id: String(popup.id),
      slug: popup.slug,
      ...(changed.length ? { changed_fields: changed } : {}),
    });
    return popup;
  });
}

export async function setPopupPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.info_items.findFirst({ where: { id, kind: "popup" }, select });
    if (!current) return null;
    const popup = await tx.info_items.update({
      where: { id },
      data: { is_published: isPublished, updated_by: actor.id },
      select,
    });
    await writeContentAudit(
      tx,
      actor,
      target(popup),
      isPublished ? "content_published" : "content_unpublished",
      { entity_type: "popup", entity_id: String(popup.id), slug: popup.slug },
    );
    return popup;
  });
}

export async function deletePopup(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.info_items.findFirst({ where: { id, kind: "popup" }, select });
    if (!current) return null;
    await tx.info_items.delete({ where: { id } });
    await writeContentAudit(tx, actor, target(current), "content_deleted", {
      entity_type: "popup",
      entity_id: String(current.id),
      slug: current.slug,
    });
    return { deleted: true };
  });
}

export async function listPopupsPublic(db) {
  const database = await getDatabase(db);
  return database.info_items.findMany({
    where: { kind: "popup", is_published: true },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: publicSelect,
  });
}

export async function getPopupPublic(id, db) {
  const database = await getDatabase(db);
  return database.info_items.findFirst({
    where: { id, kind: "popup", is_published: true },
    select: publicSelect,
  });
}
