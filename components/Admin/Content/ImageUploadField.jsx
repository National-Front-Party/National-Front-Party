"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB
export const ALLOWED_EXTENSIONS = Object.freeze(["jpg", "jpeg", "png", "webp"]);
export const ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
export const MIME_EXTENSION_MAP = Object.freeze({
  "image/jpeg": ["jpg", "jpeg"],
  "image/jpg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
});

/**
 * Validates file size, extension, SVG exclusion, and MIME consistency.
 * If both extension and MIME type are present, verifies they match.
 * If MIME type is empty, permits preliminary extension validation
 * (backend magic-byte verification remains authoritative).
 *
 * @param {File} file
 * @returns {string | null} Error message or null if valid
 */
export function validateImageFile(file) {
  if (!file) return "يرجى اختيار ملف صورة";

  if (file.size <= 0) {
    return "ملف الصورة فارغ";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت)";
  }

  const filename = typeof file.name === "string" ? file.name : "";
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mime = typeof file.type === "string" ? file.type.toLowerCase().trim() : "";

  // Explicit SVG rejection
  if (ext === "svg" || mime.includes("svg")) {
    return "صيغة SVG غير مسموح بها. يرجى استخدام JPG أو PNG أو WebP";
  }

  // Allowed extension check
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return "امتداد الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط";
  }

  // MIME type check and cross-matching
  if (mime) {
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      return "نوع الصورة غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط";
    }

    const validExtsForMime = MIME_EXTENSION_MAP[mime];
    if (!validExtsForMime || !validExtsForMime.includes(ext)) {
      return "امتداد الملف لا يتطابق مع نوع الصورة المحدد";
    }
  }

  return null;
}

export default function ImageUploadField({
  value = "",
  onChange,
  label = "الصورة",
  hint = "الصيغ المدعومة: JPG، PNG، WebP (الحد الأقصى: 5 ميجابايت)",
  error = "",
  disabled = false,
  required = false,
  className = "",
  id = "image-upload",
  onUploadStart,
  onUploadEnd,
}) {
  const fileInputRef = useRef(null);
  const activeBlobUrlRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localBlobUrl, setLocalBlobUrl] = useState(null);

  // Derived display URL: prefer active local blob preview, otherwise fallback to stored value
  const displayUrl = localBlobUrl || value || "";

  // Helper to safely revoke active object URL exactly once
  const revokeActiveBlob = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  };

  // Clean up any active object URL on unmount only
  useEffect(() => {
    return () => {
      revokeActiveBlob();
    };
  }, []);

  const uploadFile = async (file) => {
    if (disabled || uploading) return;

    setUploading(true);
    setLocalError("");
    onUploadStart?.();

    // Revoke previous blob if any
    revokeActiveBlob();

    // Set immediate client-side preview via object URL
    const objectUrl = URL.createObjectURL(file);
    activeBlobUrlRef.current = objectUrl;
    setLocalBlobUrl(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/content/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
        // Notice: Content-Type header is omitted so the browser sets the boundary automatically
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok || !data?.url) {
        const errorMsg =
          data?.message ||
          (data?.error === "FILE_TOO_LARGE"
            ? "حجم الصورة يتجاوز الحد الأقصى (5 ميجابايت)"
            : data?.error === "UNSUPPORTED_MEDIA_TYPE"
            ? "نوع الصورة غير مدعوم"
            : data?.error === "FORBIDDEN"
            ? "غير مصرح لك برفع الصور"
            : "فشل رفع الصورة على الخادم");

        setLocalError(errorMsg);
        // Revert local blob on failure
        revokeActiveBlob();
        setLocalBlobUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Success: clean up temporary blob URL and store permanent server URL
      revokeActiveBlob();
      setLocalBlobUrl(null);
      setLocalError("");
      onChange?.(data.url);
    } catch {
      setLocalError("تعذر الاتصال بالخادم أثناء رفع الصورة");
      revokeActiveBlob();
      setLocalBlobUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  const handleFileChange = (e) => {
    if (disabled || uploading) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setLocalError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    uploadFile(file);
  };

  const handleRemoveImage = () => {
    if (disabled || uploading) return;

    revokeActiveBlob();
    setLocalBlobUrl(null);
    setLocalError("");
    onChange?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || uploading) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateImageFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
      uploadFile(file);
    }
  };

  const displayError = error || localError;

  return (
    <div className={`w-full ${className}`} dir="rtl">
      {/* Label & Hint */}
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-bold text-ink">
          <span>
            {label}
            {required && <span aria-hidden="true" className="mr-1 text-gold">*</span>}
          </span>
        </label>
        {hint && (
          <span className="text-[11px] font-normal text-muted">
            {hint}
          </span>
        )}
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        id={id}
        name={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-invalid={Boolean(displayError)}
      />

      {/* Upload Zone / Preview Area */}
      {displayUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-line bg-page/30 p-3 transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Thumbnail */}
            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={label || "معاينة الصورة"}
                className="size-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                  <Spinner size="sm" color="white" />
                </div>
              )}
            </div>

            {/* Info & Actions */}
            <div className="flex-1 text-center sm:text-right space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {uploading ? "جارٍ الرفع..." : "تم تجهيز الصورة"}
                </span>
                {value && (
                  <span className="text-[10px] text-muted font-mono dir-ltr max-w-[200px] truncate" title={value}>
                    {value}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted">
                يمكنك استبدال الصورة باختيار ملف جديد أو إزالتها من النموذج.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-2xs hover:border-gold hover:bg-gold-tint/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  استبدال الصورة
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={handleRemoveImage}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 hover:border-rose-300 active:scale-95 transition-all disabled:opacity-50"
                >
                  إزالة من النموذج
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Drag & Drop Upload Zone */
        <div
          role="button"
          tabIndex={disabled || uploading ? -1 : 0}
          onClick={() => {
            if (!disabled && !uploading) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 cursor-pointer select-none ${
            disabled
              ? "opacity-60 cursor-not-allowed border-line bg-page/40"
              : isDragOver
              ? "border-gold bg-gold-tint/30 scale-[1.01] shadow-card-hover"
              : displayError
              ? "border-red-300 bg-red-50/20 hover:border-red-400"
              : "border-line bg-page/20 hover:border-gold hover:bg-gold-tint/10"
          }`}
          aria-label={`${label} - انقر أو اسحب الملف هنا للرفع`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Spinner size="md" color="gold" />
              <p className="text-xs font-bold text-gold-dark animate-pulse">
                جارٍ رفع ومعالجة الصورة...
              </p>
            </div>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-2xl border border-line bg-white text-muted group-hover:border-gold group-hover:text-gold-dark group-hover:scale-110 shadow-2xs transition-all duration-300 mb-2">
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>

              <p className="text-xs font-bold text-ink group-hover:text-gold-dark transition-colors">
                اسحب الصورة وأفلتها هنا، أو <span className="text-gold-dark underline underline-offset-4">تصفح جهازك</span>
              </p>
              <p className="mt-1 text-[11px] text-muted">
                JPG، PNG، WebP بحد أقصى 5 ميجابايت (لا يقبل SVG)
              </p>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <p
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 animate-elem-fade-up font-medium"
        >
          <svg
            className="size-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
}
