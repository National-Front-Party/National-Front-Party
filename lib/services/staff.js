import { hashPassword, verifyPassword } from "../auth/password.js";

const ADMIN_GUARD_LOCK = 7_319_024_118_025_771n;

async function getDatabase(db) {
  return db ?? (await import("../db.js")).prisma;
}

function staffSelect() {
  return {
    id: true,
    full_name: true,
    email: true,
    role: true,
    is_active: true,
    created_at: true,
    last_login_at: true,
    must_change_password: true,
  };
}

function auditBase(actor, target) {
  return {
    actor_id: actor.id,
    actor_name: actor.full_name,
    actor_email: actor.email,
    actor_staff_user_id: actor.id,
    target_id: target.id,
    target_name: target.full_name,
    target_email: target.email,
    target_staff_user_id: target.id,
  };
}

async function transaction(database, callback) {
  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }
  return database.$transaction(callback);
}

async function lockAdminChanges(tx) {
  if (typeof tx.$queryRaw !== "function") {
    throw new TypeError("PostgreSQL transaction advisory locks are required");
  }
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${ADMIN_GUARD_LOCK})::text`;
}

async function requireRemainingAdmin(tx, current, nextRole, nextActive) {
  const wasActiveAdmin = current.role === "super_admin" && current.is_active;
  const willBeActiveAdmin = nextRole === "super_admin" && nextActive;
  if (!wasActiveAdmin || willBeActiveAdmin) return true;

  const count = await tx.staff_users.count({
    where: { role: "super_admin", is_active: true },
  });
  return count > 1;
}

export async function listStaff({ page, page_size }, db) {
  const database = await getDatabase(db);
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.staff_users.findMany({
      skip,
      take: page_size,
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      select: staffSelect(),
    }),
    database.staff_users.count(),
  ]);
  return { items, page, page_size, total };
}

export async function getStaff(staffId, db) {
  const database = await getDatabase(db);
  return database.staff_users.findUnique({
    where: { id: staffId },
    select: staffSelect(),
  });
}

export async function createStaff(input, actor, db) {
  const database = await getDatabase(db);
  const passwordHash = await hashPassword(input.temporary_password);

  return transaction(database, async (tx) => {
    if (input.role === "super_admin") await lockAdminChanges(tx);
    const target = await tx.staff_users.create({
      data: {
        full_name: input.full_name,
        email: input.email,
        role: input.role,
        is_active: true,
        password_hash: passwordHash,
        must_change_password: true,
      },
      select: staffSelect(),
    });
    await tx.staff_audit_log.create({
      data: {
        ...auditBase(actor, target),
        action_type: "staff_created",
        details: { new_role: target.role, new_is_active: target.is_active },
      },
    });
    return target;
  });
}

export async function updateStaff(staffId, input, actor, db) {
  const database = await getDatabase(db);
  return transaction(database, async (tx) => {
    if (input.role !== undefined) await lockAdminChanges(tx);
    const current = await tx.staff_users.findUnique({
      where: { id: staffId },
      select: staffSelect(),
    });
    if (!current) return { ok: false, code: "NOT_FOUND" };

    const nextRole = input.role ?? current.role;
    if (
      input.role !== undefined &&
      !(await requireRemainingAdmin(tx, current, nextRole, current.is_active))
    ) {
      return { ok: false, code: "LAST_ACTIVE_SUPER_ADMIN" };
    }

    const changedFields = [];
    if (input.full_name !== undefined && input.full_name !== current.full_name) {
      changedFields.push("full_name");
    }
    if (input.email !== undefined && input.email !== current.email) {
      changedFields.push("email");
    }
    const roleChanged = input.role !== undefined && input.role !== current.role;
    if (changedFields.length === 0 && !roleChanged) {
      return { ok: true, staff: current, changed: false };
    }

    const target = await tx.staff_users.update({
      where: { id: staffId },
      data: Object.fromEntries(
        ["full_name", "email", "role"]
          .filter((key) => input[key] !== undefined)
          .map((key) => [key, input[key]]),
      ),
      select: staffSelect(),
    });

    if (changedFields.length > 0) {
      await tx.staff_audit_log.create({
        data: {
          ...auditBase(actor, target),
          action_type: "staff_profile_updated",
          details: { changed_fields: changedFields },
        },
      });
    }
    if (roleChanged) {
      await tx.staff_audit_log.create({
        data: {
          ...auditBase(actor, target),
          action_type: "staff_role_changed",
          details: { previous_role: current.role, new_role: target.role },
        },
      });
    }
    return { ok: true, staff: target, changed: true };
  });
}

export async function setStaffActive(staffId, isActive, actor, db) {
  const database = await getDatabase(db);
  return transaction(database, async (tx) => {
    await lockAdminChanges(tx);
    const current = await tx.staff_users.findUnique({
      where: { id: staffId },
      select: staffSelect(),
    });
    if (!current) return { ok: false, code: "NOT_FOUND" };
    if (
      !(await requireRemainingAdmin(tx, current, current.role, isActive))
    ) {
      return { ok: false, code: "LAST_ACTIVE_SUPER_ADMIN" };
    }
    if (current.is_active === isActive) {
      return { ok: true, staff: current, changed: false };
    }

    const target = await tx.staff_users.update({
      where: { id: staffId },
      data: { is_active: isActive },
      select: staffSelect(),
    });
    await tx.staff_audit_log.create({
      data: {
        ...auditBase(actor, target),
        action_type: isActive ? "staff_activated" : "staff_deactivated",
        details: {
          previous_is_active: current.is_active,
          new_is_active: target.is_active,
        },
      },
    });
    return { ok: true, staff: target, changed: true };
  });
}

export async function resetStaffPassword(staffId, temporaryPassword, actor, db) {
  const database = await getDatabase(db);
  const passwordHash = await hashPassword(temporaryPassword);
  return transaction(database, async (tx) => {
    const current = await tx.staff_users.findUnique({
      where: { id: staffId },
      select: staffSelect(),
    });
    if (!current) return { ok: false, code: "NOT_FOUND" };
    const target = await tx.staff_users.update({
      where: { id: staffId },
      data: { password_hash: passwordHash, must_change_password: true },
      select: staffSelect(),
    });
    await tx.staff_audit_log.create({
      data: {
        ...auditBase(actor, target),
        action_type: "staff_password_reset",
        details: {},
      },
    });
    return target;
  });
}

export async function listStaffAuditLog(
  { page, page_size, target_id, actor_id, action_type },
  db,
) {
  const database = await getDatabase(db);
  const where = {};
  if (target_id) where.target_id = target_id;
  if (actor_id) where.actor_id = actor_id;
  if (action_type) where.action_type = action_type;
  const skip = (page - 1) * page_size;
  const [items, total] = await Promise.all([
    database.staff_audit_log.findMany({
      where,
      skip,
      take: page_size,
      orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
      select: {
        id: true,
        actor_id: true,
        actor_name: true,
        actor_email: true,
        target_id: true,
        target_name: true,
        target_email: true,
        action_type: true,
        details: true,
        occurred_at: true,
      },
    }),
    database.staff_audit_log.count({ where }),
  ]);
  return {
    items: items.map((item) => ({ ...item, id: item.id.toString() })),
    page,
    page_size,
    total,
  };
}

async function verifyAuditDeletePassword(staffId, password, db) {
  const database = await getDatabase(db);
  const staff = await database.staff_users.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      is_active: true,
      role: true,
      password_hash: true,
    },
  });
  if (
    !staff ||
    staff.is_active !== true ||
    staff.role !== "super_admin" ||
    !staff.password_hash
  ) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (!(await verifyPassword(password, staff.password_hash))) {
    return { ok: false, code: "INVALID_CURRENT_PASSWORD" };
  }
  return { ok: true };
}

export async function deleteStaffAuditLog(id, password, staff, db) {
  const verified = await verifyAuditDeletePassword(staff.id, password, db);
  if (!verified.ok) return verified;

  const database = await getDatabase(db);
  const deleted = await database.staff_audit_log.deleteMany({
    where: { id },
  });
  if (deleted.count === 0) return { ok: false, code: "NOT_FOUND" };
  return { ok: true, deleted: deleted.count };
}

export async function clearStaffAuditLog(password, staff, db) {
  const verified = await verifyAuditDeletePassword(staff.id, password, db);
  if (!verified.ok) return verified;

  const database = await getDatabase(db);
  const deleted = await database.staff_audit_log.deleteMany({});
  return { ok: true, deleted: deleted.count };
}

const AUDIT_ACTION_LABELS = {
  staff_created: "إنشاء حساب موظف",
  staff_profile_updated: "تحديث بيانات موظف",
  staff_role_changed: "تغيير دور موظف",
  staff_activated: "تفعيل حساب موظف",
  staff_deactivated: "تعطيل حساب موظف",
  staff_password_reset: "إعادة تعيين كلمة مرور موظف",
  content_created: "إنشاء محتوى",
  content_updated: "تحديث محتوى",
  content_published: "نشر محتوى",
  content_unpublished: "إلغاء نشر محتوى",
  content_deleted: "حذف محتوى",
};

export function getAuditActionLabel(actionType) {
  return AUDIT_ACTION_LABELS[actionType] ?? "إجراء إداري آخر";
}

export async function listStaffAuditActionTypes(db) {
  const database = await getDatabase(db);
  const rows = await database.staff_audit_log.groupBy({
    by: ["action_type"],
    orderBy: { action_type: "asc" },
  });
  return rows.map(({ action_type }) => ({
    value: action_type,
    label: getAuditActionLabel(action_type),
  }));
}
