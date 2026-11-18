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
  urlOrEmptySchema,
  uuidIdSchema,
} from "./common.js";

export const panelIdSchema = smallintIdSchema;
export const leaderIdSchema = uuidIdSchema;
export const leadershipContentIdSchema = smallintIdSchema;
export const panelListQuerySchema = pageQuerySchema;
export const leaderListQuerySchema = pageQuerySchema.extend({
  panel_id: z.coerce.number().int().min(1).max(32_767).optional(),
}).strict();
export const leadershipContentListQuerySchema = pageQuerySchema;

export const panelCreateSchema = z
  .object({
    slug: slugSchema,
    title: requiredText(200),
    subtitle: optionalText(300),
    icon: optionalText(100),
    leaders_heading: optionalText(200),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const panelUpdateSchema = panelCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export const panelStatusSchema = statusSchema;

export const leaderCreateSchema = z
  .object({
    panel_id: z.number().int().min(1).max(32_767),
    full_name: requiredText(200),
    role_title: optionalText(200),
    photo_url: urlOrEmptySchema,
    badge_label: optionalText(50),
    is_head: z.boolean().optional(),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const leaderUpdateSchema = z
  .object({
    panel_id: z.number().int().min(1).max(32_767).optional(),
    full_name: requiredText(200).optional(),
    role_title: optionalText(200),
    photo_url: urlOrEmptySchema,
    badge_label: optionalText(50),
    is_head: z.boolean().optional(),
    sort_order: sortOrderSchema.optional(),
    is_published: publishedSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export const leaderStatusSchema = statusSchema;

export function isValidCalendarDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function isValidDecisionDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  return isValidCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

const decisionDateSchema = z
  .union([
    z.string().refine(isValidDecisionDate, { message: "Invalid calendar date" }),
    z.literal(""),
  ])
  .optional()
  .transform((value) => (value === "" ? null : value ?? null));

export const leadershipContentCreateSchema = z
  .object({
    slug: slugSchema,
    button_label: requiredText(200),
    title: requiredText(200),
    person_name: requiredText(200),
    person_role_title: requiredText(200),
    body: requiredText(10000),
    decision_number: optionalText(100),
    decision_date: decisionDateSchema,
    source_note: optionalText(500),
    icon: optionalText(100),
    button_style: optionalText(100),
    action_type: optionalText(100),
    sort_order: optionalSortOrderSchema,
    is_published: publishedSchema.optional(),
  })
  .strict();

export const leadershipContentUpdateSchema = leadershipContentCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export const leadershipContentStatusSchema = statusSchema;
