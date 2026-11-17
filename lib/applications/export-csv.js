export const MAX_APPLICATION_EXPORT_ROWS = 10_000;
export const MAX_APPLICATION_EXPORT_BYTES = 10 * 1024 * 1024;

const HEADERS = [
  "Application Number",
  "Application Type",
  "Status",
  "Full Name",
  "Governorate",
  "Assigned Staff",
  "Created At",
  "Updated At",
  "Reviewed At",
];

const FORMULA_PREFIX = /^[\s\u0000-\u001f\u007f-\u009f\ufeff\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069]*[=+\-@]/u;

function cellText(value) {
  return value == null ? "" : String(value);
}

function quoteCount(value) {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 34) count += 1;
  }
  return count;
}

function rowValues(row) {
  return [
    row.application_no,
    row.application_type,
    row.status,
    row.full_name,
    row.governorate?.name_ar,
    row.assigned_staff_user?.full_name,
    row.created_at?.toISOString(),
    row.updated_at?.toISOString(),
    row.reviewed_at?.toISOString(),
  ].map(cellText);
}

function csvRowByteLength(values) {
  let byteLength = values.length - 1 + 2; // commas and CRLF
  for (const value of values) {
    byteLength += 2 + Buffer.byteLength(value, "utf8") + quoteCount(value);
    if (FORMULA_PREFIX.test(value)) byteLength += 1; // leading apostrophe
  }
  return byteLength;
}

function writeCell(buffer, offset, value) {
  buffer[offset] = 34; // opening quote
  offset += 1;
  if (FORMULA_PREFIX.test(value)) {
    buffer[offset] = 39; // formula protection apostrophe
    offset += 1;
  }

  let start = 0;
  let quote = value.indexOf('"', start);
  while (quote !== -1) {
    const segment = value.slice(start, quote);
    offset += buffer.write(segment, offset, "utf8");
    buffer[offset] = 34;
    buffer[offset + 1] = 34;
    offset += 2;
    start = quote + 1;
    quote = value.indexOf('"', start);
  }
  offset += buffer.write(value.slice(start), offset, "utf8");
  buffer[offset] = 34; // closing quote
  return offset + 1;
}

function writeRow(buffer, offset, values) {
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) {
      buffer[offset] = 44; // comma
      offset += 1;
    }
    offset = writeCell(buffer, offset, values[index]);
  }
  buffer[offset] = 13;
  buffer[offset + 1] = 10;
  return offset + 2;
}

export function createApplicationsCsvWriter() {
  const buffer = Buffer.alloc(MAX_APPLICATION_EXPORT_BYTES);
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  bom.copy(buffer, 0);
  let byteLength = writeRow(buffer, bom.length, HEADERS);
  let rowCount = 0;
  let tooLarge = false;

  return {
    append(row) {
      if (tooLarge) return false;
      const values = rowValues(row);
      const rowBytes = csvRowByteLength(values);
      if (byteLength + rowBytes > MAX_APPLICATION_EXPORT_BYTES) {
        tooLarge = true;
        return false;
      }
      byteLength = writeRow(buffer, byteLength, values);
      rowCount += 1;
      return true;
    },
    get byteLength() {
      return byteLength;
    },
    get rowCount() {
      return rowCount;
    },
    get tooLarge() {
      return tooLarge;
    },
    toBuffer() {
      return tooLarge ? null : buffer.subarray(0, byteLength);
    },
  };
}
