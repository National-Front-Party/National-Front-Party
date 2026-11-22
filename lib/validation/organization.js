import { z } from "zod";
import {
  optionalSortOrderSchema,
  optionalText,
  publishedSchema,
  requiredText,
  smallintIdSchema,
  uuidIdSchema,
} from "./content/common.js";

export const organizationIdSchema = smallintIdSchema;
export const organizationPersonIdSchema = uuidIdSchema;

const nameSchema = requiredText(160);
const parentId = z.number().int().min(1).max(32_767);
const activeSchema = z.boolean();

export const centerCreateSchema = z.object({
  governorate_id: parentId,
  name_ar: nameSchema,
  sort_order: optionalSortOrderSchema,
  is_active: activeSchema.optional(),
}).strict();
export const centerUpdateSchema = centerCreateSchema.omit({ governorate_id: true }).partial()
  .refine((v) => Object.keys(v).length > 0);

export const localSecretariatCreateSchema = z.object({
  center_id: parentId,
  name_ar: nameSchema,
  sort_order: optionalSortOrderSchema,
  is_active: activeSchema.optional(),
}).strict();
export const localSecretariatUpdateSchema = localSecretariatCreateSchema.omit({ center_id: true }).partial()
  .refine((v) => Object.keys(v).length > 0);

export const partyUnitCreateSchema = z.object({
  secretariat_id: parentId,
  name_ar: nameSchema,
  sort_order: optionalSortOrderSchema,
  is_active: activeSchema.optional(),
}).strict();
export const partyUnitUpdateSchema = partyUnitCreateSchema.omit({ secretariat_id: true }).partial()
  .refine((v) => Object.keys(v).length > 0);

export const organizationStatusSchema = z.object({ is_active: activeSchema }).strict();
export const organizationDeleteSchema = z.object({ confirm: z.literal(true) }).strict();

export const partyUnitPersonCreateSchema = z.object({
  member_id: uuidIdSchema.nullable().optional(),
  full_name: optionalText(200),
  position_title: requiredText(200),
  details: optionalText(2000),
  sort_order: optionalSortOrderSchema,
  is_published: publishedSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.member_id && !value.full_name?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["full_name"], message: "الاسم مطلوب للشخص غير المرتبط بعضو." });
  }
  if (value.member_id && value.full_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["full_name"], message: "اسم العضو يُسحب تلقائيًا من سجل العضوية." });
  }
});

export const partyUnitPersonUpdateSchema = z.object({
  member_id: uuidIdSchema.nullable().optional(),
  full_name: optionalText(200),
  position_title: z.string().trim().min(1).max(200).optional(),
  details: optionalText(2000),
  sort_order: optionalSortOrderSchema,
  is_published: publishedSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0)
  .superRefine((value, ctx) => {
    if (value.member_id && value.full_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["full_name"], message: "اسم العضو يُسحب تلقائيًا من سجل العضوية." });
    }
    if (value.member_id === null && !value.full_name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["full_name"], message: "أدخل الاسم عند فك ربط العضو." });
    }
  });
