import { z } from "zod";
import {
  optionalSortOrderSchema,
  optionalText,
  pageQuerySchema,
  publishedSchema,
  requiredText,
  smallintIdSchema,
  statusSchema,
  urlOrEmptySchema,
  uuidIdSchema,
} from "./common.js";

export const centralSecretariatIdSchema = smallintIdSchema;
export const centralSecretariatPersonIdSchema = uuidIdSchema;
export const centralSecretariatListQuerySchema = pageQuerySchema;

export const centralSecretariatCreateSchema = z
  .object({
    info_item_id: z.number().int().min(1).max(32_767),
    name_ar: requiredText(200),
    head_name: optionalText(200),
    source_note: optionalText(500),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const centralSecretariatUpdateSchema = centralSecretariatCreateSchema
  .omit({ info_item_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const centralSecretariatStatusSchema = statusSchema;

export const centralSecretariatPersonCreateSchema = z
  .object({
    full_name: requiredText(200),
    position_title: optionalText(200),
    image_url: urlOrEmptySchema,
    details: optionalText(2000),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const centralSecretariatPersonUpdateSchema = centralSecretariatPersonCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const centralSecretariatPersonStatusSchema = statusSchema;
