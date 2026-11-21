import { requireStaff } from "../../../../../lib/auth/guard.js";
import { jsonResponse, logAuthError } from "../../../../../lib/auth/http.js";
import {
  saveUploadedOrgImage,
  MAX_IMAGE_SIZE_BYTES,
} from "../../../../../lib/services/org-content-storage.js";

// 5 MiB file limit + 64 KiB multipart boundary & header overhead
const MAX_REQUEST_SIZE_BYTES = MAX_IMAGE_SIZE_BYTES + 64 * 1024;

export async function POST(request) {
  // 1. Authenticate and enforce content:manage permission
  const staff = await requireStaff(request, { permission: "content:manage" });
  if (staff instanceof Response) return staff;
  if (!staff || staff.is_active !== true) {
    return jsonResponse({ error: "UNAUTHENTICATED" }, 401);
  }

  // 2. Validate Content-Type
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse(
      {
        error: "UNSUPPORTED_MEDIA_TYPE",
        message: "نوع المحتوى يجب أن يكون multipart/form-data",
      },
      415,
    );
  }

  // 3. Pre-read request-size protection
  // If Content-Length header is declared and exceeds max allowed threshold, reject early
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE_BYTES) {
      return jsonResponse(
        {
          error: "FILE_TOO_LARGE",
          message: "حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت)",
        },
        400,
      );
    }
  }

  // 4. Parse multipart form data
  try {
    const formData = await request.formData();
    const file = formData.get("file") || formData.get("image");

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return jsonResponse(
        {
          error: "FILE_REQUIRED",
          message: "يجب اختيار ملف صورة للرفع",
        },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveUploadedOrgImage(buffer);

    if (!result.ok) {
      const status = result.code === "STORAGE_ERROR" ? 500 : 400;
      return jsonResponse(
        {
          error: result.code,
          message: result.message,
        },
        status,
      );
    }

    return jsonResponse(
      {
        ok: true,
        url: result.url,
        filename: result.filename,
        mime_type: result.mime_type,
        size: result.size,
      },
      201,
    );
  } catch (err) {
    logAuthError(err);
    return jsonResponse(
      {
        error: "SERVER_ERROR",
        message: "حدث خطأ غير متوقع أثناء معالجة الصورة",
      },
      500,
    );
  }
}
