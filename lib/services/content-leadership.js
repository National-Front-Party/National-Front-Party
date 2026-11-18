import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const panelSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  icon: true,
  leaders_heading: true,
  sort_order: true,
  is_published: true,
};

const panelPublicSelect = { ...panelSelect };

const leaderSelect = {
  id: true,
  panel_id: true,
  full_name: true,
  role_title: true,
  photo_url: true,
  badge_label: true,
  is_head: true,
  sort_order: true,
  is_published: true,
  created_at: true,
  updated_at: true,
};

const leaderPublicSelect = {
  id: true,
  panel_id: true,
  full_name: true,
  role_title: true,
  photo_url: true,
  badge_label: true,
  is_head: true,
  sort_order: true,
};

const contentSelect = {
  id: true,
  slug: true,
  kind: true,
  title: true,
  body: true,
  source_note: true,
  icon: true,
  sort_order: true,
  is_published: true,
  button_label: true,
  button_style: true,
  action_type: true,
  person_name: true,
  person_role_title: true,
  decision_number: true,
  decision_date: true,
  created_at: true,
  updated_at: true,
};

const contentPublicSelect = {
  id: true,
  slug: true,
  kind: true,
  title: true,
  body: true,
  source_note: true,
  icon: true,
  sort_order: true,
  button_label: true,
  button_style: true,
  action_type: true,
  person_name: true,
  person_role_title: true,
  decision_number: true,
  decision_date: true,
};

function panelTarget(p) { return { id: p.id, name: p.title, slug: p.slug }; }
function leaderTarget(l) { return { id: l.id, name: l.full_name }; }
function contentTarget(c) { return { id: c.id, name: c.title, slug: c.slug }; }

function normalizeDecisionDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  return new Date(`${value}T00:00:00.000Z`);
}

// Panels
export async function listPanelsAdmin({ page, page_size }, db) {
  const database = await getDatabase(db);
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.panels.findMany({ skip, take: page_size, orderBy: [{ sort_order: "asc" }, { id: "asc" }], select: panelSelect }),
    database.panels.count(),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}
export async function getPanelAdmin(id, db) {
  const database = await getDatabase(db);
  return database.panels.findUnique({ where: { id }, select: panelSelect });
}
export async function createPanel(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.panels.create({ data: input, select: panelSelect });
    await writeContentAudit(tx, actor, panelTarget(item), "content_created", { entity_type: "panel", entity_id: String(item.id), slug: item.slug });
    return item;
  });
}
export async function updatePanel(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.panels.findUnique({ where: { id }, select: panelSelect });
    if (!current) return null;
    const item = await tx.panels.update({ where: { id }, data: input, select: panelSelect });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, panelTarget(item), "content_updated", { entity_type: "panel", entity_id: String(item.id), slug: item.slug, ...(changed.length ? { changed_fields: changed } : {}) });
    return item;
  });
}
export async function setPanelPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.panels.findUnique({ where: { id }, select: panelSelect });
    if (!current) return null;
    const item = await tx.panels.update({ where: { id }, data: { is_published: isPublished }, select: panelSelect });
    await writeContentAudit(tx, actor, panelTarget(item), isPublished ? "content_published" : "content_unpublished", { entity_type: "panel", entity_id: String(item.id), slug: item.slug });
    return item;
  });
}
export async function deletePanel(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.panels.findUnique({ where: { id }, select: panelSelect });
    if (!current) return null;
    const leadersCount = await tx.leaders.count({ where: { panel_id: id } });
    if (leadersCount > 0) {
      const err = new Error("Panel has leaders");
      err.code = "PANEL_HAS_LEADERS";
      throw err;
    }
    await tx.panels.delete({ where: { id } });
    await writeContentAudit(tx, actor, panelTarget(current), "content_deleted", { entity_type: "panel", entity_id: String(current.id), slug: current.slug });
    return { deleted: true };
  });
}

// Leaders (panel-related)
export async function listLeadersAdmin({ page, page_size, panel_id }, db) {
  const database = await getDatabase(db);
  const where = panel_id ? { panel_id } : {};
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.leaders.findMany({ where, skip, take: page_size, orderBy: [{ panel_id: "asc" }, { sort_order: "asc" }, { id: "asc" }], select: leaderSelect }),
    database.leaders.count({ where }),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}
export async function getLeaderAdmin(id, db) {
  const database = await getDatabase(db);
  return database.leaders.findUnique({ where: { id }, select: leaderSelect });
}
export async function createLeader(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.leaders.create({ data: { ...input, updated_by: actor.id }, select: leaderSelect });
    await writeContentAudit(tx, actor, leaderTarget(item), "content_created", { entity_type: "leader", entity_id: item.id });
    return item;
  });
}
export async function updateLeader(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.leaders.findUnique({ where: { id }, select: leaderSelect });
    if (!current) return null;
    const item = await tx.leaders.update({ where: { id }, data: { ...input, updated_by: actor.id }, select: leaderSelect });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, leaderTarget(item), "content_updated", { entity_type: "leader", entity_id: item.id, ...(changed.length ? { changed_fields: changed } : {}) });
    return item;
  });
}
export async function setLeaderPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.leaders.findUnique({ where: { id }, select: leaderSelect });
    if (!current) return null;
    const item = await tx.leaders.update({ where: { id }, data: { is_published: isPublished, updated_by: actor.id }, select: leaderSelect });
    await writeContentAudit(tx, actor, leaderTarget(item), isPublished ? "content_published" : "content_unpublished", { entity_type: "leader", entity_id: item.id });
    return item;
  });
}
export async function deleteLeader(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.leaders.findUnique({ where: { id }, select: leaderSelect });
    if (!current) return null;
    await tx.leaders.delete({ where: { id } });
    await writeContentAudit(tx, actor, leaderTarget(current), "content_deleted", { entity_type: "leader", entity_id: current.id });
    return { deleted: true };
  });
}

// Leadership button contents (3D: stored in info_items, kind leadership_content)
const LEADERSHIP_KIND = "leadership_content";
export async function listLeadershipContentsAdmin({ page, page_size }, db) {
  const database = await getDatabase(db);
  const where = { kind: LEADERSHIP_KIND };
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.info_items.findMany({ where, skip, take: page_size, orderBy: [{ sort_order: "asc" }, { id: "asc" }], select: contentSelect }),
    database.info_items.count({ where }),
  ]);
  return { items, pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) } };
}
export async function getLeadershipContentAdmin(id, db) {
  const database = await getDatabase(db);
  return database.info_items.findFirst({ where: { id, kind: LEADERSHIP_KIND }, select: contentSelect });
}
export async function createLeadershipContent(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const data = {
      ...input,
      kind: LEADERSHIP_KIND,
      updated_by: actor.id,
      decision_date: normalizeDecisionDate(input.decision_date),
    };
    const item = await tx.info_items.create({ data, select: contentSelect });
    await writeContentAudit(tx, actor, contentTarget(item), "content_created", { entity_type: "leadership_content", entity_id: String(item.id), slug: item.slug });
    return item;
  });
}
export async function updateLeadershipContent(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.info_items.findFirst({ where: { id, kind: LEADERSHIP_KIND }, select: contentSelect });
    if (!current) return null;
    const data = { ...input, updated_by: actor.id };
    if (Object.hasOwn(input, "decision_date")) data.decision_date = normalizeDecisionDate(input.decision_date);
    const item = await tx.info_items.update({ where: { id }, data, select: contentSelect });
    const changed = Object.keys(input);
    await writeContentAudit(tx, actor, contentTarget(item), "content_updated", { entity_type: "leadership_content", entity_id: String(item.id), slug: item.slug, ...(changed.length ? { changed_fields: changed } : {}) });
    return item;
  });
}
export async function setLeadershipContentPublished(id, isPublished, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.info_items.findFirst({ where: { id, kind: LEADERSHIP_KIND }, select: contentSelect });
    if (!current) return null;
    const item = await tx.info_items.update({ where: { id }, data: { is_published: isPublished, updated_by: actor.id }, select: contentSelect });
    await writeContentAudit(tx, actor, contentTarget(item), isPublished ? "content_published" : "content_unpublished", { entity_type: "leadership_content", entity_id: String(item.id), slug: item.slug });
    return item;
  });
}
export async function deleteLeadershipContent(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.info_items.findFirst({ where: { id, kind: LEADERSHIP_KIND }, select: contentSelect });
    if (!current) return null;
    await tx.info_items.delete({ where: { id } });
    await writeContentAudit(tx, actor, contentTarget(current), "content_deleted", { entity_type: "leadership_content", entity_id: String(current.id), slug: current.slug });
    return { deleted: true };
  });
}

// Public
export async function getLeadershipPublic(db) {
  const database = await getDatabase(db);
  const [panels, contents] = await Promise.all([
    database.panels.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: {
        ...panelPublicSelect,
        leaders: {
          where: { is_published: true },
          orderBy: [{ sort_order: "asc" }, { id: "asc" }],
          select: leaderPublicSelect,
        },
      },
    }),
    database.info_items.findMany({
      where: { kind: LEADERSHIP_KIND, is_published: true },
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: contentPublicSelect,
    }),
  ]);
  return { panels, contents };
}
