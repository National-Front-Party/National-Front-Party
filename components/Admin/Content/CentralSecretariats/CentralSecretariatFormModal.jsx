"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import { X, Building2, Edit3, AlertCircle, Save } from "lucide-react";

const MAX_NAME = 200;
const MAX_HEAD_NAME = 200;
const MAX_SOURCE_NOTE = 500;

export default function CentralSecretariatFormModal({
  isOpen,
  onClose,
  secretariat = null,
  parentInfoItemId = 1,
  nextSortOrder = 1,
  onSave,
  isSubmitting = false,
}) {
  const isEditing = Boolean(secretariat?.id);

  const [nameAr, setNameAr] = useState(secretariat?.name_ar || "");
  const [headName, setHeadName] = useState(secretariat?.head_name || "");
  const [sourceNote, setSourceNote] = useState(secretariat?.source_note || "");
  const [sortOrder, setSortOrder] = useState(
    secretariat?.sort_order !== undefined && secretariat?.sort_order !== null
      ? String(secretariat.sort_order)
      : String(nextSortOrder)
  );
  const [isPublished, setIsPublished] = useState(secretariat?.is_published ?? true);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const modalCardRef = useRef(null);
  const initialInputRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management on open
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
      if (e.key === "Escape" && !isSubmitting && !localSubmitting) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current) {
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
  }, [isOpen, isSubmitting, localSubmitting, onClose]);

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

    const trimmedName = (nameAr || "").trim();
    if (!trimmedName) {
      errs.nameAr = "اسم الأمانة المركزية مطلوب.";
    } else if (trimmedName.length > MAX_NAME) {
      errs.nameAr = `اسم الأمانة يتجاوز الحد الأقصى (${MAX_NAME} حرفاً).`;
    }

    const trimmedHead = (headName || "").trim();
    if (trimmedHead.length > MAX_HEAD_NAME) {
      errs.headName = `اسم أمين الأمانة يتجاوز الحد الأقصى (${MAX_HEAD_NAME} حرفاً).`;
    }

    const trimmedNote = (sourceNote || "").trim();
    if (trimmedNote.length > MAX_SOURCE_NOTE) {
      errs.sourceNote = `ملاحظة المصدر تتجاوز الحد الأقصى (${MAX_SOURCE_NOTE} حرفاً).`;
    }

    const rawOrder = String(sortOrder ?? "").trim();
    if (rawOrder !== "") {
      const num = Number(rawOrder);
      if (!Number.isInteger(num)) {
        errs.sortOrder = "ترتيب الظهور يجب أن يكون رقماً صحيحاً.";
      } else if (num < -32768 || num > 32767) {
        errs.sortOrder = "الترتيب خارج النطاق المسموح به (-32,768 إلى 32,767).";
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      if (clientErrors.nameAr) {
        initialInputRef.current?.focus();
      } else if (clientErrors.headName) {
        document.getElementById("sec-head-name")?.focus();
      } else if (clientErrors.sortOrder) {
        document.getElementById("sec-sort-order")?.focus();
      }
      return;
    }

    try {
      setLocalSubmitting(true);
      const rawOrder = String(sortOrder ?? "").trim();
      await onSave({
        info_item_id: Number(parentInfoItemId) || 1,
        name_ar: (nameAr || "").trim(),
        head_name: (headName || "").trim(),
        source_note: (sourceNote || "").trim(),
        sort_order: rawOrder === "" ? nextSortOrder : Number(rawOrder),
        is_published: Boolean(isPublished),
      });
    } catch (err) {
      setServerError(
        err?.message || "تعذر حفظ بيانات الأمانة. يرجى التأكد من الحقول والمحاولة مرة أخرى."
      );
    } finally {
      setLocalSubmitting(false);
    }
  };

  const busy = isSubmitting || localSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-full items-start justify-center overflow-y-auto bg-black/60 p-3 py-4 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sec-form-modal-title"
    >
      <div
        ref={modalCardRef}
        className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card-hover transition-all sm:max-h-[90dvh]"
        dir="rtl"
      >
        {/* Pinned Modal Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-page/40 p-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-xs">
              {isEditing ? (
                <Edit3 className="size-6" aria-hidden="true" />
              ) : (
                <Building2 className="size-6" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="sec-form-modal-title" className="text-lg font-bold text-ink">
                {isEditing ? `تعديل «${secretariat?.name_ar}»` : "إضافة أمانة مركزية جديدة"}
              </h2>
              <p className="text-xs text-slate-500">
                إدارة التشكيلات والأمانات التخصصية للحزب والمعروضة في نافذة الأمانات بالصفحة الرئيسية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="group inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
            aria-label="إغلاق النافذة"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="sec-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* Notice of Immediate Publish */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              <strong>تنبيه:</strong> الحفظ يطبق التعديل مباشرة على المحتوى المنشور بالموقع العام.
            </span>
          </div>

          {/* Server Error Banner */}
          {serverError && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
              <span className="font-semibold">{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name Ar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="sec-name-ar" className="text-xs font-bold text-ink">
                اسم الأمانة المركزية <span className="text-red-500">*</span>
              </label>
              <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                {(nameAr || "").trim().length} / {MAX_NAME}
              </span>
            </div>
            <input
              ref={initialInputRef}
              id="sec-name-ar"
              type="text"
              value={nameAr}
              onChange={(e) => handleFieldChange("nameAr", setNameAr, e.target.value)}
              disabled={busy}
              placeholder="مثال: أمانة الشئون الدستورية والتشريعية"
              className={`h-14 w-full rounded-2xl border px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 focus:outline-none focus:ring-0 sm:text-sm ${
                errors.nameAr
                  ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                  : "border-border bg-white hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              }`}
            />
            {errors.nameAr && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.nameAr}</span>
              </p>
            )}
          </div>

          {/* Head Name */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="sec-head-name" className="text-xs font-bold text-ink">
                اسم أمين الأمانة (اختياري)
              </label>
              <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                {(headName || "").trim().length} / {MAX_HEAD_NAME}
              </span>
            </div>
            <input
              id="sec-head-name"
              type="text"
              value={headName}
              onChange={(e) => handleFieldChange("headName", setHeadName, e.target.value)}
              disabled={busy}
              placeholder="مثال: المستشار / عادل علي السعيد"
              className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm"
            />
          </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sort Order */}
            <div className="space-y-1">
              <label htmlFor="sec-sort-order" className="flex min-h-5 items-center text-xs font-bold text-ink">
                ترتيب الظهور
              </label>
              <input
                id="sec-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => handleFieldChange("sortOrder", setSortOrder, e.target.value)}
                disabled={busy}
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm"
              />
              {errors.sortOrder && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.sortOrder}</span>
                </p>
              )}
            </div>

            {/* Source Note */}
            <div className="space-y-1">
              <div className="flex min-h-5 items-center justify-between gap-2">
                <label htmlFor="sec-source-note" className="text-xs font-bold text-ink">
                  ملاحظة المصدر (اختياري)
                </label>
                <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                  {(sourceNote || "").trim().length} / {MAX_SOURCE_NOTE}
                </span>
              </div>
              <input
                id="sec-source-note"
                type="text"
                value={sourceNote}
                onChange={(e) => handleFieldChange("sourceNote", setSourceNote, e.target.value)}
                disabled={busy}
                placeholder="الموقع الرسمي للحزب"
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm"
              />
            </div>
          </div>

          {/* Published Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={busy}
                className="size-4.5 cursor-pointer rounded-lg border-border accent-gold focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
              />
              <span className="text-xs font-bold text-slate-800">
                نشر الأمانة في قائمة الأمانات المركزية بالموقع العام
              </span>
            </label>
          </div>
        </form>

        {/* Pinned Modal Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-page/40 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-12 w-full rounded-2xl border border-line bg-white px-5 text-xs font-bold text-muted transition-all duration-200 hover:border-gold hover:bg-gold-tint/50 hover:text-ink active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50 sm:w-auto sm:text-sm"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="sec-form"
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 text-xs font-bold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(201,162,74,0.3)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-sm"
          >
            {busy ? (
              <>
                <Spinner size="sm" />
                <span>جارٍ الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                <span>{isEditing ? "حفظ التعديلات" : "إضافة الأمانة"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
