import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  saveUploadedNewsImage,
  safeDeleteUploadedNewsImage,
  verifyImageMagicBytes,
} from "./news-storage.js";
import { articleCreateSchema } from "../validation/news.js";

test("verifyImageMagicBytes recognizes valid image headers and rejects non-images", () => {
  // JPEG: FF D8 FF
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.equal(verifyImageMagicBytes(jpegHeader), "image/jpeg");

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  assert.equal(verifyImageMagicBytes(pngHeader), "image/png");

  // WebP: RIFF ... WEBP
  const webpHeader = Buffer.from("RIFFxxxxWEBPVP8 ");
  assert.equal(verifyImageMagicBytes(webpHeader), "image/webp");

  // Non-image / text
  const textBuffer = Buffer.from("Hello world this is not an image");
  assert.equal(verifyImageMagicBytes(textBuffer), null);
});

test("saveUploadedNewsImage rejects invalid files and oversized buffers", async () => {
  // Empty buffer
  const emptyRes = await saveUploadedNewsImage(Buffer.alloc(0));
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyRes.code, "EMPTY_FILE");

  // Non-image buffer
  const fakeRes = await saveUploadedNewsImage(Buffer.from("not-an-image"));
  assert.equal(fakeRes.ok, false);
  assert.equal(fakeRes.code, "INVALID_IMAGE_TYPE");

  // Oversized buffer (> 5MB)
  const hugeBuf = Buffer.alloc(5 * 1024 * 1024 + 10);
  hugeBuf[0] = 0xff;
  hugeBuf[1] = 0xd8;
  hugeBuf[2] = 0xff;
  const hugeRes = await saveUploadedNewsImage(hugeBuf);
  assert.equal(hugeRes.ok, false);
  assert.equal(hugeRes.code, "FILE_TOO_LARGE");
});

test("saveUploadedNewsImage saves image and safeDeleteUploadedNewsImage removes it", async () => {
  // Valid PNG minimal 1x1 buffer
  const pngBuf = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  ]);

  const saveRes = await saveUploadedNewsImage(pngBuf, "test.png", "image/png");
  assert.equal(saveRes.ok, true);
  assert.match(saveRes.url, /^\/uploads\/news\/news-[a-f0-9\-]+\.png$/);

  const physicalPath = path.join(process.cwd(), "public", saveRes.url);
  const exists = await fs.stat(physicalPath).then(() => true).catch(() => false);
  assert.equal(exists, true);

  // Clean up
  const deleteRes = await safeDeleteUploadedNewsImage(saveRes.url);
  assert.equal(deleteRes, true);

  const stillExists = await fs.stat(physicalPath).then(() => true).catch(() => false);
  assert.equal(stillExists, false);
});

test("safeDeleteUploadedNewsImage protects non-upload files from deletion", async () => {
  // Should refuse to delete paths outside /uploads/news/
  assert.equal(await safeDeleteUploadedNewsImage("/news1.jpg"), false);
  assert.equal(await safeDeleteUploadedNewsImage("https://example.com/image.png"), false);
  assert.equal(await safeDeleteUploadedNewsImage("../../../etc/passwd"), false);
});

test("articleCreateSchema accepts manually entered source_name without source_id", () => {
  const validPayload = {
    title: "مقال تجريبي جديد لحزب الجبهة",
    body: "هذا النص هو محتوى تجريبي طويل للمقال الصحفي يتجاوز خمسين حرفاً للتأكد من نجاح التحقق في المخطط.",
    source_name: "جريدة الأهرام الرسمية",
    published_on: "2026-11-19",
  };

  const parsed = articleCreateSchema.parse(validPayload);
  assert.equal(parsed.source_name, "جريدة الأهرام الرسمية");
  assert.equal(parsed.source_id, undefined);

  // Fails if neither source_name nor source_id is provided
  assert.throws(() => {
    articleCreateSchema.parse({
      ...validPayload,
      source_name: undefined,
      source_id: undefined,
    });
  });
});
