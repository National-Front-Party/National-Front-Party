import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

function target(gov) {
  return {
    type: "governorate",
    id: gov?.id != null ? String(gov.id) : undefined,
    name: gov?.name_ar || undefined,
  };
}

const adminSelect = {
  id: true,
  name_ar: true,
  code: true,
  sort_order: true,
  is_active: true,
  created_at: true,
  _count: {
    select: {
      governorate_secretariats_info: true,
      members: true,
      membership_applications: true,
    },
  },
};

export async function getActiveGovernorates(db) {
  const database = await getDatabase(db);

  return database.governorates.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    select: {
      id: true,
      name_ar: true,
      code: true,
      sort_order: true,
    },
  });
}

export async function listGovernoratesAdmin(db) {
  const database = await getDatabase(db);
  const items = await database.governorates.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: adminSelect,
  });

  return items.map((gov) => ({
    id: gov.id,
    name_ar: gov.name_ar,
    code: gov.code,
    sort_order: gov.sort_order,
    is_active: gov.is_active,
    created_at: gov.created_at,
    secretariats_count: gov._count.governorate_secretariats_info,
    members_count: gov._count.members,
    applications_count: gov._count.membership_applications,
    total_linked:
      gov._count.governorate_secretariats_info +
      gov._count.members +
      gov._count.membership_applications,
  }));
}

export async function getGovernorateAdmin(id, db) {
  const database = await getDatabase(db);
  const gov = await database.governorates.findUnique({
    where: { id },
    select: adminSelect,
  });
  if (!gov) return null;

  return {
    id: gov.id,
    name_ar: gov.name_ar,
    code: gov.code,
    sort_order: gov.sort_order,
    is_active: gov.is_active,
    created_at: gov.created_at,
    secretariats_count: gov._count.governorate_secretariats_info,
    members_count: gov._count.members,
    applications_count: gov._count.membership_applications,
    total_linked:
      gov._count.governorate_secretariats_info +
      gov._count.members +
      gov._count.membership_applications,
  };
}

export async function createGovernorate(input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.governorates.create({
      data: {
        name_ar: input.name_ar,
        code: input.code.toUpperCase(),
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      },
      select: {
        id: true,
        name_ar: true,
        code: true,
        sort_order: true,
        is_active: true,
        created_at: true,
      },
    });

    if (actor) {
      await writeContentAudit(tx, actor, target(item), "content_created", {
        entity_type: "governorate",
        entity_id: String(item.id),
      });
    }

    return item;
  });
}

export async function updateGovernorate(id, input, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const data = {};
    if (input.name_ar !== undefined) data.name_ar = input.name_ar;
    if (input.code !== undefined) data.code = input.code.toUpperCase();
    if (input.sort_order !== undefined) data.sort_order = input.sort_order;
    if (input.is_active !== undefined) data.is_active = input.is_active;

    const item = await tx.governorates.update({
      where: { id },
      data,
      select: {
        id: true,
        name_ar: true,
        code: true,
        sort_order: true,
        is_active: true,
        created_at: true,
      },
    });

    if (actor) {
      const changed = Object.keys(input);
      await writeContentAudit(tx, actor, target(item), "content_updated", {
        entity_type: "governorate",
        entity_id: String(item.id),
        ...(changed.length ? { changed_fields: changed } : {}),
      });
    }

    return item;
  });
}

export async function setGovernorateActive(id, isActive, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const item = await tx.governorates.update({
      where: { id },
      data: { is_active: Boolean(isActive) },
      select: {
        id: true,
        name_ar: true,
        code: true,
        sort_order: true,
        is_active: true,
        created_at: true,
      },
    });

    if (actor) {
      await writeContentAudit(
        tx,
        actor,
        target(item),
        isActive ? "content_published" : "content_unpublished",
        { entity_type: "governorate", entity_id: String(item.id) }
      );
    }

    return item;
  });
}

export async function deleteGovernorate(id, actor, db) {
  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await tx.governorates.findUnique({
      where: { id },
      select: {
        id: true,
        name_ar: true,
        code: true,
        _count: {
          select: {
            governorate_secretariats_info: true,
            members: true,
            membership_applications: true,
          },
        },
      },
    });

    if (!current) return null;

    const totalLinked =
      current._count.governorate_secretariats_info +
      current._count.members +
      current._count.membership_applications;

    if (totalLinked > 0) {
      const error = new Error("GOVERNORATE_HAS_DATA");
      error.code = "GOVERNORATE_HAS_DATA";
      throw error;
    }

    await tx.governorates.delete({
      where: { id },
    });

    if (actor) {
      await writeContentAudit(tx, actor, target(current), "content_deleted", {
        entity_type: "governorate",
        entity_id: String(current.id),
      });
    }

    return { deleted: true };
  });
}
