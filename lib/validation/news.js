import { z } from "zod";
import {
  MAX_PAGE,
  SMALLINT_MAX,
  optionalSortOrderSchema,
  optionalText,
  pageQuerySchema,
  requiredText,
  slugSchema,
  smallintIdSchema,
  uuidIdSchema,
} from "./content/common.js";
import { isValidCalendarDate } from "./content/leadership.js";

export { isValidCalendarDate };

export const articleIdSchema = uuidIdSchema;
export const sourceIdSchema = smallintIdSchema;

export function normalizeTitleToSlug(title) {
  if (typeof title !== "string") return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[^\p{Script=Arabic}a-z0-9]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const articleSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .regex(/^[\p{Script=Arabic}a-z0-9]+(?:-[\p{Script=Arabic}a-z0-9]+)*$/u, {
    message: "Slug must contain only lowercase Latin letters, Arabic letters, numbers, and hyphens",
  });

export function isValidPublicationDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return false;
  return isValidCalendarDate(year, month, day);
}

export const publicationDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be formatted as YYYY-MM-DD" })
  .refine(isValidPublicationDate, { message: "Invalid Gregorian calendar date" });

export const datePrecisionSchema = z.enum(["day", "month"]).default("day");

export const urlOrEmptySchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value == null || /^https?:\/\//i.test(value), {
    message: "Invalid URL",
  })
  .optional();

export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) =>
      value == null ||
      /^https?:\/\//i.test(value) ||
      /^\/[a-zA-Z0-9_\-./]+$/i.test(value),
    {
      message: "Invalid image URL",
    },
  )
  .optional();

export const articleCreateSchema = z
  .object({
    title: requiredText(300),
    body: requiredText(50000),
    source_id: z.number().int().min(1).max(SMALLINT_MAX),
    source_url: urlOrEmptySchema,
    image_url: imageUrlSchema,
    image_alt: optionalText(200),
    published_on: publicationDateSchema,
    date_precision: datePrecisionSchema.optional(),
    is_featured: z.boolean().optional(),
    sort_order: optionalSortOrderSchema,
    slug: articleSlugSchema.optional(),
  })
  .strict();

export const articleUpdateSchema = z
  .object({
    title: requiredText(300).optional(),
    body: requiredText(50000).optional(),
    source_id: z.number().int().min(1).max(SMALLINT_MAX).optional(),
    source_url: urlOrEmptySchema,
    image_url: imageUrlSchema,
    image_alt: optionalText(200),
    published_on: publicationDateSchema.optional(),
    date_precision: z.enum(["day", "month"]).optional(),
    is_featured: z.boolean().optional(),
    sort_order: optionalSortOrderSchema,
    slug: articleSlugSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required.",
  });

export const requestChangesSchema = z
  .object({
    review_note: z
      .string()
      .trim()
      .min(1, { message: "Review note is required" })
      .max(2000, { message: "Review note must not exceed 2000 characters" }),
  })
  .strict();

export const articleQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(25),
    status: z.enum(["draft", "pending_review", "changes_requested", "published"]).optional(),
    source_id: z.coerce.number().int().min(1).max(SMALLINT_MAX).optional(),
    is_featured: z
      .preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
    is_published: z
      .preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
    search: z.string().trim().max(100).optional(),
    author_id: z.string().uuid().optional(),
    sort_by: z.enum(["created_at", "published_on", "sort_order", "title"]).default("created_at"),
    sort_dir: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const newsSourceCreateSchema = z
  .object({
    name_ar: requiredText(200),
    slug: slugSchema,
    sort_order: optionalSortOrderSchema,
    is_active: z.boolean().optional(),
  })
  .strict();

export const newsSourceUpdateSchema = z
  .object({
    name_ar: requiredText(200).optional(),
    slug: slugSchema.optional(),
    sort_order: optionalSortOrderSchema,
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required.",
  });

export const newsSourceStatusSchema = z
  .object({
    is_active: z.boolean(),
  })
  .strict();

export const newsSourceQuerySchema = pageQuerySchema
  .extend({
    is_active: z
      .preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
  })
  .strict();

export const articlePublicQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(50).default(12),
    featured: z
      .preprocess(
        (val) => (val === "true" ? true : val === "false" ? false : val),
        z.boolean().optional(),
      ),
    source: slugSchema.optional(),
  })
  .strict();

