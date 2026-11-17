import { z } from "zod";
import { normalizeDigits } from "../national-id.js";

const MAX_PAGE = 10_000;
const MAX_PAGE_SIZE = 100;
const MAX_BIGINT = 9_223_372_036_854_775_807n;

function isValidCalendarDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function isValidDateFilter(value) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return isValidCalendarDate(
      Number(dateOnly[1]),
      Number(dateOnly[2]),
      Number(dateOnly[3]),
    );
  }

  const dateTime =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!dateTime) return false;

  const [, year, month, day, hour, minute, second, , , offsetHour, offsetMinute] = dateTime;
  if (
    !isValidCalendarDate(Number(year), Number(month), Number(day)) ||
    Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
  ) return false;
  if (offsetHour && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) {
    return false;
  }
  return !Number.isNaN(new Date(value).valueOf());
}

const dateFilter = z.string().refine(isValidDateFilter);
const fromDateSchema = dateFilter.transform((value) => new Date(
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value,
));
const toDateSchema = dateFilter.transform((value) => new Date(
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value,
));

const requestNumberSchema = z
  .string()
  .regex(/^\d{1,19}$/)
  .transform((value) => BigInt(value))
  .refine((value) => value > 0n && value <= MAX_BIGINT);

export const serviceRequestIdSchema = z.string().uuid();

export const serviceRequestsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
    name: z.string().trim().min(1).max(120).optional(),
    request_no: requestNumberSchema.optional(),
    phone: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{1,15}$/))
      .optional(),
    status: z.string().trim().min(1).max(50).optional(),
    ministry_id: z.coerce.number().int().min(1).max(32_767).optional(),
    sector_id: z.coerce.number().int().min(1).max(32_767).optional(),
    assigned_to: z.string().uuid().optional(),
    created_from: fromDateSchema.optional(),
    created_to: toDateSchema.optional(),
  })
  .strict()
  .refine(
    ({ created_from, created_to }) =>
      !created_from || !created_to || created_from <= created_to,
    { message: "created_from must be before or equal to created_to." },
  );
