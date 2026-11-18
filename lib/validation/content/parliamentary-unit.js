import { z } from "zod";
import {
  optionalSortOrderSchema,
  optionalText,
  pageQuerySchema,
  publishedSchema,
  requiredText,
  slugSchema,
  smallintIdSchema,
  statusSchema,
} from "./common.js";

export const parliamentaryUnitIdSchema = smallintIdSchema;
export const parliamentaryUnitListQuerySchema = pageQuerySchema;

export const parliamentaryUnitCreateSchema = z
  .object({
    slug: slugSchema,
    title: requiredText(200),
    subtitle: optionalText(300),
    icon: optionalText(100),
    head_name: optionalText(200),
    head_role: optionalText(200),
    body: optionalText(10000),
    source_note: optionalText(500),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const parliamentaryUnitUpdateSchema = parliamentaryUnitCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const parliamentaryUnitStatusSchema = statusSchema;
