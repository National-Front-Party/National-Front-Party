import { z } from "zod";
import { deleteConfirmSchema, requiredText } from "./common.js";

export const partyProgramDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200).default("برنامج الحزب"),
    body: requiredText(50_000),
    source_note: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .transform((val) => (val === "" || val === undefined ? null : val)),
  })
  .strict();

export const partyProgramDiscardSchema = deleteConfirmSchema;

export const partyProgramPublishSchema = z
  .object({
    confirm: z.literal(true).optional(),
  })
  .strict()
  .default({});
