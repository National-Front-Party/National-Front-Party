import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Validates file magic bytes to verify genuine image content.
 * @param {Buffer} buffer
 * @returns {string | null} Detected MIME type or null if unrecognized
 */
export function verifyImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;

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

  // WebP: RIFF ... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
}

/**
 * Saves an uploaded image file securely to the public/uploads/news directory.
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} claimedMimeType
 * @returns {Promise<{ ok: boolean, code?: string, message?: string, url?: string, filename?: string }>}
 */
export async function saveUploadedNewsImage(buffer) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    return { ok: false, code: "EMPTY_FILE", message: "الملف فارغ أو غير صالح" };
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت)",
    };
  }

  // Verify signature
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
  const filename = `news-${uniqueId}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "news");

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    return {
      ok: true,
      url: `/uploads/news/${filename}`,
      filename,
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
 * Safely deletes an uploaded image file from the disk to avoid orphans.
 * Only files located inside /uploads/news/ can be deleted.
 * @param {string} imageUrl
 * @returns {Promise<boolean>}
 */
export async function safeDeleteUploadedNewsImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return false;
  const normalized = path.normalize(imageUrl).replace(/\\/g, "/");
  if (!normalized.startsWith("/uploads/news/")) return false;

  const filename = path.basename(normalized);
  // Ensure filename matches our pattern to avoid directory traversal
  if (!/^news-[a-f0-9\-]+(\.jpg|\.png|\.webp)$/i.test(filename)) {
    return false;
  }

  const filePath = path.join(process.cwd(), "public", "uploads", "news", filename);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
