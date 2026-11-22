"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import {
  X,
  Landmark,
  Church,
  House,
  AlertCircle,
  Save,
  Eye,
  Info,
  CheckCircle2,
} from "lucide-react";
import ParliamentaryPreviewModal from "./ParliamentaryPreviewModal";

const MAX_TITLE = 200;
const MAX_SUBTITLE = 300;
const MAX_HEAD_NAME = 200;
const MAX_HEAD_ROLE = 200;
const MAX_BODY = 10000;
const MAX_SOURCE_NOTE = 500;

const SUPPORTED_ICONS = [
  {
    id: "landmark",
    label: "صرح تشريعي",
    subLabel: "مجلس الشيوخ",
    Icon: Landmark,
  },
  {
    id: "church",
    label: "قبة برلمانية",
    subLabel: "مجلس النواب",
    Icon: Church,
  },
  {
    id: "house",
    label: "مبنى محلي",
    subLabel: "المجالس المحلية",
    Icon: House,
  },
];

const FIELD_BASE =
  "parliamentary-form-field rounded-2xl border text-xs sm:text-sm text-ink shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:cursor-not-allowed disabled:opacity-60 focus:!outline-none focus:!ring-0";
const fieldClassName = (hasError, dimensions = "h-14 w-full px-4") =>
  `${dimensions} ${FIELD_BASE} ${
    hasError
      ? "border-rose-300 bg-rose-50/20 focus:!border-rose-500 focus:!shadow-[0_2px_5px_rgba(225,29,72,0.2)]"
      : "border-border bg-white hover:border-gold focus:!border-transparent focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
  }`;

function generateParliamentarySlug(title) {
  const trimmed = (title || "").trim();
  if (trimmed.includes("شيوخ")) return `senate-${Date.now().toString(36)}`;
  if (trimmed.includes("نواب")) return `house-${Date.now().toString(36)}`;
  if (trimmed.includes("محل")) return `local-${Date.now().toString(36)}`;

  const latin = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (latin.length >= 2) {
    return `${latin.slice(0, 30)}-${Date.now().toString(36)}`;
  }

  const rand = Math.random().toString(36).substring(2, 6);
  return `parl-${Date.now().toString(36)}-${rand}`;
}

export default function ParliamentaryItemFormModal({
  isOpen,
  onClose,
  item = null,
  nextSortOrder = 1,
  onSave,
  isSubmitting = false,
}) {
  const isEditing = Boolean(item?.id);

  const [title, setTitle] = useState(item?.title || "");
  const [subtitle, setSubtitle] = useState(item?.subtitle || "");
  const [icon, setIcon] = useState(item?.icon || "landmark");
  const [sortOrder, setSortOrder] = useState(
    item?.sort_order !== undefined && item?.sort_order !== null
      ? String(item.sort_order)
      : String(nextSortOrder)
  );
  const [isPublished, setIsPublished] = useState(item?.is_published ?? true);

  // Popup fields
  const [headName, setHeadName] = useState(item?.head_name || "");
  const [headRole, setHeadRole] = useState(item?.head_role || "");
  const [body, setBody] = useState(item?.body || "");
  const [sourceNote, setSourceNote] = useState(item?.source_note || "");

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const modalCardRef = useRef(null);
  const initialInputRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    const timer = setTimeout(() => {
      initialInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  // Escape key & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting && !localSubmitting && !previewOpen) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current && !previewOpen) {
        const focusable = Array.from(
          modalCardRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, localSubmitting, previewOpen, onClose]);

  if (!isOpen) return null;

  const handleFieldChange = (field, setter, value) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (serverError) setServerError("");
  };

  const validate = () => {
    const errs = {};
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      errs.title = "عنوان العنصر بالصفحة الرئيسية مطلوب (حقل إلزامي).";
    } else if (trimmedTitle.length > MAX_TITLE) {
      errs.title = `يجب ألا يتجاوز العنوان ${MAX_TITLE} حرفاً.`;
    }

    if (subtitle.trim().length > MAX_SUBTITLE) {
      errs.subtitle = `يجب ألا يتجاوز العنوان الفرعي ${MAX_SUBTITLE} حرفاً.`;
    }

    if (headName.trim().length > MAX_HEAD_NAME) {
      errs.headName = `يجب ألا يتجاوز اسم المسؤول ${MAX_HEAD_NAME} حرفاً.`;
    }

    if (headRole.trim().length > MAX_HEAD_ROLE) {
      errs.headRole = `يجب ألا تتجاوز الصفة ${MAX_HEAD_ROLE} حرفاً.`;
    }

    if (body.trim().length > MAX_BODY) {
      errs.body = `يجب ألا يتجاوز نص المحتوى ${MAX_BODY} حرفاً.`;
    }

    if (sourceNote.trim().length > MAX_SOURCE_NOTE) {
      errs.sourceNote = `يجب ألا يتجاوز المصدر ${MAX_SOURCE_NOTE} حرفاً.`;
    }

    const orderNum = parseInt(sortOrder, 10);
    if (isNaN(orderNum) || orderNum < -32768 || orderNum > 32767) {
      errs.sortOrder = "يرجى إدخال رقم ترتيب صحيح بين -32768 و 32767.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || localSubmitting) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setServerError("يرجى ملء الحقول الإلزامية المحددة باللون الأحمر أدناه.");
      if (validationErrors.title) {
        initialInputRef.current?.focus();
      }
      return;
    }

    setLocalSubmitting(true);
    setServerError("");

    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        icon: icon || "landmark",
        sort_order: parseInt(sortOrder, 10),
        is_published: isPublished,
        head_name: headName.trim(),
        head_role: headRole.trim(),
        body: body.trim(),
        source_note: sourceNote.trim(),
      };

      if (!isEditing) {
        payload.slug = generateParliamentarySlug(title);
      }

      await onSave(payload, item?.id);
    } catch (err) {
      const code = err?.code || "";
      if (code === "DUPLICATE_SLUG" || code === "DUPLICATE") {
        setServerError("تعذر الحفظ لوجود عنصر آخر بنفس المعرف البرمجي. يرجى تعديل العنوان والمحاولة ثانية.");
      } else if (code === "VALIDATION" || err?.status === 400) {
        setServerError(err?.message || "يرجى مراجعة البيانات المدخلة في الحقول المحددة بالأحمر.");
      } else if (err?.status === 403) {
        setServerError("ليست لديك الصلاحية اللازمة لتعديل محتوى الهيئة البرلمانية.");
      } else {
        setServerError(err?.message || "حدث خطأ غير متوقع أثناء الحفظ، يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setLocalSubmitting(false);
    }
  };

  const busy = isSubmitting || localSubmitting;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-xs sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parliament-modal-title"
      >
        <div
          ref={modalCardRef}
          className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card-hover transition-all sm:max-h-[90dvh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark border border-gold/30 shadow-2xs">
                <Landmark className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 id="parliament-modal-title" className="text-base font-black text-ink">
                  {isEditing ? `تعديل «${item?.title || "العنصر البرلماني"}»` : "إضافة عنصر برلماني جديد"}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  إدارة بيانات العنصر بالعمود ومحتوى النافذة المنبثقة التابعة له
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="group inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="إغلاق النافذة"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body Form */}
          <form id="parliament-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:space-y-6 sm:p-6">
            {/* Direct Notice */}
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/80 p-3.5 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <Info className="size-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
              <span>
                <strong>تنبيه مباشر:</strong> التعديلات المعتمدة تنعكس فوراً على عمود «الوحدة البرلمانية» والنوافذ المنبثقة بالصفحة الرئيسية للموقع العام.
              </span>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div
                className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-bold"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0 text-rose-500 mt-0.5" aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Section 1: Main Column Item Data */}
            <div className="space-y-4 rounded-2xl border border-line bg-page/45 p-4 sm:p-5">
              <div className="flex items-center gap-2 border-b border-line pb-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-gold-light">
                  1
                </span>
                <h4 className="text-sm font-bold text-ink">
                  بيانات العنصر في عمود الصفحة الرئيسية
                </h4>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="parl-title" className="text-sm font-bold text-ink">
                    عنوان العنصر بالصفحة الرئيسية <span className="text-rose-500">*</span>
                  </label>
                  <span dir="ltr" className="text-[11px] font-mono text-slate-400">
                    {title.length} / {MAX_TITLE}
                  </span>
                </div>
                <input
                  id="parl-title"
                  ref={initialInputRef}
                  type="text"
                  maxLength={MAX_TITLE}
                  value={title}
                  onChange={(e) => handleFieldChange("title", setTitle, e.target.value)}
                  placeholder="مثال: مجلس الشيوخ، مجلس النواب، المجالس المحلية"
                  disabled={busy}
                  className={fieldClassName(Boolean(errors.title), "h-14 w-full px-4 font-bold")}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "parl-title-error" : undefined}
                />
                {errors.title && (
                  <p id="parl-title-error" className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    <span>{errors.title}</span>
                  </p>
                )}
              </div>

              {/* Subtitle Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="parl-subtitle" className="text-sm font-bold text-ink">
                    العنوان الفرعي (يظهر أسفل العنوان)
                  </label>
                  <span dir="ltr" className="text-[11px] font-mono text-slate-400">
                    {subtitle.length} / {MAX_SUBTITLE}
                  </span>
                </div>
                <input
                  id="parl-subtitle"
                  type="text"
                  maxLength={MAX_SUBTITLE}
                  value={subtitle}
                  onChange={(e) => handleFieldChange("subtitle", setSubtitle, e.target.value)}
                  placeholder="مثال: الهيئة البرلمانية، أمانة المجالس المحلية"
                  disabled={busy}
                  className={fieldClassName(Boolean(errors.subtitle))}
                />
                {errors.subtitle && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    <span>{errors.subtitle}</span>
                  </p>
                )}
              </div>

              {/* Visual Icon Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-ink">
                  أيقونة العنصر (المدعومة بالصفحة الرئيسية)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SUPPORTED_ICONS.map((opt) => {
                    const isSelected = icon === opt.id;
                    const OptIcon = opt.Icon;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleFieldChange("icon", setIcon, opt.id)}
                        disabled={busy}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          isSelected
                            ? "border-gold/70 bg-gold-gradient text-ink shadow-sm hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-md active:translate-y-0"
                            : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold-tint/30 hover:shadow-sm"
                        } focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                            isSelected
                              ? "bg-gold text-ink border-gold"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <OptIcon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-slate-900">{opt.label}</div>
                          <div className="text-[11px] text-slate-500 truncate">{opt.subLabel}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="size-4 text-gold-darker shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort Order & Publishing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label htmlFor="parl-sort-order" className="block text-sm font-bold text-ink">
                    ترتيب الظهور في القائمة
                  </label>
                  <input
                    id="parl-sort-order"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => handleFieldChange("sortOrder", setSortOrder, e.target.value)}
                    disabled={busy}
                    className={fieldClassName(Boolean(errors.sortOrder), "h-14 w-full px-4 text-center font-mono")}
                  />
                  {errors.sortOrder && (
                    <p className="text-xs font-bold text-rose-600">{errors.sortOrder}</p>
                  )}
                </div>

                <div className="flex items-center pt-6">
                  <label className="relative flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => handleFieldChange("isPublished", setIsPublished, e.target.checked)}
                      disabled={busy}
                      className="size-4.5 rounded-md border-border accent-gold transition-colors focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
                    />
                    <span className="text-xs font-extrabold text-slate-800">
                      نشر وتفعيل العنصر بالصفحة الرئيسية
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Popup Content Data */}
            <div className="space-y-4 rounded-2xl border border-line bg-page/45 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-gold-light">
                    2
                  </span>
                  <h4 className="text-sm font-bold text-ink">
                    محتوى النافذة المنبثقة (Popup) التابعة للعنصر
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-gold/30 bg-white px-3 text-xs font-bold text-ink shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold-tint/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 sm:w-auto"
                >
                  <Eye className="size-3.5 text-gold-darker" aria-hidden="true" />
                  <span>معاينة النافذة</span>
                </button>
              </div>

              {/* Head Name & Role Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="parl-head-name" className="text-sm font-bold text-ink">
                      اسم المسؤول / المتحدث
                    </label>
                    <span dir="ltr" className="text-[11px] font-mono text-slate-400">
                      {headName.length} / {MAX_HEAD_NAME}
                    </span>
                  </div>
                  <input
                    id="parl-head-name"
                    type="text"
                    maxLength={MAX_HEAD_NAME}
                    value={headName}
                    onChange={(e) => handleFieldChange("headName", setHeadName, e.target.value)}
                    placeholder="مثال: د. محمود مسلم"
                    disabled={busy}
                    className={fieldClassName(Boolean(errors.headName), "h-14 w-full px-4 font-bold")}
                  />
                  {errors.headName && (
                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      <span>{errors.headName}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="parl-head-role" className="text-sm font-bold text-ink">
                      الصفة الوظيفية أو البرلمانية
                    </label>
                    <span dir="ltr" className="text-[11px] font-mono text-slate-400">
                      {headRole.length} / {MAX_HEAD_ROLE}
                    </span>
                  </div>
                  <input
                    id="parl-head-role"
                    type="text"
                    maxLength={MAX_HEAD_ROLE}
                    value={headRole}
                    onChange={(e) => handleFieldChange("headRole", setHeadRole, e.target.value)}
                    placeholder="مثال: رئيس الهيئة البرلمانية للحزب بمجلس الشيوخ"
                    disabled={busy}
                    className={fieldClassName(Boolean(errors.headRole))}
                  />
                  {errors.headRole && (
                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      <span>{errors.headRole}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Body Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="parl-body" className="text-sm font-bold text-ink">
                    نص ومحاور الكلمة أو المحتوى
                  </label>
                  <span dir="ltr" className="text-[11px] font-mono text-slate-400">
                    {body.length} / {MAX_BODY}
                  </span>
                </div>
                <textarea
                  id="parl-body"
                  rows={6}
                  maxLength={MAX_BODY}
                  value={body}
                  onChange={(e) => handleFieldChange("body", setBody, e.target.value)}
                  placeholder="اكتب نص الكلمة أو التقرير هنا... يمكنك الضغط على زر الإدخال (Enter) للفصل بين الفقرات."
                  disabled={busy}
                  className={`${fieldClassName(Boolean(errors.body), "min-h-[160px] w-full resize-y px-4 py-3.5 leading-relaxed")} font-normal`}
                />
                {errors.body && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    <span>{errors.body}</span>
                  </p>
                )}
                <p className="text-[11px] leading-5 text-muted">
                  💡 تظهر كل فقرة مفصولة بسطر جديد كفقرة مستقلة ومرتبة داخل النافذة المنبثقة للزائر.
                </p>
              </div>

              {/* Source Note Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="parl-source-note" className="text-sm font-bold text-ink">
                    ملاحظة المصدر أو المرجع
                  </label>
                  <span dir="ltr" className="text-[11px] font-mono text-slate-400">
                    {sourceNote.length} / {MAX_SOURCE_NOTE}
                  </span>
                </div>
                <input
                  id="parl-source-note"
                  type="text"
                  maxLength={MAX_SOURCE_NOTE}
                  value={sourceNote}
                  onChange={(e) => handleFieldChange("sourceNote", setSourceNote, e.target.value)}
                  placeholder="مثال: الموقع الرسمي للحزب، صفحة الحزب على فيسبوك"
                  disabled={busy}
                  className={fieldClassName(Boolean(errors.sourceNote))}
                />
                {errors.sourceNote && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    <span>{errors.sourceNote}</span>
                  </p>
                )}
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-line bg-page/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={busy}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-xs font-bold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Eye className="size-4 text-slate-500" aria-hidden="true" />
              <span>معاينة النافذة المنبثقة</span>
            </button>

            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-4 text-xs font-bold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="parliament-form"
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {busy ? (
                  <>
                    <Spinner size="xs" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" aria-hidden="true" />
                    <span>{isEditing ? "حفظ التعديلات" : "إضافة العنصر"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      <ParliamentaryPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        personName={headName}
        personRole={headRole}
        body={body}
        source={sourceNote}
      />
    </>
  );
}
