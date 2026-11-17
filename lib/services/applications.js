import { isIP } from "node:net";
import { hasPermission } from "../auth/permissions.js";
import { parseNationalId } from "../national-id.js";

export async function createApplication(input, ip, db) {
  const database = db ?? (await import("../db.js")).prisma;
  const parsedNationalId = parseNationalId(input.national_id);

  if (!parsedNationalId) {
    return { ok: false, code: "INVALID_NATIONAL_ID" };
  }

  const governorate = await database.governorates.findFirst({
    where: {
      id: input.governorate_id,
      is_active: true,
    },
    select: { id: true },
  });

  if (!governorate) {
    return { ok: false, code: "INVALID_GOVERNORATE" };
  }

  const submittedIp = typeof ip === "string" && isIP(ip) !== 0 ? ip : null;
  const transaction =
    typeof database.$transaction === "function"
      ? database.$transaction.bind(database)
      : (callback) => callback(database);

  return transaction(async (tx) => {
    const duplicate = await tx.membership_applications.findFirst({
      where: {
        national_id: input.national_id,
        status: { not: "rejected" },
      },
      select: { id: true },
    });

    if (duplicate) {
      return { ok: false, code: "DUPLICATE" };
    }

    const application = await tx.membership_applications.create({
      data: {
        full_name: input.full_name,
        phone: input.phone,
        national_id: input.national_id,
        governorate_id: input.governorate_id,
        birth_date: parsedNationalId.birthDate,
        gender: parsedNationalId.gender,
        application_type: input.type,
        terms_accepted: true,
        status: "new",
        source: "website",
        submitted_ip: submittedIp,
        education_level: null,
        occupation: null,
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        internal_notes: null,
      },
      select: {
        id: true,
        application_no: true,
      },
    });

    await tx.application_status_history.create({
      data: {
        application_id: application.id,
        from_status: null,
        to_status: "new",
        changed_by: null,
        note: "تم الاستلام من الموقع",
      },
    });

    return {
      ok: true,
      applicationNo: String(application.application_no),
    };
  });
}

const ALLOWED_APPLICATION_TRANSITIONS = Object.freeze({
  new: Object.freeze(["under_review"]),
  under_review: Object.freeze(["accepted", "rejected"]),
  accepted: Object.freeze([]),
  rejected: Object.freeze([]),
});

export async function changeApplicationStatus(
  applicationId,
  targetStatus,
  staffId,
  rejectionReason,
  db,
) {
  const database = db ?? (await import("../db.js")).prisma;

  if (typeof staffId !== "string" || staffId.length === 0) {
    return { ok: false, code: "INVALID_REVIEWER" };
  }
  if (!Object.hasOwn(ALLOWED_APPLICATION_TRANSITIONS, targetStatus)) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  const normalizedReason = typeof rejectionReason === "string"
    ? rejectionReason.trim()
    : "";
  if (
    targetStatus === "rejected" &&
    (normalizedReason.length === 0 || normalizedReason.length > 1000)
  ) {
    return { ok: false, code: "INVALID_REJECTION_REASON" };
  }

  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }

  return database.$transaction(async (tx) => {
    const application = await tx.membership_applications.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        application_type: true,
        status: true,
        governorate_id: true,
      },
    });

    if (!application) {
      return { ok: false, code: "NOT_FOUND" };
    }

    if (!ALLOWED_APPLICATION_TRANSITIONS[application.status]?.includes(targetStatus)) {
      return { ok: false, code: "INVALID_STATUS" };
    }

    const updated = await tx.membership_applications.updateMany({
      where: {
        id: application.id,
        status: application.status,
      },
      data: {
        status: targetStatus,
        reviewed_by: staffId,
        reviewed_at: new Date(),
        ...(targetStatus === "rejected"
          ? { rejection_reason: normalizedReason }
          : {}),
      },
    });

    if (updated.count !== 1) {
      return { ok: false, code: "CONFLICT" };
    }

    let membershipNo = null;
    if (
      targetStatus === "accepted" &&
      application.application_type === "member"
    ) {
      const member = await tx.members.create({
        data: {
          application_id: application.id,
          governorate_id: application.governorate_id,
        },
        select: { membership_no: true },
      });
      membershipNo = String(member.membership_no);
    }

    await tx.application_status_history.create({
      data: {
        application_id: application.id,
        from_status: application.status,
        to_status: targetStatus,
        changed_by: staffId,
        note: targetStatus === "rejected"
          ? normalizedReason
          : targetStatus === "accepted"
            ? application.application_type === "member"
              ? "تم قبول الطلب وإنشاء العضوية"
              : "تم قبول الطلب"
            : null,
      },
    });

    return { ok: true, status: targetStatus, membershipNo };
  });
}

export async function acceptApplication(applicationId, staffId, db) {
  const result = await changeApplicationStatus(
    applicationId,
    "accepted",
    staffId,
    undefined,
    db,
  );
  if (!result.ok && result.code === "CONFLICT") {
    return { ok: false, code: "INVALID_STATUS" };
  }
  return result.ok
    ? { ok: true, membershipNo: result.membershipNo }
    : result;
}

export async function addApplicationInternalNote(
  applicationId,
  note,
  db,
) {
  const normalizedNote = typeof note === "string" ? note.trim() : "";
  if (normalizedNote.length === 0 || normalizedNote.length > 1000) {
    return { ok: false, code: "INVALID_NOTE" };
  }

  const database = db ?? (await import("../db.js")).prisma;
  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }

  return database.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw`
      SELECT "internal_notes"
      FROM "membership_applications"
      WHERE "id" = ${applicationId}::uuid
      FOR UPDATE
    `;
    if (lockedRows.length === 0) return { ok: false, code: "NOT_FOUND" };

    const previous = lockedRows[0].internal_notes;
    const combined = previous
      ? [previous, normalizedNote].join("\n")
      : normalizedNote;
    await tx.membership_applications.update({
      where: { id: applicationId },
      data: { internal_notes: combined },
      select: { id: true },
    });
    return { ok: true };
  });
}

export async function assignApplication(applicationId, staffId, db) {
  const database = db ?? (await import("../db.js")).prisma;
  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }

  return database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT "role", "is_active"
      FROM "staff_users"
      WHERE "id" = ${staffId}::uuid
      FOR SHARE
    `;
    if (rows.length === 0) return { ok: false, code: "ASSIGNEE_NOT_FOUND" };
    if (rows[0].is_active !== true) {
      return { ok: false, code: "ASSIGNEE_INACTIVE" };
    }
    if (!hasPermission(rows[0].role, "applications:update")) {
      return { ok: false, code: "ASSIGNEE_UNAUTHORIZED" };
    }

    const updated = await tx.membership_applications.updateMany({
      where: { id: applicationId },
      data: { assigned_to: staffId },
    });
    return updated.count === 1
      ? { ok: true, assignedTo: staffId }
      : { ok: false, code: "NOT_FOUND" };
  });
}

export async function unassignApplication(applicationId, db) {
  const database = db ?? (await import("../db.js")).prisma;
  if (typeof database.$transaction !== "function") {
    throw new TypeError("A transactional database client is required");
  }
  return database.$transaction(async (tx) => {
    const updated = await tx.membership_applications.updateMany({
      where: { id: applicationId },
      data: { assigned_to: null },
    });
    return updated.count === 1
      ? { ok: true, assignedTo: null }
      : { ok: false, code: "NOT_FOUND" };
  });
}
