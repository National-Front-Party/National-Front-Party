import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";
import { normalizeTitleToSlug } from "../validation/news.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

export const articleAdminSelect = {
  id: true,
  slug: true,
  title: true,
  body: true,
  image_url: true,
  image_alt: true,
  source_id: true,
  source_url: true,
  published_on: true,
  date_precision: true,
  is_featured: true,
  sort_order: true,
  is_published: true,
  status: true,
  created_by: true,
  reviewed_by: true,
  reviewed_at: true,
  review_note: true,
  updated_by: true,
  created_at: true,
  updated_at: true,
  source: {
    select: {
      id: true,
      name_ar: true,
      slug: true,
      is_active: true,
    },
  },
  created_by_user: {
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
    },
  },
  reviewed_by_user: {
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
    },
  },
};

export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["pending_review"]),
  pending_review: Object.freeze(["published", "changes_requested", "draft"]),
  changes_requested: Object.freeze(["pending_review"]),
  published: Object.freeze(["draft"]),
});

async function lockArticle(tx, id) {
  if (typeof tx.$queryRaw === "function") {
    const rows = await tx.$queryRaw`
      SELECT "id", "slug", "title", "status", "created_by", "is_published", "source_id"
      FROM "news_articles"
      WHERE "id" = ${id}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }
  return tx.news_articles.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      created_by: true,
      is_published: true,
      source_id: true,
    },
  });
}

async function lockSourceForArticle(tx, sourceId) {
  if (typeof tx.$queryRaw === "function") {
    const rows = await tx.$queryRaw`
      SELECT "id", "is_active", "slug"
      FROM "news_sources"
      WHERE "id" = ${sourceId}
      FOR SHARE
    `;
    return rows[0] ?? null;
  }
  return tx.news_sources.findUnique({
    where: { id: sourceId },
    select: { id: true, is_active: true, slug: true },
  });
}

export async function createArticle(input, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Only super_admin and news_editor can create articles
  if (actor.role !== "super_admin" && actor.role !== "news_editor") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    // 1. Verify source exists and is active with FOR SHARE lock
    const source = await lockSourceForArticle(tx, input.source_id);
    if (!source) {
      return { ok: false, code: "SOURCE_NOT_FOUND" };
    }
    if (!source.is_active) {
      return { ok: false, code: "SOURCE_INACTIVE" };
    }

    // 2. Slug determination and uniqueness
    let slug;
    if (input.slug) {
      slug = input.slug;
      const existingSlug = await tx.news_articles.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existingSlug) {
        return { ok: false, code: "DUPLICATE_SLUG" };
      }
    } else {
      const base = (normalizeTitleToSlug(input.title) || "article")
        .slice(0, 100)
        .replace(/-+$/, "") || "article";
      let counter = 1;
      let foundUnique = false;
      while (!foundUnique) {
        const candidate = counter === 1 ? base : `${base}-${counter}`;
        const existing = await tx.news_articles.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        if (!existing) {
          slug = candidate;
          foundUnique = true;
        } else {
          counter++;
        }
      }
    }

    // 3. Create article as draft
    const article = await tx.news_articles.create({
      data: {
        slug,
        title: input.title,
        body: input.body,
        image_url: input.image_url ?? null,
        image_alt: input.image_alt ?? null,
        source_id: input.source_id,
        source_url: input.source_url ?? null,
        published_on: new Date(input.published_on),
        date_precision: input.date_precision ?? "day",
        is_featured: input.is_featured ?? false,
        sort_order: input.sort_order ?? 0,
        is_published: false,
        status: "draft",
        created_by: actor.id,
        updated_by: actor.id,
      },
      select: articleAdminSelect,
    });

    // 4. Audit logging
    await writeContentAudit(
      tx,
      actor,
      { id: article.id, title: article.title },
      "content_created",
      {
        entity_type: "news_article",
        entity_id: String(article.id),
        slug: article.slug,
      },
    );

    return { ok: true, data: article };
  });
}

export async function updateArticle(id, input, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Only super_admin and news_editor can edit articles (reviewers must not receive content editing capabilities)
  if (actor.role !== "super_admin" && actor.role !== "news_editor") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const locked = await lockArticle(tx, id);
    if (!locked) {
      return { ok: false, code: "NOT_FOUND" };
    }

    // Author ownership check
    if (actor.role !== "super_admin") {
      if (locked.created_by !== actor.id) {
        return { ok: false, code: "NOT_FOUND" };
      }
      // Author can only edit in draft or changes_requested
      if (locked.status !== "draft" && locked.status !== "changes_requested") {
        return { ok: false, code: "CANNOT_EDIT_IN_CURRENT_STATUS" };
      }
    }

    // If source_id changed, verify active with lock
    if (input.source_id !== undefined && input.source_id !== locked.source_id) {
      const source = await lockSourceForArticle(tx, input.source_id);
      if (!source) {
        return { ok: false, code: "SOURCE_NOT_FOUND" };
      }
      if (!source.is_active) {
        return { ok: false, code: "SOURCE_INACTIVE" };
      }
    }

    // If slug changed, verify uniqueness
    if (input.slug !== undefined && input.slug !== locked.slug) {
      const existingSlug = await tx.news_articles.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existingSlug && existingSlug.id !== id) {
        return { ok: false, code: "DUPLICATE_SLUG" };
      }
    }

    const updateData = {
      updated_by: actor.id,
    };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;
    if (input.source_id !== undefined) updateData.source_id = input.source_id;
    if (input.source_url !== undefined) updateData.source_url = input.source_url;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    if (input.image_alt !== undefined) updateData.image_alt = input.image_alt;
    if (input.published_on !== undefined) updateData.published_on = new Date(input.published_on);
    if (input.date_precision !== undefined) updateData.date_precision = input.date_precision;
    if (input.is_featured !== undefined) updateData.is_featured = input.is_featured;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
    if (input.slug !== undefined) updateData.slug = input.slug;

    const updated = await tx.news_articles.update({
      where: { id },
      data: updateData,
      select: articleAdminSelect,
    });

    const changed_fields = Object.keys(input);
    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, title: updated.title },
      "content_updated",
      {
        entity_type: "news_article",
        entity_id: String(updated.id),
        slug: updated.slug,
        changed_fields,
      },
    );

    return { ok: true, data: updated };
  });
}

export async function submitArticleForReview(id, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Only super_admin and news_editor can submit articles for review
  if (actor.role !== "super_admin" && actor.role !== "news_editor") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const locked = await lockArticle(tx, id);
    if (!locked) {
      return { ok: false, code: "NOT_FOUND" };
    }

    // Ownership check: news_editor can only submit their own
    if (actor.role !== "super_admin") {
      if (locked.created_by !== actor.id) {
        return { ok: false, code: "NOT_FOUND" };
      }
    }

    // Status check: must be draft or changes_requested
    if (locked.status !== "draft" && locked.status !== "changes_requested") {
      return { ok: false, code: "INVALID_STATUS_TRANSITION" };
    }

    const updated = await tx.news_articles.update({
      where: { id },
      data: {
        status: "pending_review",
        is_published: false,
        updated_by: actor.id,
      },
      select: articleAdminSelect,
    });

    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, title: updated.title },
      "content_updated",
      {
        entity_type: "news_article",
        entity_id: String(updated.id),
        slug: updated.slug,
        changed_fields: ["status"],
      },
    );

    return { ok: true, data: updated };
  });
}

export async function publishArticle(id, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Must have review permission
  if (actor.role !== "super_admin" && actor.role !== "news_reviewer") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const locked = await lockArticle(tx, id);
    if (!locked) {
      return { ok: false, code: "NOT_FOUND" };
    }

    // Status check: must be pending_review
    if (locked.status !== "pending_review") {
      return { ok: false, code: "INVALID_STATUS_TRANSITION" };
    }

    // Self-publishing check:
    // super_admin is explicitly allowed to publish an article they authored themselves.
    // news_editor and news_reviewer must NOT publish an article they authored themselves.
    if (locked.created_by === actor.id && actor.role !== "super_admin") {
      return { ok: false, code: "SELF_PUBLISHING_PROHIBITED" };
    }

    const now = new Date();
    const updated = await tx.news_articles.update({
      where: { id },
      data: {
        status: "published",
        is_published: true,
        reviewed_by: actor.id,
        reviewed_at: now,
        updated_by: actor.id,
      },
      select: articleAdminSelect,
    });

    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, title: updated.title },
      "content_published",
      {
        entity_type: "news_article",
        entity_id: String(updated.id),
        slug: updated.slug,
      },
    );

    return { ok: true, data: updated };
  });
}

export async function requestArticleChanges(id, input, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Must have review permission
  if (actor.role !== "super_admin" && actor.role !== "news_reviewer") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const note = input?.review_note?.trim();
  if (!note) {
    return { ok: false, code: "REVIEW_NOTE_REQUIRED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const locked = await lockArticle(tx, id);
    if (!locked) {
      return { ok: false, code: "NOT_FOUND" };
    }

    // Status check: must be pending_review
    if (locked.status !== "pending_review") {
      return { ok: false, code: "INVALID_STATUS_TRANSITION" };
    }

    const now = new Date();
    const updated = await tx.news_articles.update({
      where: { id },
      data: {
        status: "changes_requested",
        is_published: false,
        review_note: note,
        reviewed_by: actor.id,
        reviewed_at: now,
        updated_by: actor.id,
      },
      select: articleAdminSelect,
    });

    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, title: updated.title },
      "content_updated",
      {
        entity_type: "news_article",
        entity_id: String(updated.id),
        slug: updated.slug,
        changed_fields: ["status", "review_note"],
      },
    );

    return { ok: true, data: updated };
  });
}

export async function unpublishArticle(id, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Must have review permission
  if (actor.role !== "super_admin" && actor.role !== "news_reviewer") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const locked = await lockArticle(tx, id);
    if (!locked) {
      return { ok: false, code: "NOT_FOUND" };
    }

    // Status check: must be published
    if (locked.status !== "published") {
      return { ok: false, code: "INVALID_STATUS_TRANSITION" };
    }

    // Unpublishing transitions: published -> draft, is_published = false
    const updated = await tx.news_articles.update({
      where: { id },
      data: {
        status: "draft",
        is_published: false,
        updated_by: actor.id,
      },
      select: articleAdminSelect,
    });

    await writeContentAudit(
      tx,
      actor,
      { id: updated.id, title: updated.title },
      "content_unpublished",
      {
        entity_type: "news_article",
        entity_id: String(updated.id),
        slug: updated.slug,
      },
    );

    return { ok: true, data: updated };
  });
}

export async function deleteArticle(id, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Only super_admin can permanently delete
  if (actor.role !== "super_admin") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  return withTransaction(database, async (tx) => {
    const locked = await lockArticle(tx, id);
    if (!locked) {
      return { ok: false, code: "NOT_FOUND" };
    }

    await tx.news_articles.delete({
      where: { id },
    });

    await writeContentAudit(
      tx,
      actor,
      { id: locked.id, title: locked.title },
      "content_deleted",
      {
        entity_type: "news_article",
        entity_id: String(locked.id),
        slug: locked.slug,
      },
    );

    return { ok: true, data: { deleted: true, id } };
  });
}

export async function getArticle(id, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Only super_admin, news_reviewer, and news_editor can view articles in admin
  if (actor.role !== "super_admin" && actor.role !== "news_reviewer" && actor.role !== "news_editor") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  const article = await database.news_articles.findUnique({
    where: { id },
    select: articleAdminSelect,
  });

  if (!article) {
    return { ok: false, code: "NOT_FOUND" };
  }

  // news_editor can view their own articles only
  if (actor.role === "news_editor" && article.created_by !== actor.id) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true, data: article };
}

export async function listArticlesAdmin(query = {}, actor, db) {
  if (!actor || !actor.id) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Only super_admin, news_reviewer, and news_editor can list articles in admin
  if (actor.role !== "super_admin" && actor.role !== "news_reviewer" && actor.role !== "news_editor") {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const database = await getDatabase(db);
  const page = query.page ?? 1;
  const page_size = query.page_size ?? 25;
  const skip = (page - 1) * page_size;

  const where = {};

  // Role scoping:
  if (actor.role === "news_editor") {
    where.created_by = actor.id;
  } else if (query.author_id) {
    where.created_by = query.author_id;
  }

  if (query.status) {
    where.status = query.status;
  }
  if (query.source_id) {
    where.source_id = query.source_id;
  }
  if (query.is_featured !== undefined) {
    where.is_featured = query.is_featured;
  }
  if (query.is_published !== undefined) {
    where.is_published = query.is_published;
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { body: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const orderBy = [];
  const sortField = query.sort_by ?? "created_at";
  const sortDir = query.sort_dir ?? "desc";
  orderBy.push({ [sortField]: sortDir });
  if (sortField !== "id") {
    orderBy.push({ id: "desc" });
  }

  const [items, total] = await Promise.all([
    database.news_articles.findMany({
      where,
      skip,
      take: page_size,
      orderBy,
      select: articleAdminSelect,
    }),
    database.news_articles.count({ where }),
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
