import { z } from "zod";
import {
  optionalSortOrderSchema,
  optionalText,
  pageQuerySchema,
  publishedSchema,
  requiredText,
  statusSchema,
  urlOrEmptySchema,
  uuidIdSchema,
} from "./common.js";

export const governorateSecretariatIdSchema = uuidIdSchema;
export const governorateSecretariatListQuerySchema = pageQuerySchema.extend({
  governorate_id: z.coerce.number().int().min(1).max(32_767).optional(),
}).strict();

export const governorateSecretariatCreateSchema = z
  .object({
    governorate_id: z.number().int().min(1).max(32_767),
    full_name: requiredText(200),
    role_title: optionalText(200),
    photo_url: urlOrEmptySchema,
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const governorateSecretariatUpdateSchema = governorateSecretariatCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const governorateSecretariatStatusSchema = statusSchema;
