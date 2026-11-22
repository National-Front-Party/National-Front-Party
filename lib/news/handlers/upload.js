import { requireStaff } from "../../auth/guard.js";
import { jsonResponse, logAuthError } from "../../auth/http.js";
import { hasPermission } from "../../auth/permissions.js";
import { saveUploadedNewsImage } from "../../services/news-storage.js";

export function createAdminNewsUploadHandler({
  guard = requireStaff,
  saveImageFn = saveUploadedNewsImage,
} = {}) {
  return async function POST(request) {
    const staff = await guard(request);
    if (staff instanceof Response) return staff;
    if (!staff || staff.is_active !== true) {
      return jsonResponse({ error: "UNAUTHENTICATED" }, 401);
    }

    if (!hasPermission(staff.role, "news:write")) {
      return jsonResponse(
        { error: "FORBIDDEN", message: "ليس لديك صلاحية لرفع صور الأخبار" },
        403,
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse(
        { error: "UNSUPPORTED_MEDIA_TYPE", message: "يجب أن يكون نوع المحتوى multipart/form-data" },
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
      const result = await saveImageFn(buffer, file.name, file.type);

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
  };
}
