import { writeContentAudit } from "../content/audit.js";
import { withTransaction } from "../content/crud.js";

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

const select = {
  id: true,
  title: true,
  body: true,
  source_note: true,
  is_published: true,
  created_at: true,
  updated_at: true,
};

function formatItem(item) {
  if (!item) return null;
  return {
    ...item,
    paragraphs: item.body ? item.body.split(/\r?\n+/) : [],
  };
}

function target(item) {
  return { id: item.id, name: item.title, title: item.title };
}

/**
 * Locks the single published Party Program record in PostgreSQL using SELECT ... FOR UPDATE.
 * Must be executed inside an active transaction client before any draft reads or mutations.
 *
 * @param {object} tx - The transaction client
 * @returns {Promise<{ id: number, title?: string }>} The locked published record
 */
export async function lockPartyProgram(tx) {
  if (!tx || typeof tx.$queryRaw !== "function") {
    throw new TypeError("Transaction client ($queryRaw) is required for row locking");
  }

  const rows = await tx.$queryRaw`
    SELECT "id", "title"
    FROM "party_programs"
    WHERE "is_published" = true
    LIMIT 1
    FOR UPDATE
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    const error = new Error("NO_PUBLISHED_PARTY_PROGRAM");
    error.code = "NO_PUBLISHED_PARTY_PROGRAM";
    error.status = 500;
    throw error;
  }

  return rows[0];
}

/**
 * Retrieves the current published Party Program and any active working draft.
 *
 * @param {object} [db] Optional database client for testing
 * @returns {Promise<{ published: object | null, draft: object | null, has_draft: boolean }>}
 */
export async function getPartyProgramAdmin(db) {
  const database = await getDatabase(db);

  const [published, draft] = await Promise.all([
    database.party_programs.findFirst({
      where: { is_published: true },
      orderBy: { id: "desc" },
      select,
    }),
    database.party_programs.findFirst({
      where: { is_published: false },
      orderBy: { id: "desc" },
      select,
    }),
  ]);

  return {
    published: formatItem(published),
    draft: formatItem(draft),
    has_draft: Boolean(draft),
  };
}

/**
 * Saves or updates the single working draft for the Party Program.
 * Preserves the published record completely unchanged.
 * Serialized via lockPartyProgram(tx).
 *
 * @param {{ title?: string, body: string, source_note?: string | null }} input
 * @param {{ id: string, full_name: string, email: string }} actor
 * @param {object} [db]
 * @returns {Promise<object>} The saved draft record
 */
export async function savePartyProgramDraft(input, actor, db) {
  const database = await getDatabase(db);

  return withTransaction(database, async (tx) => {
    await lockPartyProgram(tx);

    const existingDraft = await tx.party_programs.findFirst({
      where: { is_published: false },
      orderBy: { id: "desc" },
      select,
    });

    let draft;
    if (existingDraft) {
      draft = await tx.party_programs.update({
        where: { id: existingDraft.id },
        data: {
          title: input.title ?? existingDraft.title,
          body: input.body,
          source_note: input.source_note !== undefined ? input.source_note : existingDraft.source_note,
        },
        select,
      });

      await writeContentAudit(tx, actor, target(draft), "content_updated", {
        entity_type: "party_program",
        entity_id: String(draft.id),
      });
    } else {
      draft = await tx.party_programs.create({
        data: {
          title: input.title || "برنامج الحزب",
          body: input.body,
          source_note: input.source_note ?? "الموقع الرسمي للحزب",
          is_published: false,
        },
        select,
      });

      await writeContentAudit(tx, actor, target(draft), "content_created", {
        entity_type: "party_program",
        entity_id: String(draft.id),
      });
    }

    // Safety cleanup: ensure at most one draft exists by removing any duplicates
    await tx.party_programs.deleteMany({
      where: {
        is_published: false,
        id: { not: draft.id },
      },
    });

    return formatItem(draft);
  });
}

/**
 * Atomically publishes the active draft into the existing published record,
 * then removes the draft record. Never leaves the public endpoint without a published record.
 * Serialized via lockPartyProgram(tx).
 *
 * @param {{ id: string, full_name: string, email: string }} actor
 * @param {object} [db]
 * @returns {Promise<{ published: object, draft: null, has_draft: false }>}
 */
export async function publishPartyProgramDraft(actor, db) {
  const database = await getDatabase(db);

  return withTransaction(database, async (tx) => {
    const lockedPublished = await lockPartyProgram(tx);

    const draft = await tx.party_programs.findFirst({
      where: { is_published: false },
      orderBy: { id: "desc" },
      select,
    });

    if (!draft) {
      const error = new Error("NO_DRAFT_TO_PUBLISH");
      error.code = "NO_DRAFT_TO_PUBLISH";
      error.status = 400;
      throw error;
    }

    // Atomically update the existing published record with the draft's contents
    const published = await tx.party_programs.update({
      where: { id: lockedPublished.id },
      data: {
        title: draft.title,
        body: draft.body,
        source_note: draft.source_note,
      },
      select,
    });

    // Remove the draft record
    await tx.party_programs.delete({
      where: { id: draft.id },
    });

    // Ensure any remaining draft records are removed
    await tx.party_programs.deleteMany({
      where: { is_published: false },
    });

    await writeContentAudit(tx, actor, target(published), "content_published", {
      entity_type: "party_program",
      entity_id: String(published.id),
    });

    return {
      published: formatItem(published),
      draft: null,
      has_draft: false,
    };
  });
}

/**
 * Discards the current active working draft without publishing.
 * Preserves the published record completely unchanged.
 * Serialized via lockPartyProgram(tx).
 *
 * @param {{ id: string, full_name: string, email: string }} actor
 * @param {object} [db]
 * @returns {Promise<{ discarded: boolean }>}
 */
export async function discardPartyProgramDraft(actor, db) {
  const database = await getDatabase(db);

  return withTransaction(database, async (tx) => {
    await lockPartyProgram(tx);

    const draft = await tx.party_programs.findFirst({
      where: { is_published: false },
      orderBy: { id: "desc" },
      select,
    });

    if (!draft) {
      const error = new Error("NO_DRAFT_TO_DISCARD");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await tx.party_programs.deleteMany({
      where: { is_published: false },
    });

    await writeContentAudit(tx, actor, target(draft), "content_deleted", {
      entity_type: "party_program",
      entity_id: String(draft.id),
    });

    return { discarded: true };
  });
}
