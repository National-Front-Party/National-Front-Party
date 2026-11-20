import { requireStaff } from "../../../../../lib/auth/guard.js";
import { jsonResponse, logAuthError } from "../../../../../lib/auth/http.js";
import { hasPermission } from "../../../../../lib/auth/permissions.js";
import { saveUploadedNewsImage } from "../../../../../lib/services/news-storage.js";

export async function POST(request) {
  const staff = await requireStaff(request);
  if (staff instanceof Response) return staff;
  if (!staff || staff.is_active !== true) {
    return jsonResponse({ error: "UNAUTHENTICATED" }, 401);
  }

  // Only super_admin, news_editor, or staff with news:write permission can upload news images
  const canUpload =
    staff.role === "super_admin" ||
    staff.role === "news_editor" ||
    hasPermission(staff.role, "news:write");

  if (!canUpload) {
    return jsonResponse({ error: "FORBIDDEN", message: "ليس لديك صلاحية لرفع صور الأخبار" }, 403);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse(
      { error: "UNSUPPORTED_MEDIA_TYPE", message: "نوع المحتوى يجب أن يكون multipart/form-data" },
      415,
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") || formData.get("image");

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return jsonResponse(
        { error: "FILE_REQUIRED", message: "يجب اختيار ملف صورة للرفع" },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveUploadedNewsImage(buffer, file.name, file.type);

    if (!result.ok) {
      return jsonResponse(
        { error: result.code, message: result.message },
        400,
      );
    }

    return jsonResponse(
      {
        ok: true,
        url: result.url,
        filename: result.filename,
      },
      201,
    );
  } catch (err) {
    logAuthError(err);
    return jsonResponse(
      { error: "SERVER_ERROR", message: "حدث خطأ غير متوقع أثناء رفع الصورة" },
      500,
    );
  }
}
