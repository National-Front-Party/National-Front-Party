"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import CustomSelect from "@/components/Home/ui/CustomSelect";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function ArticleEditorModal({
  isOpen,
  article,
  sources = [],
  onClose,
  onSaved,
}) {
  const { showSuccess, showError } = useToast();
  const isEdit = Boolean(article?.id);
  const fileInputRef = useRef(null);

  // Form states
  const [title, setTitle] = useState(article?.title || "");
  const [body, setBody] = useState(article?.body || "");
  const [sourceId, setSourceId] = useState(() => {
    if (article?.source_id) return String(article.source_id);
    if (article?.source?.id) return String(article.source.id);
    if (article?.source_name && Array.isArray(sources)) {
      const match = sources.find(
        (s) => s && s.is_active && s.name_ar === article.source_name,
      );
      if (match) return String(match.id);
    }
    return "";
  });
  const [sourceName, setSourceName] = useState(
    article?.source_name || article?.source?.name_ar || "",
  );
  const [internalSources, setInternalSources] = useState([]);
  const [sourceUrl, setSourceUrl] = useState(article?.source_url || "");
  const [imageAlt, setImageAlt] = useState(article?.image_alt || "");
  const [publishedOn, setPublishedOn] = useState(
    article?.published_on
      ? new Date(article.published_on).toISOString().substring(0, 10)
      : new Date().toISOString().substring(0, 10),
  );
  const [datePrecision, setDatePrecision] = useState(
    article?.date_precision || "day",
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(article?.is_featured));
  const [sortOrder, setSortOrder] = useState(article?.sort_order ?? 0);
  const [slug, setSlug] = useState(article?.slug || "");

  // Image Upload & Preview states
  const [existingImageUrl, setExistingImageUrl] = useState(article?.image_url || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(article?.image_url || "");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !submitting && !uploadingImage) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, uploadingImage, onClose]);

  // Date precision options
  const precisionOptions = useMemo(
    () => [
      { value: "day", label: "يوم محدد (تاريخ دقيق)" },
      { value: "month", label: "شهر فقط (تاريخ عام)" },
    ],
    [],
  );

  // Fetch active sources from backend if not supplied via props
  useEffect(() => {
    if (!isOpen) return;
    if (sources && sources.length > 0) return;
    let mounted = true;
    adminFetch("/api/admin/news/sources?is_active=true&page_size=100")
      .then((data) => {
        if (mounted && Array.isArray(data?.sources)) {
          const activeOnly = data.sources.filter((s) => s && s.is_active === true);
          setInternalSources(activeOnly);
          setSourceId((prevId) => {
            if (prevId) return prevId;
            const initialName = article?.source_name || article?.source?.name_ar;
            if (initialName) {
              const m = activeOnly.find((s) => s.name_ar === initialName);
              return m ? String(m.id) : "";
            }
            return "";
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isOpen, sources, article?.source_name, article?.source?.name_ar]);

  // Strictly filter only active sources (is_active === true)
  const effectiveSources = useMemo(() => {
    const list = sources && sources.length > 0 ? sources : internalSources;
    return (list || []).filter((s) => s && s.is_active === true);
  }, [sources, internalSources]);

  // Options for CustomSelect
  const sourceOptions = useMemo(() => {
    return effectiveSources.map((s) => ({
      value: String(s.id),
      label: s.name_ar,
    }));
  }, [effectiveSources]);

  const handleSourceChange = (val) => {
    setSourceId(val);
    const selected = effectiveSources.find((s) => String(s.id) === String(val));
    if (selected) {
      setSourceName(selected.name_ar);
    } else {
      setSourceName("");
    }
  };

  if (!isOpen) return null;

  // Handle local file selection
  const handleFileChange = (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedMime = file.type && ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
    const isAllowedExt = ["jpg", "jpeg", "png", "webp"].includes(ext);

    if (!isAllowedMime && !isAllowedExt) {
      showError("نوع الصورة غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showError("حجم الصورة كبير جداً؛ الحد الأقصى المسموح به هو 5 ميجابايت");
      return;
    }

    // Revoke previous blob if any
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  // Remove current image
  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setExistingImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
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
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const selectedOption = sourceOptions.find((o) => o.value === String(sourceId));
    const finalSourceName = (sourceName.trim() || selectedOption?.label || "").trim();

    if (!trimmedTitle) {
      showError("عنوان المقال الصحفي مطلوب");
      return;
    }
    if (!trimmedBody) {
      showError("نص المقال الصحفي مطلوب");
      return;
    }
    if (!sourceId && !finalSourceName) {
      showError("يرجى اختيار مصدر الخبر المعتمد");
      return;
    }
    if (!publishedOn) {
      showError("يرجى تحديد تاريخ نشر المقال");
      return;
    }

    // Clean and validate external source URL if provided
    let cleanSourceUrl = sourceUrl.trim();
    if (cleanSourceUrl) {
      if (!/^https?:\/\//i.test(cleanSourceUrl)) {
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(cleanSourceUrl)) {
          cleanSourceUrl = `https://${cleanSourceUrl}`;
        } else {
          showError("يرجى إدخال رابط مصدر خارجي صحيح يبدأ بـ https:// أو تركه فارغاً");
          return;
        }
      }
    }

    // Clean slug
    let cleanSlug = slug.trim().toLowerCase();
    if (cleanSlug) {
      cleanSlug = cleanSlug.replace(/\s+/g, "-");
    }

    setSubmitting(true);
    let finalImageUrl = existingImageUrl;

    try {
      // 1. Upload new image file if user selected one
      if (selectedFile) {
        setUploadingImage(true);
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);

        const uploadRes = await fetch("/api/admin/news/upload", {
          method: "POST",
          credentials: "include",
          body: uploadFormData,
        });

        let uploadResult = {};
        try {
          uploadResult = await uploadRes.json();
        } catch {
          uploadResult = {};
        }

        setUploadingImage(false);

        if (!uploadRes.ok) {
          if (uploadRes.status === 401) {
            throw new Error("انتهت الجلسة؛ يرجى إعادة تسجيل الدخول");
          }
          if (uploadRes.status === 403) {
            throw new Error("ليس لديك صلاحية لرفع صور الأخبار (متاح لمدير النظام ومحرر الأخبار)");
          }
          if (uploadRes.status === 413) {
            throw new Error("حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)");
          }
          throw new Error(uploadResult.message || uploadResult.error || "فشل رفع ملف صورة الغلاف");
        }

        finalImageUrl = uploadResult.url;
      } else if (!previewUrl) {
        // User explicitly removed the image
        finalImageUrl = "";
      }

      // 2. Prepare article payload
      const payload = {
        title: trimmedTitle,
        body: trimmedBody,
        source_name: finalSourceName,
        ...(sourceId ? { source_id: Number(sourceId) } : {}),
        published_on: publishedOn,
        date_precision: datePrecision || "day",
        is_featured: Boolean(isFeatured),
        sort_order: Number(sortOrder) || 0,
        source_url: cleanSourceUrl || "",
        image_url: finalImageUrl || "",
        image_alt: imageAlt.trim() || "",
        ...(cleanSlug ? { slug: cleanSlug } : {}),
      };

      if (isEdit) {
        await adminFetch(`/api/admin/news/articles/${article.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showSuccess(`تم تحديث المقال «${trimmedTitle}» بنجاح`);
      } else {
        await adminFetch("/api/admin/news/articles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showSuccess(`تم إنشاء المسودة «${trimmedTitle}» بنجاح`);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      if (err.issues && typeof err.issues === "object") {
        const firstKey = Object.keys(err.issues)[0];
        const firstMsg = err.issues[firstKey]?.[0];
        if (firstMsg) {
          showError(`خطأ في البيانات (${firstKey}): ${firstMsg}`);
          return;
        }
      }
      if (err.message && err.message.includes("DUPLICATE_SLUG")) {
        showError("هذا المعرف اللطيف (Slug) مستخدم لمقال آخر بالفعل؛ يرجى اختيار slug مختلف.");
      } else if (err.message && err.message.includes("CANNOT_EDIT_IN_CURRENT_STATUS")) {
        showError("لا يمكن تعديل هذا المقال في حالته الحالية؛ التعديل متاح فقط للمسودات أو عند طلب تعديلات.");
      } else {
        showError(err.message || "تعذر حفظ المقال");
      }
    } finally {
      setUploadingImage(false);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-[26px] border border-line bg-white shadow-card-hover animate-elem-fade-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-page/40 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-muted">إدارة المحتوى الصحفي والإعلامي</span>
              <h2 className="text-lg font-black text-ink tracking-tight mt-0.5">
                {isEdit ? "تعديل بيانات المقال الصحفي" : "إنشاء مقال إخباري جديد"}
              </h2>
            </div>
          </div>

          {/* Golden Rotating Close Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50"
            title="إغلاق"
          >
            <svg
              className="size-5 transition-transform duration-300 group-hover:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="article-title" className="block text-xs font-bold text-ink">
                عنوان المقال الصحفي <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-muted font-mono">{title.length} / 300</span>
            </div>
            <input
              id="article-title"
              type="text"
              required
              maxLength={300}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: حزب الجبهة الوطنية يطلق مبادرة تأهيل الكوادر الشبابية في المحافظات..."
              className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs sm:text-sm font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
            />
          </div>

          {/* Grid: Source (CustomSelect from DB) & Publication Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source - CustomSelect Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="article-source-id" className="block text-xs font-bold text-ink">
                مصدر الخبر المعتمد <span className="text-rose-600">*</span>
              </label>
              <CustomSelect
                id="article-source-id"
                options={sourceOptions}
                value={sourceId}
                onChange={handleSourceChange}
                placeholder="اختر مصدر الخبر المعتمد..."
              />
              {sourceOptions.length === 0 && (
                <p className="text-[11px] text-amber-700">
                  لا توجد مصادر معتمدة نشطة حالياً. يرجى تفعيل أو إضافة مصادر من صفحة مصادر الأخبار.
                </p>
              )}
            </div>

            {/* Publication Date */}
            <div className="space-y-1.5">
              <label htmlFor="article-pub-date" className="block text-xs font-bold text-ink">
                تاريخ النشر <span className="text-rose-600">*</span>
              </label>
              <input
                id="article-pub-date"
                type="date"
                required
                value={publishedOn}
                onChange={(e) => setPublishedOn(e.target.value)}
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs sm:text-sm font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              />
            </div>
          </div>

          {/* Grid: External Source URL & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* External URL */}
            <div className="space-y-1.5">
              <label htmlFor="article-source-url" className="block text-xs font-bold text-ink">
                رابط المصدر الخارجي <span className="text-muted font-normal">(اختياري)</span>
              </label>
              <input
                id="article-source-url"
                type="url"
                maxLength={500}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs sm:text-sm font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
                dir="ltr"
              />
            </div>

            {/* Custom Slug */}
            <div className="space-y-1.5">
              <label htmlFor="article-slug" className="block text-xs font-bold text-ink">
                المعرف اللطيف (Slug) <span className="text-muted font-normal">(اختياري / يُولّد آلياً)</span>
              </label>
              <input
                id="article-slug"
                type="text"
                maxLength={150}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="party-initiative-youth..."
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs sm:text-sm font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
                dir="ltr"
              />
            </div>
          </div>

          {/* Cover Image Upload Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-ink">
              صورة غلاف المقال <span className="text-muted font-normal">(اختياري)</span>
            </label>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {previewUrl ? (
              /* Image Preview Card */
              <div className="relative overflow-hidden rounded-2xl border border-line bg-page/40 p-3 sm:p-4 transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Thumbnail */}
                  <div className="relative h-32 w-full sm:w-44 shrink-0 overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={imageAlt || "معاينة صورة الغلاف"}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Info and Actions */}
                  <div className="flex flex-1 flex-col justify-between w-full space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          {selectedFile ? "✓ صورة جديدة محددة" : "✓ صورة الغلاف الحالية"}
                        </span>
                        {selectedFile && (
                          <span className="text-[11px] text-muted font-mono" dir="ltr">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate max-w-sm" dir="ltr">
                        {selectedFile ? selectedFile.name : existingImageUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      {/* Replace Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs transition-all duration-200 hover:border-gold hover:bg-gold-tint/20 hover:text-gold-dark active:scale-95"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        استبدال الصورة
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-bold text-rose-700 transition-all duration-200 hover:bg-rose-100 hover:border-rose-300 active:scale-95"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        حذف الصورة
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone Upload Area */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragOver
                    ? "border-gold bg-gold-tint/30 scale-[1.01] shadow-card-hover"
                    : "border-border bg-page/20 hover:border-gold hover:bg-gold-tint/10"
                }`}
              >
                <div className="flex size-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h4 className="mt-3.5 text-xs sm:text-sm font-bold text-ink">
                  انقر لاختيار صورة الغلاف أو اسحبها وأفلتها هنا
                </h4>
                <p className="mt-1 text-[11px] text-muted">
                  الصيغ المدعومة: JPG، PNG، WebP — الحجم الأقصى المسموح به: 5 ميجابايت
                </p>
              </div>
            )}

            {/* Image Alt Input */}
            <div className="space-y-1 pt-1">
              <label htmlFor="article-img-alt" className="block text-[11px] font-bold text-muted">
                النص البديل للصورة (SEO / إمكانية الوصول)
              </label>
              <input
                id="article-img-alt"
                type="text"
                maxLength={200}
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="وصف مختصر لمحتوى صورة الغلاف..."
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="article-body" className="block text-xs font-bold text-ink">
                نص المقال والتقرير الصحفي <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-muted font-mono">{body.length} حرف</span>
            </div>
            <textarea
              id="article-body"
              required
              rows={8}
              maxLength={50000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب تفاصيل ونص المقال الإخباري هنا مع استخدام الأسطر الفارغة للفصل بين الفقرات..."
              className="w-full rounded-2xl border border-border bg-white p-4 text-xs sm:text-sm font-medium text-ink leading-relaxed transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60 resize-y min-h-[160px]"
            />
            <p className="text-[11px] text-muted">
              يتم تقسيم النص تلقائياً إلى فقرات منسقة عند العرض بحسب الأسطر الفارغة.
            </p>
          </div>

          {/* Settings Grid: Precision, Sort Order, Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-1 border-t border-line">
            {/* Date Precision */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">دقة التاريخ</label>
              <CustomSelect
                id="article-precision-select"
                placeholder="دقة التاريخ"
                options={precisionOptions}
                value={datePrecision}
                onChange={(val) => setDatePrecision(val)}
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label htmlFor="article-sort-order" className="block text-xs font-bold text-ink">
                ترتيب العرض
              </label>
              <input
                id="article-sort-order"
                type="number"
                min={0}
                max={32767}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs sm:text-sm font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              />
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center gap-3 pt-5">
              <label
                htmlFor="article-is-featured"
                className="relative flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-ink"
              >
                <input
                  id="article-is-featured"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="size-5 rounded-lg border-border text-gold accent-gold focus:ring-0 cursor-pointer"
                />
                <span>تمييز كمقال رئيسي (Featured) ★</span>
              </label>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              disabled={submitting || uploadingImage}
              onClick={onClose}
              className="h-12 px-6 rounded-2xl border border-line bg-white text-xs sm:text-sm font-bold text-muted transition-all duration-200 hover:bg-page hover:text-ink active:scale-95 disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="h-12 px-7 rounded-2xl bg-gold text-white text-xs sm:text-sm font-bold shadow-md transition-all duration-200 hover:bg-gold-dark hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {(submitting || uploadingImage) && <Spinner size="sm" />}
              <span>
                {uploadingImage
                  ? "جارٍ رفع الصورة..."
                  : submitting
                    ? "جارٍ الحفظ..."
                    : isEdit
                      ? "حفظ التعديلات"
                      : "إنشاء المقال كمسودة"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
