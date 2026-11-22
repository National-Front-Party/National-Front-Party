import { z } from "zod";

export const MAX_PAGE = 10_000;
export const SMALLINT_MAX = 32_767;

export const smallintIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .refine((value) => value <= SMALLINT_MAX);

export const uuidIdSchema = z.string().uuid();

export const pageQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export const sortOrderSchema = z.number().int().min(-32_768).max(SMALLINT_MAX);
export const optionalSortOrderSchema = sortOrderSchema.optional();
export const publishedSchema = z.boolean();
export const statusSchema = z.object({ is_published: publishedSchema }).strict();

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const urlOrEmptySchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) =>
      value == null ||
      /^https?:\/\//i.test(value) ||
      (/^\/uploads\/org\/[a-zA-Z0-9_\-./]+$/i.test(value) && !value.includes("..")),
    {
      message: "Invalid URL",
    },
  );

export const deleteConfirmSchema = z
  .object({ confirm: z.literal(true) })
  .strict();

export function optionalText(max) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? null : value));
}

export function requiredText(max) {
  return z.string().trim().min(1).max(max);
}
