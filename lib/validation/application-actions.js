import { z } from "zod";

const rejectionReasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000);

export const applicationStatusActionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("under_review") }).strict(),
  z.object({ status: z.literal("accepted") }).strict(),
  z.object({
    status: z.literal("rejected"),
    rejection_reason: rejectionReasonSchema,
  }).strict(),
]);

export const applicationInternalNoteSchema = z
  .object({ note: z.string().trim().min(1).max(1000) })
  .strict();

export const applicationAssignmentSchema = z
  .object({ assigned_to: z.union([z.string().uuid(), z.null()]) })
  .strict();
