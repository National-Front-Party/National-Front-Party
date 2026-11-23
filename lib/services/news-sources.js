import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

export const sourceSelect = {
  id: true,
  slug: true,
  name_ar: true,
  sort_order: true,
  is_active: true,
  created_at: true,
};

async function lockNewsSource(tx, id) {
  if (typeof tx.$queryRaw === "function") {
    const rows = await tx.$queryRaw`
      SELECT "id", "slug", "name_ar", "sort_order", "is_active", "created_at"
      FROM "news_sources"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }
  return tx.news_sources.findUnique({
    where: { id },
    select: sourceSelect,
  });
}

async function lockAllNewsSources(tx) {
  if (typeof tx.$queryRaw === "function") {
    return tx.$queryRaw`
      SELECT "id", "slug", "name_ar", "sort_order", "is_active", "created_at"
      FROM "news_sources"
      ORDER BY "id" ASC
      FOR UPDATE
    `;
  }
  return tx.news_sources.findMany({
    orderBy: { id: "asc" },
    select: sourceSelect,
  });
}

function sourceTarget(source) {
  return { id: source.id, name: source.name_ar, slug: source.slug };
}

async function writeSourceDeletionAudit(tx, actor, source) {
  await writeContentAudit(
    tx,
    actor,
    sourceTarget(source),
    "content_deleted",
    {
      entity_type: "news_source",
      entity_id: String(source.id),
      slug: source.slug,
    },
  );
}

export async function createNewsSource(input, actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const existing = await tx.news_sources.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, code: "DUPLICATE_SLUG" };
    }

    const source = await tx.news_sources.create({
      data: {
        slug: input.slug,
        name_ar: input.name_ar,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      },
      select: sourceSelect,
    });

    await writeContentAudit(
      tx,
      actor,
      { id: source.id, name: source.name_ar, slug: source.slug },
      "content_created",
      {
        entity_type: "news_source",
        entity_id: String(source.id),
        slug: source.slug,
      },
    );

    return { ok: true, data: source };
  });
}

export async function updateNewsSource(id, input, actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await lockNewsSource(tx, id);
    if (!current) {
      return { ok: false, code: "NOT_FOUND" };
    }

    if (input.slug && input.slug !== current.slug) {
      const existing = await tx.news_sources.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existing) {
        return { ok: false, code: "DUPLICATE_SLUG" };
      }
    }

    const updated = await tx.news_sources.update({
      where: { id },
      data: input,
      select: sourceSelect,
    });

    const changed_fields = Object.keys(input);
    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, name: updated.name_ar, slug: updated.slug },
      "content_updated",
      {
        entity_type: "news_source",
        entity_id: String(updated.id),
        slug: updated.slug,
        changed_fields,
      },
    );

    return { ok: true, data: updated };
  });
}

export async function setNewsSourceActive(id, isActive, actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const current = await lockNewsSource(tx, id);
    if (!current) {
      return { ok: false, code: "NOT_FOUND" };
    }

    const updated = await tx.news_sources.update({
      where: { id },
      data: { is_active: isActive },
      select: sourceSelect,
    });

    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, name: updated.name_ar, slug: updated.slug },
      "content_updated",
      {
        entity_type: "news_source",
        entity_id: String(updated.id),
        slug: updated.slug,
        changed_fields: ["is_active"],
      },
    );

    return { ok: true, data: updated };
  });
}

export async function deleteNewsSource(id, actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    // createArticle takes FOR SHARE on this row. FOR UPDATE serializes deletion
    // with in-flight article creation before checking references.
    const current = await lockNewsSource(tx, id);
    if (!current) return { ok: false, code: "NOT_FOUND" };

    const referenceCount = await tx.news_articles.count({
      where: { source_id: id },
    });
    if (referenceCount > 0) {
      return {
        ok: false,
        code: "SOURCE_IN_USE",
        source_id: id,
        reference_count: referenceCount,
      };
    }

    await tx.news_sources.delete({ where: { id } });
    await writeSourceDeletionAudit(tx, actor, current);

    return { ok: true, data: { deleted: true, id } };
  });
}

export async function deleteAllNewsSources(actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    // Serialize with concurrent source creation so bulk deletion covers the
    // whole collection at commit, including an initially empty collection.
    if (typeof tx.$executeRaw === "function") {
      await tx.$executeRaw`LOCK TABLE "news_sources" IN SHARE ROW EXCLUSIVE MODE`;
    }

    // Hold row locks until commit. Article creation takes FOR SHARE on each
    // selected source, so the reference check cannot race an in-flight create.
    const sources = await lockAllNewsSources(tx);
    if (sources.length === 0) {
      return { ok: true, data: { deleted_count: 0 } };
    }

    const sourceIds = sources.map((source) => source.id);
    const articleReferences = await tx.news_articles.findMany({
      where: { source_id: { in: sourceIds } },
      select: { source_id: true },
    });
    const referencedSourceIds = [...new Set(
      articleReferences.map((article) => article.source_id),
    )].sort((a, b) => a - b);
    if (referencedSourceIds.length > 0) {
      return {
        ok: false,
        code: "SOURCE_IN_USE",
        source_ids: referencedSourceIds,
      };
    }

    await tx.news_sources.deleteMany({});
    for (const source of sources) {
      await writeSourceDeletionAudit(tx, actor, source);
    }

    return { ok: true, data: { deleted_count: sources.length } };
  });
}

export async function getNewsSource(id, actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  const source = await database.news_sources.findUnique({
    where: { id },
    select: sourceSelect,
  });

  if (!source) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true, data: source };
}

export async function listNewsSourcesAdmin(query = {}, actor, db) {
  if (!actor || !actor.id || actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  const { page = 1, page_size = 25, is_active } = query;
  const where = {};
  if (is_active !== undefined) {
    where.is_active = is_active;
  }
  const skip = (page - 1) * page_size;

  const [items, total] = await Promise.all([
    database.news_sources.findMany({
      where,
      skip,
      take: page_size,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: sourceSelect,
    }),
    database.news_sources.count({ where }),
  ]);

  return {
    ok: true,
    data: {
      items,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size),
      },
    },
  };
}

export async function listActiveNewsSources(db) {
  const database = await getDatabase(db);
  return database.news_sources.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: { id: true, name_ar: true, slug: true, is_active: true },
  });
}
