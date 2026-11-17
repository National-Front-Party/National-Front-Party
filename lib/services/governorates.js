export async function getActiveGovernorates(db) {
  const database = db ?? (await import("../db.js")).prisma;

  return database.governorates.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    select: {
      id: true,
      name_ar: true,
    },
  });
}
