async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

function buildApplicationsWhere(filters) {
  const where = {};
  if (filters.name) {
    where.full_name = { contains: filters.name, mode: "insensitive" };
  }
  if (filters.phone) where.phone = { contains: filters.phone };
  if (filters.national_id) where.national_id = filters.national_id;
  if (filters.application_no !== undefined) {
    where.application_no = filters.application_no;
  }
  if (filters.application_type) {
    where.application_type = filters.application_type;
  }
  if (filters.status) where.status = filters.status;
  if (filters.governorate_id !== undefined) {
    where.governorate_id = filters.governorate_id;
  }
  if (filters.assigned_to) where.assigned_to = filters.assigned_to;
  if (filters.created_from || filters.created_to) {
    where.created_at = {
      ...(filters.created_from ? { gte: filters.created_from } : {}),
      ...(filters.created_to ? { lte: filters.created_to } : {}),
    };
  }
  return where;
}

const listSelect = {
  id: true,
  application_no: true,
  full_name: true,
  application_type: true,
  status: true,
  governorate: { select: { id: true, name_ar: true } },
  assigned_staff_user: { select: { id: true, full_name: true } },
  created_at: true,
  updated_at: true,
};

export async function listApplications(filters, db) {
  const database = await getDatabase(db);
  const where = buildApplicationsWhere(filters);
  const skip = (filters.page - 1) * filters.page_size;
  const [rows, total] = await Promise.all([
    database.membership_applications.findMany({
      where,
      skip,
      take: filters.page_size,
      orderBy: [{ created_at: "desc" }, { application_no: "desc" }],
      select: listSelect,
    }),
    database.membership_applications.count({ where }),
  ]);

  return {
    applications: rows.map((row) => ({
      ...row,
      application_no: row.application_no.toString(),
    })),
    pagination: {
      page: filters.page,
      page_size: filters.page_size,
      total,
      total_pages: Math.ceil(total / filters.page_size),
    },
  };
}

export async function getApplication(applicationId, db) {
  const database = await getDatabase(db);
  const application = await database.membership_applications.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      application_no: true,
      application_type: true,
      full_name: true,
      birth_date: true,
      gender: true,
      phone: true,
      national_id: true,
      education_level: true,
      occupation: true,
      governorate_id: true,
      governorate: { select: { id: true, name_ar: true } },
      terms_accepted: true,
      status: true,
      assigned_to: true,
      assigned_staff_user: { select: { id: true, full_name: true } },
      reviewed_by: true,
      reviewed_at: true,
      reviewed_staff_user: { select: { id: true, full_name: true } },
      rejection_reason: true,
      internal_notes: true,
      source: true,
      created_at: true,
      updated_at: true,
      members: {
        select: { membership_no: true, status: true, joined_at: true },
      },
      application_status_history: {
        orderBy: [{ changed_at: "desc" }, { id: "desc" }],
        select: {
          id: true,
          from_status: true,
          to_status: true,
          changed_by: true,
          changed_by_staff_user: { select: { full_name: true } },
          note: true,
          changed_at: true,
        },
      },
    },
  });

  if (!application) return null;
  return {
    ...application,
    application_no: application.application_no.toString(),
    members: application.members
      ? {
          ...application.members,
          membership_no: application.members.membership_no.toString(),
        }
      : null,
    application_status_history: application.application_status_history.map(
      (entry) => ({ ...entry, id: entry.id.toString() }),
    ),
  };
}
