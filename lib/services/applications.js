import { isIP } from "node:net";
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
