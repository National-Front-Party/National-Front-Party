const CATALOGS = Object.freeze({
  ministries: Object.freeze({ model: "ministries", uniqueField: "slug" }),
  request_sectors: Object.freeze({ model: "request_sectors", uniqueField: "code" }),
});

const baseCatalogSelect = {
  id: true,
  name_ar: true,
  sort_order: true,
  is_active: true,
};

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

function getCatalogConfig(catalog) {
  const config = CATALOGS[catalog];
  if (!config) throw new TypeError("Unknown service catalog");
  return config;
}

function selectFor(catalog) {
  const config = getCatalogConfig(catalog);
  return {
    ...baseCatalogSelect,
    ...(catalog === "ministries" ? { created_at: true } : {}),
    [config.uniqueField]: true,
  };
}

export async function listServiceCatalog(catalog, { page, page_size }, db) {
  const database = await getDatabase(db);
  const { model } = getCatalogConfig(catalog);
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database[model].findMany({
      skip,
      take: page_size,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      select: selectFor(catalog),
    }),
    database[model].count(),
  ]);

  return {
    items,
    pagination: {
      page,
      page_size,
      total,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

export async function getServiceCatalogItem(catalog, id, db) {
  const database = await getDatabase(db);
  const { model } = getCatalogConfig(catalog);
  return database[model].findUnique({
    where: { id },
    select: selectFor(catalog),
  });
}

export async function createServiceCatalogItem(catalog, input, db) {
  const database = await getDatabase(db);
  const { model } = getCatalogConfig(catalog);
  return database[model].create({
    data: input,
    select: selectFor(catalog),
  });
}

export async function updateServiceCatalogItem(catalog, id, input, db) {
  const database = await getDatabase(db);
  const { model } = getCatalogConfig(catalog);
  return database[model].update({
    where: { id },
    data: input,
    select: selectFor(catalog),
  });
}

export async function setServiceCatalogActive(catalog, id, isActive, db) {
  const database = await getDatabase(db);
  const { model } = getCatalogConfig(catalog);
  return database[model].update({
    where: { id },
    data: { is_active: isActive },
    select: selectFor(catalog),
  });
}

export async function deleteServiceCatalogItem(catalog, id, db) {
  const database = await getDatabase(db);
  const { model } = getCatalogConfig(catalog);

  // Check foreign key constraint with service_requests
  const usageCount = await database.service_requests.count({
    where: catalog === "ministries" ? { ministry_id: id } : { sector_id: id },
  });

  if (usageCount > 0) {
    return { ok: false, code: "CATALOG_IN_USE", count: usageCount };
  }

  try {
    const deleted = await database[model].delete({
      where: { id },
      select: selectFor(catalog),
    });
    return { ok: true, item: deleted };
  } catch (err) {
    if (err?.code === "P2025") {
      return { ok: false, code: "NOT_FOUND" };
    }
    if (err?.code === "P2003") {
      return { ok: false, code: "CATALOG_IN_USE" };
    }
    throw err;
  }
}
