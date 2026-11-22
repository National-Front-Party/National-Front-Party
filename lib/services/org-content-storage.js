import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB (5,242,880 bytes)

export const ALLOWED_MIME_TYPES = Object.freeze(
  new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]),
);

export const EXTENSION_MAP = Object.freeze({
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

export const CANONICAL_MIME_MAP = Object.freeze({
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
});

/**
 * Validates file magic bytes to verify genuine image content.
 * Specifically accepts raster formats JPEG, PNG, and WebP.
 * Strictly rejects SVG, HTML, scripts, PDFs, and all other non-image formats.
 *
 * Limitation note: Magic-byte inspection verifies standard file header signatures.
 * It does not perform full pixel decompression or payload decoding, but prevents
 * extension spoofing and executable/SVG script upload.
 *
 * @param {Buffer} buffer
 * @returns {string | null} Detected canonical MIME type or null if unrecognized
 */
export function verifyImageMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
}

/**
 * Saves an uploaded organizational image file securely to the public/uploads/org directory.
 *
 * Requirements enforced:
 * - Empty files rejected.
 * - Files exceeding 5 MiB rejected.
 * - Format verified solely by magic bytes (JPEG, PNG, WebP only). SVG rejected.
 * - Original client filename completely discarded.
 * - Random UUIDv4 filename with org- prefix generated.
 * - Stored exclusively under public/uploads/org/.
 *
 * @param {Buffer} buffer
 * @param {object} [options]
 * @param {string} [options.uploadDir] - Custom directory for testing isolation
 * @returns {Promise<{ ok: boolean, code?: string, message?: string, url?: string, filename?: string, mime_type?: string, size?: number }>}
 */
export async function saveUploadedOrgImage(buffer, options = {}) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "الملف فارغ أو غير صالح",
    };
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت)",
    };
  }

  const detectedMime = verifyImageMagicBytes(buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    return {
      ok: false,
      code: "INVALID_IMAGE_TYPE",
      message: "نوع الصورة غير مدعوم. الصيغ المدعومة هي JPG و PNG و WebP فقط",
    };
  }

  const ext = EXTENSION_MAP[detectedMime] || ".jpg";
  const uniqueId = crypto.randomUUID();
  const filename = `org-${uniqueId}${ext}`;
  const canonicalMime = CANONICAL_MIME_MAP[detectedMime] || detectedMime;

  const targetDir =
    options.uploadDir || path.join(process.cwd(), "public", "uploads", "org");
  const resolvedTargetDir = path.resolve(/* turbopackIgnore: true */ targetDir);
  const filePath = path.join(/* turbopackIgnore: true */ resolvedTargetDir, filename);
  if (path.dirname(filePath) !== resolvedTargetDir) {
    return {
      ok: false,
      code: "STORAGE_ERROR",
      message: "حدث خطأ أثناء حفظ ملف الصورة على الخادم",
    };
  }

  try {
    await fs.mkdir(resolvedTargetDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    return {
      ok: true,
      url: `/uploads/org/${filename}`,
      filename,
      mime_type: canonicalMime,
      size: buffer.length,
    };
  } catch {
    return {
      ok: false,
      code: "STORAGE_ERROR",
      message: "حدث خطأ أثناء حفظ ملف الصورة على الخادم",
    };
  }
}

/**
 * Safely deletes an uploaded organizational image file from disk.
 * Strictly limited to files matching /uploads/org/org-<uuid>.<ext> pattern.
 * Refuses to delete anything outside public/uploads/org/ to prevent path traversal.
 *
 * Note: This utility is provided for maintenance and test cleanup. It is NOT
 * automatically connected to content deletion or update workflows.
 *
 * @param {string} imageUrl
 * @param {object} [options]
 * @param {string} [options.uploadDir] - Custom directory for testing isolation
 * @returns {Promise<boolean>}
 */
export async function safeDeleteUploadedOrgImage(imageUrl, options = {}) {
  if (!imageUrl || typeof imageUrl !== "string") return false;

  const normalized = path.normalize(imageUrl).replace(/\\/g, "/");
  if (!normalized.startsWith("/uploads/org/")) return false;

  const filename = path.basename(normalized);
  if (!/^org-[a-f0-9\-]+(\.jpg|\.png|\.webp)$/i.test(filename)) {
    return false;
  }

  const targetDir =
    options.uploadDir || path.join(process.cwd(), "public", "uploads", "org");
  const resolvedTargetDir = path.resolve(/* turbopackIgnore: true */ targetDir);
  const filePath = path.join(/* turbopackIgnore: true */ resolvedTargetDir, filename);
  if (path.dirname(filePath) !== resolvedTargetDir) return false;

  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
