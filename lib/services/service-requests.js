const ministrySelect = { id: true, name_ar: true, sort_order: true };
const sectorSelect = { id: true, name_ar: true, sort_order: true };

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

export async function getActiveMinistries(db) {
  const database = await getDatabase(db);
  return database.ministries.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: ministrySelect,
  });
}

export async function getActiveRequestSectors(db) {
  const database = await getDatabase(db);
  return database.request_sectors.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: sectorSelect,
  });
}

export async function createServiceRequest(input, db) {
  const database = await getDatabase(db);
  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }

  return database.$transaction(async (tx) => {
    if (typeof tx.$queryRaw !== "function") {
      throw new TypeError("PostgreSQL row locks are required");
    }

    const ministries = await tx.$queryRaw`
      SELECT "id"
      FROM "ministries"
      WHERE "id" = ${input.ministry_id} AND "is_active" = true
      FOR SHARE
    `;
    if (ministries.length !== 1) {
      return { ok: false, code: "INVALID_SELECTION" };
    }

    const sectors = await tx.$queryRaw`
      SELECT "id"
      FROM "request_sectors"
      WHERE "id" = ${input.sector_id} AND "is_active" = true
      FOR SHARE
    `;
    if (sectors.length !== 1) {
      return { ok: false, code: "INVALID_SELECTION" };
    }

    const created = await tx.service_requests.create({
      data: {
        full_name: input.full_name,
        phone: input.phone,
        ministry_id: input.ministry_id,
        sector_id: input.sector_id,
      },
      select: { id: true },
    });

    return { ok: true, id: created.id };
  });
}

export async function updateServiceRequestStatus(id, status, staffId, note, db) {
  const database = await getDatabase(db);
  const existing = await database.service_requests.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const updated = await database.service_requests.update({
    where: { id },
    data: {
      status,
      ...(staffId ? { assigned_to: staffId } : {}),
      ...(note ? { internal_notes: note } : {}),
      updated_at: new Date(),
    },
    select: {
      id: true,
      request_no: true,
      status: true,
    },
  });

  return { ok: true, status: updated.status, request_no: updated.request_no.toString() };
}
