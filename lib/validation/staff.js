import { z } from "zod";
import { ROLES } from "../auth/permissions.js";
import { validatePasswordStrength } from "../auth/password.js";

const roleSchema = z.enum([...ROLES]);
const MAX_PAGE = 10_000;
const passwordSchema = z
  .string()
  .max(128)
  .refine((value) => validatePasswordStrength(value).valid, {
    message: "WEAK_PASSWORD",
  });
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const fullNameSchema = z.string().trim().min(1).max(200);

export const staffIdSchema = z.string().uuid();

export const staffCreateSchema = z
  .object({
    full_name: fullNameSchema,
    email: emailSchema,
    role: roleSchema,
    temporary_password: passwordSchema,
  })
  .strict();

export const staffUpdateSchema = z
  .object({
    full_name: fullNameSchema.optional(),
    email: emailSchema.optional(),
    role: roleSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const staffStatusSchema = z
  .object({ is_active: z.boolean() })
  .strict();

export const staffResetPasswordSchema = z
  .object({ temporary_password: passwordSchema })
  .strict();

export const staffListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  target_id: z.string().trim().min(1).max(100).optional(),
  actor_id: staffIdSchema.optional(),
  action_type: z.string().trim().min(1).max(100).optional(),
});
