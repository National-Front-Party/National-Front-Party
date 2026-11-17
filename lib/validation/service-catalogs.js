import { z } from "zod";

const MAX_PAGE = 10_000;
const MAX_PAGE_SIZE = 100;
const SMALLINT_MIN = -32_768;
const SMALLINT_MAX = 32_767;

export const catalogIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .refine((value) => value <= SMALLINT_MAX);

export const catalogListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
  })
  .strict();

const nameSchema = z.string().trim().min(1).max(200);
const slugSchema = z.string().trim().min(1).max(100);
const sortOrderSchema = z.number().int().min(SMALLINT_MIN).max(SMALLINT_MAX);

export const ministryCreateSchema = z
  .object({
    slug: slugSchema,
    name_ar: nameSchema,
    sort_order: sortOrderSchema.optional(),
  })
  .strict();

export const ministryUpdateSchema = ministryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required.",
  });

export const requestSectorCreateSchema = z
  .object({
    code: slugSchema,
    name_ar: nameSchema,
    sort_order: sortOrderSchema.optional(),
  })
  .strict();

export const requestSectorUpdateSchema = requestSectorCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required.",
  });

export const catalogStatusSchema = z.object({ is_active: z.boolean() }).strict();
