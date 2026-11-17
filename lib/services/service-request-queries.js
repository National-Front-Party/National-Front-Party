async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

export function buildServiceRequestsWhere(filters) {
  const where = {};
  if (filters.name) where.full_name = { contains: filters.name, mode: "insensitive" };
  if (filters.request_no !== undefined) where.request_no = filters.request_no;
  if (filters.phone) where.phone = { contains: filters.phone };
  if (filters.status) where.status = filters.status;
  if (filters.ministry_id !== undefined) where.ministry_id = filters.ministry_id;
  if (filters.sector_id !== undefined) where.sector_id = filters.sector_id;
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
  request_no: true,
  full_name: true,
  phone: true,
  status: true,
  ministry: { select: { id: true, name_ar: true } },
  request_sector: { select: { id: true, name_ar: true } },
  assigned_to: true,
  assigned_staff_user: { select: { id: true, full_name: true } },
  created_at: true,
  updated_at: true,
};

function serializeListRequest(request) {
  return {
    id: request.id,
    request_no: request.request_no.toString(),
    full_name: request.full_name,
    phone: request.phone,
    status: request.status,
    ministry: { id: request.ministry.id, name_ar: request.ministry.name_ar },
    request_sector: { id: request.request_sector.id, name_ar: request.request_sector.name_ar },
    assigned_to: request.assigned_to,
    assigned_staff_user: request.assigned_staff_user
      ? { id: request.assigned_staff_user.id, full_name: request.assigned_staff_user.full_name }
      : null,
    created_at: request.created_at,
    updated_at: request.updated_at,
  };
}

function serializeDetailRequest(request) {
  return {
    id: request.id,
    request_no: request.request_no.toString(),
    full_name: request.full_name,
    phone: request.phone,
    ministry: { id: request.ministry.id, slug: request.ministry.slug, name_ar: request.ministry.name_ar },
    request_sector: { id: request.request_sector.id, code: request.request_sector.code, name_ar: request.request_sector.name_ar },
    status: request.status,
    assigned_to: request.assigned_to,
    assigned_staff_user: request.assigned_staff_user
      ? { id: request.assigned_staff_user.id, full_name: request.assigned_staff_user.full_name }
      : null,
    internal_notes: request.internal_notes,
    source: request.source,
    created_at: request.created_at,
    updated_at: request.updated_at,
  };
}

export async function listServiceRequests(filters, db) {
  const database = await getDatabase(db);
  const where = buildServiceRequestsWhere(filters);
  const skip = (filters.page - 1) * filters.page_size;
  const [rows, total] = await Promise.all([
    database.service_requests.findMany({
      where,
      skip,
      take: filters.page_size,
      orderBy: [{ created_at: "desc" }, { request_no: "desc" }],
      select: listSelect,
    }),
    database.service_requests.count({ where }),
  ]);

  return {
    service_requests: rows.map(serializeListRequest),
    pagination: {
      page: filters.page,
      page_size: filters.page_size,
      total,
      total_pages: Math.ceil(total / filters.page_size),
    },
  };
}

export async function getServiceRequest(requestId, db) {
  const database = await getDatabase(db);
  const request = await database.service_requests.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      request_no: true,
      full_name: true,
      phone: true,
      ministry: { select: { id: true, slug: true, name_ar: true } },
      request_sector: { select: { id: true, code: true, name_ar: true } },
      status: true,
      assigned_to: true,
      assigned_staff_user: { select: { id: true, full_name: true } },
      internal_notes: true,
      source: true,
      created_at: true,
      updated_at: true,
    },
  });

  return request ? serializeDetailRequest(request) : null;
}
