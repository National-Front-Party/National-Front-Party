import { z } from "zod";
import {
  optionalSortOrderSchema,
  optionalText,
  pageQuerySchema,
  publishedSchema,
  requiredText,
  slugSchema,
  smallintIdSchema,
  sortOrderSchema,
  statusSchema,
} from "./common.js";

export const popupIdSchema = smallintIdSchema;
export const popupListQuerySchema = pageQuerySchema;

export const popupCreateSchema = z
  .object({
    slug: slugSchema,
    title: requiredText(200),
    body: optionalText(10000),
    source_note: optionalText(500),
    icon: optionalText(100),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const popupUpdateSchema = z
  .object({
    slug: slugSchema.optional(),
    title: requiredText(200).optional(),
    body: optionalText(10000),
    source_note: optionalText(500),
    icon: optionalText(100),
    sort_order: sortOrderSchema.optional(),
    is_published: publishedSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const popupStatusSchema = statusSchema;
