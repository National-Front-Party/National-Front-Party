import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  saveUploadedOrgImage,
  safeDeleteUploadedOrgImage,
  verifyImageMagicBytes,
  MAX_IMAGE_SIZE_BYTES,
} from "./org-content-storage.js";
import { urlOrEmptySchema } from "../validation/content/common.js";
import { centralSecretariatPersonCreateSchema } from "../validation/content/central-secretariats.js";
import { governorateSecretariatCreateSchema } from "../validation/content/governorate-secretariats.js";
import { leaderCreateSchema } from "../validation/content/leadership.js";

test("verifyImageMagicBytes recognizes valid image headers and strictly rejects others", () => {
  // JPEG: FF D8 FF
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  assert.equal(verifyImageMagicBytes(jpegHeader), "image/jpeg");

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  assert.equal(verifyImageMagicBytes(pngHeader), "image/png");

  // WebP: RIFF (0-3) ... WEBP (8-11)
  const webpHeader = Buffer.from("RIFFxxxxWEBPVP8 ");
  assert.equal(verifyImageMagicBytes(webpHeader), "image/webp");

  // SVG text buffer must be rejected
  const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal(verifyImageMagicBytes(svgBuffer), null);

  // PDF buffer must be rejected
  const pdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n");
  assert.equal(verifyImageMagicBytes(pdfBuffer), null);

  // Short buffer (< 12 bytes)
  assert.equal(verifyImageMagicBytes(Buffer.from([0xff, 0xd8, 0xff])), null);

  // Plain text buffer
  assert.equal(verifyImageMagicBytes(Buffer.from("Hello world this is not an image")), null);

  // Null or non-buffer
  assert.equal(verifyImageMagicBytes(null), null);
  assert.equal(verifyImageMagicBytes("not-a-buffer"), null);
});

test("saveUploadedOrgImage rejects empty, oversized, and invalid format buffers", async () => {
  // Empty buffer
  const emptyRes = await saveUploadedOrgImage(Buffer.alloc(0));
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyRes.code, "EMPTY_FILE");

  // Null input
  const nullRes = await saveUploadedOrgImage(null);
  assert.equal(nullRes.ok, false);
  assert.equal(nullRes.code, "EMPTY_FILE");

  // Non-image buffer
  const fakeRes = await saveUploadedOrgImage(Buffer.from("fake-text-content-not-image"));
  assert.equal(fakeRes.ok, false);
  assert.equal(fakeRes.code, "INVALID_IMAGE_TYPE");

  // SVG buffer
  const svgRes = await saveUploadedOrgImage(
    Buffer.from('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'),
  );
  assert.equal(svgRes.ok, false);
  assert.equal(svgRes.code, "INVALID_IMAGE_TYPE");

  // Oversized buffer (> 5 MiB)
  const hugeBuf = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 100);
  hugeBuf[0] = 0xff;
  hugeBuf[1] = 0xd8;
  hugeBuf[2] = 0xff;
  const hugeRes = await saveUploadedOrgImage(hugeBuf);
  assert.equal(hugeRes.ok, false);
  assert.equal(hugeRes.code, "FILE_TOO_LARGE");
});

test("saveUploadedOrgImage saves JPEG, PNG, and WebP with correct UUID filenames in isolated dir", async () => {
  // Create an isolated temporary directory for testing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-upload-test-"));

  try {
    // 1. Valid PNG minimal 1x1 buffer
    const pngBuf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    ]);

    const pngRes = await saveUploadedOrgImage(pngBuf, { uploadDir: tempDir });
    assert.equal(pngRes.ok, true);
    assert.match(pngRes.url, /^\/uploads\/org\/org-[a-f0-9\-]+\.png$/);
    assert.match(pngRes.filename, /^org-[a-f0-9\-]+\.png$/);
    assert.equal(pngRes.mime_type, "image/png");
    assert.equal(pngRes.size, pngBuf.length);

    // Verify physical file was written
    const pngPhysical = path.join(tempDir, pngRes.filename);
    assert.equal(await fs.stat(pngPhysical).then(() => true).catch(() => false), true);

    // 2. Valid JPEG minimal buffer
    const jpegBuf = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    ]);

    const jpegRes = await saveUploadedOrgImage(jpegBuf, { uploadDir: tempDir });
    assert.equal(jpegRes.ok, true);
    assert.match(jpegRes.url, /^\/uploads\/org\/org-[a-f0-9\-]+\.jpg$/);
    assert.equal(jpegRes.mime_type, "image/jpeg");

    // 3. Valid WebP minimal buffer
    const webpBuf = Buffer.from("RIFF\x18\x00\x00\x00WEBPVP8 \x0c\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00");
    const webpRes = await saveUploadedOrgImage(webpBuf, { uploadDir: tempDir });
    assert.equal(webpRes.ok, true);
    assert.match(webpRes.url, /^\/uploads\/org\/org-[a-f0-9\-]+\.webp$/);
    assert.equal(webpRes.mime_type, "image/webp");

    // Clean up with safeDeleteUploadedOrgImage
    const delResult = await safeDeleteUploadedOrgImage(pngRes.url, { uploadDir: tempDir });
    assert.equal(delResult, true);
    assert.equal(await fs.stat(pngPhysical).then(() => true).catch(() => false), false);
  } finally {
    // Remove temporary directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("safeDeleteUploadedOrgImage rejects paths outside /uploads/org/ or non-matching filenames", async () => {
  // Paths outside /uploads/org/
  assert.equal(await safeDeleteUploadedOrgImage("/news1.jpg"), false);
  assert.equal(await safeDeleteUploadedOrgImage("/uploads/news/news-123.jpg"), false);
  assert.equal(await safeDeleteUploadedOrgImage("https://example.com/image.png"), false);
  assert.equal(await safeDeleteUploadedOrgImage("../../../etc/passwd"), false);
  assert.equal(await safeDeleteUploadedOrgImage("/uploads/org/../evil.png"), false);

  // Paths inside /uploads/org/ but without valid org-UUID pattern
  assert.equal(await safeDeleteUploadedOrgImage("/uploads/org/custom-script.sh"), false);
  assert.equal(await safeDeleteUploadedOrgImage("/uploads/org/photo.png"), false);
  assert.equal(await safeDeleteUploadedOrgImage("/uploads/org/org-malicious.php"), false);

  // Non-string or empty
  assert.equal(await safeDeleteUploadedOrgImage(null), false);
  assert.equal(await safeDeleteUploadedOrgImage(""), false);
});

test("saveUploadedOrgImage handles filesystem errors gracefully", async () => {
  // Pass an invalid path that cannot be written to (e.g. A file treated as a directory)
  const tempFile = path.join(os.tmpdir(), `test-file-barrier-${Date.now()}`);
  await fs.writeFile(tempFile, "barrier");

  try {
    const pngBuf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    // Attempting to create a dir under a file causes ENOTDIR
    const blockedDir = path.join(tempFile, "subfolder");
    const res = await saveUploadedOrgImage(pngBuf, { uploadDir: blockedDir });
    assert.equal(res.ok, false);
    assert.equal(res.code, "STORAGE_ERROR");
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
});

test("urlOrEmptySchema accepts valid HTTPS, HTTP, and /uploads/org/ paths, and rejects invalid inputs", () => {
  // 1. Valid HTTPS
  assert.equal(urlOrEmptySchema.safeParse("https://example.com/avatar.jpg").success, true);
  assert.equal(
    urlOrEmptySchema.parse("https://cdn.example.org/photo.png"),
    "https://cdn.example.org/photo.png",
  );

  // 2. Valid HTTP
  assert.equal(urlOrEmptySchema.safeParse("http://example.com/avatar.jpg").success, true);

  // 3. Valid /uploads/org/ root-relative paths
  assert.equal(
    urlOrEmptySchema.safeParse("/uploads/org/org-12345678-1234-1234-1234-123456789abc.webp").success,
    true,
  );
  assert.equal(
    urlOrEmptySchema.safeParse("/uploads/org/member-photo.jpg").success,
    true,
  );
  assert.equal(
    urlOrEmptySchema.parse("/uploads/org/photo.png"),
    "/uploads/org/photo.png",
  );

  // 4. Empty string transforms to null
  assert.equal(urlOrEmptySchema.parse(""), null);
  assert.equal(urlOrEmptySchema.parse("   "), null);

  // 5. Undefined and null
  assert.equal(urlOrEmptySchema.parse(undefined), undefined);

  // 6. Rejection of path traversal
  assert.equal(urlOrEmptySchema.safeParse("/uploads/org/../evil.png").success, false);
  assert.equal(urlOrEmptySchema.safeParse("/uploads/org/sub/../../evil.png").success, false);

  // 7. Rejection of unrelated root-relative paths
  assert.equal(urlOrEmptySchema.safeParse("/uploads/news/news-123.jpg").success, false);
  assert.equal(urlOrEmptySchema.safeParse("/admin/secret").success, false);
  assert.equal(urlOrEmptySchema.safeParse("/public/avatar.jpg").success, false);

  // 8. Rejection of invalid protocols
  assert.equal(urlOrEmptySchema.safeParse("ftp://example.com/pic.jpg").success, false);
  assert.equal(urlOrEmptySchema.safeParse("javascript:alert(1)").success, false);
  assert.equal(urlOrEmptySchema.safeParse("data:image/png;base64,iVBOR").success, false);

  // 9. Rejection of oversized string (> 500 chars)
  const hugeUrl = "https://example.com/" + "a".repeat(500);
  assert.equal(urlOrEmptySchema.safeParse(hugeUrl).success, false);
});

test("urlOrEmptySchema consumers successfully validate /uploads/org/ paths", () => {
  // Central Secretariat Person
  const personRes = centralSecretariatPersonCreateSchema.safeParse({
    full_name: "م. طارق عبد الحميد",
    image_url: "/uploads/org/org-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.webp",
  });
  assert.equal(personRes.success, true);
  assert.equal(
    personRes.data.image_url,
    "/uploads/org/org-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.webp",
  );

  // Governorate Secretariat
  const govRes = governorateSecretariatCreateSchema.safeParse({
    governorate_id: 1,
    full_name: "المستشار عصام عبد القادر",
    photo_url: "/uploads/org/org-8a3e7cb4-49c0-4f51-b8be-6842617f1a09.jpg",
  });
  assert.equal(govRes.success, true);

  // Party Leader
  const leaderRes = leaderCreateSchema.safeParse({
    panel_id: 1,
    full_name: "د. سامي رشدي عبد الكريم",
    photo_url: "/uploads/org/org-12345678-1234-1234-1234-123456789abc.png",
  });
  assert.equal(leaderRes.success, true);
});
