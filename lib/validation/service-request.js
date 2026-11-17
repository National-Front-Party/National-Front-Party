import { z } from "zod";

const smallIntId = z.union([
  z.number().int().min(1).max(32_767),
  z.string().regex(/^[1-9]\d*$/).transform(Number),
]).refine((value) => value <= 32_767);

const fullName = z.string().trim().min(1).max(200);
const egyptianMobile = z
  .string()
  .trim()
  .regex(/^01[0125]\d{8}$/, "رقم الموبايل غير صحيح");

export const serviceRequestSchema = z
  .object({
    full_name: fullName,
    phone: egyptianMobile,
    ministry_id: smallIntId,
    sector_id: smallIntId,
  })
  .strict();
