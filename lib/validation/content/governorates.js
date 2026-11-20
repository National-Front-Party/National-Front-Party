import { z } from "zod";
import {
  optionalSortOrderSchema,
  requiredText,
  smallintIdSchema,
} from "./common.js";

export const governorateIdSchema = smallintIdSchema;

export const governorateCreateSchema = z
  .object({
    name_ar: requiredText(100),
    code: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .regex(/^[A-Za-z0-9_-]+$/, "كود المحافظة يجب أن يحتوي على أحرف وأرقام إنجليزية فقط (مثل EG-C)"),
    sort_order: optionalSortOrderSchema,
    is_active: z.boolean().optional(),
  })
  .strict();

export const governorateUpdateSchema = governorateCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const governorateStatusSchema = z
  .object({
    is_active: z.boolean(),
  })
  .strict();
