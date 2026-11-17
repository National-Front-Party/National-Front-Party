import { z } from "zod";
import { normalizeDigits, parseNationalId } from "../national-id.js";

const invalidNameMessage = "الاسم لازم يكون رباعي";
const invalidPhoneMessage = "رقم الموبايل غير صحيح";
const invalidNationalIdMessage = "الرقم القومي غير صحيح";

const fullNameSchema = z
  .string()
  .trim()
  .min(8, invalidNameMessage)
  .max(120, invalidNameMessage)
  .refine((name) => name.split(/\s+/).length >= 4, {
    message: invalidNameMessage,
  });

const phoneSchema = z
  .string()
  .transform(normalizeDigits)
  .pipe(z.string().regex(/^01[0125]\d{8}$/, invalidPhoneMessage));

const nationalIdSchema = z
  .string()
  .transform(normalizeDigits)
  .pipe(z.string().regex(/^[23]\d{13}$/, invalidNationalIdMessage))
  .refine((id) => parseNationalId(id) !== null, {
    message: invalidNationalIdMessage,
  });

export const applicationSchema = z
  .object({
    type: z.enum(["member", "volunteer", "follower"]),
    full_name: fullNameSchema,
    phone: phoneSchema,
    national_id: nationalIdSchema,
    governorate_id: z.coerce.number().int().positive(),
    terms_accepted: z.literal(true, { error: "لازم توافق على الشروط" }),
    website: z.string().optional(),
    turnstileToken: z.string().optional(),
  })
  .strict();
