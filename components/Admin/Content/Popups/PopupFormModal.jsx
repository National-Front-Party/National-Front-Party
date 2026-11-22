"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import {
  X,
  User,
  Target,
  Eye,
  Send,
  MessageCircleQuestion,
  AlertTriangle,
  Sparkles,
  Save,
  EyeOff,
  FileText,
} from "lucide-react";

export const SUPPORTED_POPUP_ICONS = [
  { id: "user", label: "من نحن؟", icon: User },
  { id: "target", label: "هدفنا", icon: Target },
  { id: "eye", label: "رؤيتنا", icon: Eye },
  { id: "send", label: "رسالتنا", icon: Send },
  { id: "message", label: "لماذا نحن؟", icon: MessageCircleQuestion },
];

const MAX_TITLE_LENGTH = 200;
const MAX_SLUG_LENGTH = 120;
const MAX_BODY_LENGTH = 10_000;
const MAX_SOURCE_NOTE_LENGTH = 500;

export default function PopupFormModal({
  isOpen,
  onClose,
  onSubmit,
  onUnpublishForEdit,
  onOpenPreview,
  popup = null,
  isSubmitting = false,
  canManage = true,
  nextSortOrder = 1,
}) {
  const isEditing = Boolean(popup);
  const isPublished = Boolean(popup?.is_published);
  const isBlockedFromDirectEdit = isEditing && isPublished;

  const [title, setTitle] = useState(popup?.title || "");
  const [slug, setSlug] = useState(popup?.slug || "");
  const [body, setBody] = useState(popup?.body || "");
  const [sourceNote, setSourceNote] = useState(popup?.source_note ?? "الموقع الرسمي للحزب");
  const [icon, setIcon] = useState(popup?.icon || "user");
  const [sortOrder, setSortOrder] = useState(popup?.sort_order ?? nextSortOrder);
  const [isPublishedField, setIsPublishedField] = useState(Boolean(popup?.is_published));
  const [errors, setErrors] = useState({});

  const modalCardRef = useRef(null);
  const titleInputRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management and Escape key
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 40);

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current) {
        const focusableSelectors =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
          modalCardRef.current.querySelectorAll(focusableSelectors),
        );
        if (focusable.length === 0) return;

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

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = "عنوان العنصر مطلوب.";
    } else if (title.trim().length > MAX_TITLE_LENGTH) {
      newErrors.title = `يجب ألا يتجاوز العنوان ${MAX_TITLE_LENGTH} حرفاً.`;
    }

    const trimmedSlug = slug.trim();
    if (!trimmedSlug) {
      newErrors.slug = "المعرف المختصر (Slug) مطلوب.";
    } else if (trimmedSlug.length > MAX_SLUG_LENGTH) {
      newErrors.slug = `يجب ألا يتجاوز المعرف ${MAX_SLUG_LENGTH} حرفاً.`;
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      newErrors.slug = "يجب أن يتكون المعرف من أحرف إنجليزية صغيرة وأرقام وشرطات فقط (مثال: about, our-goals).";
    }

    if (body && body.length > MAX_BODY_LENGTH) {
      newErrors.body = `تجاوز النص الحد الأقصى المسموح به (${MAX_BODY_LENGTH.toLocaleString("ar-EG")} حرف).`;
    }

    if (sourceNote && sourceNote.trim().length > MAX_SOURCE_NOTE_LENGTH) {
      newErrors.source_note = `يجب ألا تتجاوز ملاحظة المصدر ${MAX_SOURCE_NOTE_LENGTH} حرفاً.`;
    }

    const orderNum = Number(sortOrder);
    if (isNaN(orderNum) || !Number.isInteger(orderNum) || orderNum < -32768 || orderNum > 32767) {
      newErrors.sort_order = "يجب إدخال رقم صحيح للترتيب بين -32,768 و 32,767.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isBlockedFromDirectEdit || isSubmitting || !canManage) return;

    if (!validateForm()) return;

    const payload = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      body: body.trim() || null,
      source_note: sourceNote.trim() || null,
      icon: icon || "user",
      sort_order: Number(sortOrder),
    };

    if (!isEditing) {
      payload.is_published = Boolean(isPublishedField);
    }

    await onSubmit(payload);
  };

  const handlePreviewCurrent = () => {
    onOpenPreview?.({
      title: title.trim() || "معاينة العنصر",
      body: body,
      source_note: sourceNote.trim() || "الموقع الرسمي للحزب",
      icon: icon,
      is_published: isEditing ? isPublished : isPublishedField,
      sort_order: Number(sortOrder),
      slug: slug.trim(),
    });
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={modalCardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-form-title"
        className="relative w-full max-w-[760px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all"
        dir="rtl"
      >
        {/* Top Gold Gradient Bar */}
        <div className="h-1.5 w-full bg-[linear-gradient(135deg,var(--color-gold,#C9A24A),var(--color-gold-light,#E8D5A3),var(--color-gold,#C9A24A))]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-gold shadow-sm">
              <FileText className="size-5" />
            </span>
            <div>
              <h3 id="popup-form-title" className="text-base font-black text-slate-900">
                {isEditing
                  ? `تعديل عنصر: «${popup?.title || ""}»`
                  : "إضافة عنصر جديد لمحتوى الصفحة الرئيسية"}
              </h3>
              <p className="text-xs text-slate-500">
                إدارة محتوى البطاقات والنوافذ التعريفية في العمود الأول
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="إغلاق النافذة"
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-4">
          {/* Published Blocker Alert (Section 4 Compliance) */}
          {isBlockedFromDirectEdit && (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900"
              role="alert"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4.5 text-amber-600 shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-amber-950">
                    هذا العنصر منشور حالياً. تم قفل التعديل المباشر لحماية المحتوى المنشور.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onUnpublishForEdit?.(popup)}
                    disabled={isSubmitting || !canManage}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-800 transition-colors disabled:opacity-50"
                  >
                    <EyeOff className="size-3.5" />
                    إلغاء النشر للتعديل
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewCurrent}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors"
                  >
                    <Sparkles className="size-3.5 text-amber-500" />
                    معاينة
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Title & Slug Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="popup-title-input" className="block text-xs font-bold text-slate-700 mb-1">
                العنوان <span className="text-red-500">*</span>
              </label>
              <input
                id="popup-title-input"
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                disabled={isBlockedFromDirectEdit || isSubmitting}
                placeholder="مثال: من نحن؟"
                maxLength={MAX_TITLE_LENGTH}
                className={`w-full rounded-xl border px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-gold disabled:bg-slate-100 disabled:cursor-not-allowed ${
                  errors.title ? "border-red-400 bg-red-50/30" : "border-slate-300 bg-white"
                }`}
              />
              <div className="flex items-center justify-between mt-1 text-[10px]">
                {errors.title ? (
                  <span className="text-red-600 font-medium">{errors.title}</span>
                ) : (
                  <span className="text-slate-400">العنوان في القائمة والنافذة</span>
                )}
                <span className="text-slate-400 font-mono">
                  {title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="popup-slug-input" className="block text-xs font-bold text-slate-700 mb-1">
                المعرف المختصر (Slug) <span className="text-red-500">*</span>
              </label>
              <input
                id="popup-slug-input"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase());
                  if (errors.slug) setErrors((prev) => ({ ...prev, slug: undefined }));
                }}
                disabled={isBlockedFromDirectEdit || isSubmitting}
                placeholder="about"
                maxLength={MAX_SLUG_LENGTH}
                dir="ltr"
                className={`w-full rounded-xl border px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-gold disabled:bg-slate-100 disabled:cursor-not-allowed font-mono ${
                  errors.slug ? "border-red-400 bg-red-50/30" : "border-slate-300 bg-white"
                }`}
              />
              <div className="flex items-center justify-between mt-1 text-[10px]">
                {errors.slug ? (
                  <span className="text-red-600 font-medium">{errors.slug}</span>
                ) : (
                  <span className="text-slate-400">معرف فريد بالإنجليزية (مثال: about)</span>
                )}
                <span className="text-slate-400 font-mono">
                  {slug.length}/{MAX_SLUG_LENGTH}
                </span>
              </div>
            </div>
          </div>

          {/* Icon Selector: Compact & Sleek */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الأيقونة المعتمدة <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_POPUP_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    disabled={isBlockedFromDirectEdit || isSubmitting}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-gold bg-gold-tint/40 text-ink ring-1 ring-gold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? "bg-ink text-gold" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <IconComp className="size-3.5" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="popup-body-input" className="block text-xs font-bold text-slate-700">
                نص المحتوى (الفقرات)
              </label>
              <span className="text-[11px] text-slate-400">
                افصل بين الفقرات بسطر فارغ (Enter مرتين)
              </span>
            </div>
            <textarea
              id="popup-body-input"
              rows={7}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (errors.body) setErrors((prev) => ({ ...prev, body: undefined }));
              }}
              disabled={isBlockedFromDirectEdit || isSubmitting}
              placeholder="اكتب نص وفقرات محتوى العنصر هنا..."
              maxLength={MAX_BODY_LENGTH}
              className={`w-full rounded-2xl border px-3.5 py-3 text-sm text-slate-900 leading-relaxed placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-gold/30 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                errors.body ? "border-red-400 bg-red-50/30" : "border-slate-300 bg-white"
              }`}
            />
            <div className="flex items-center justify-between mt-1 text-[11px]">
              {errors.body ? (
                <span className="text-red-600 font-medium">{errors.body}</span>
              ) : (
                <span className="text-slate-400">
                  عدد الفقرات الحالية:{" "}
                  {body ? body.split(/\r?\n+/).filter((p) => p.trim().length > 0).length : 0}
                </span>
              )}
              <span className="text-slate-400 font-mono">
                {body.length}/{MAX_BODY_LENGTH.toLocaleString("ar-EG")}
              </span>
            </div>
          </div>

          {/* Source Note & Sort Order Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="popup-source-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                ملاحظة المصدر
              </label>
              <input
                id="popup-source-input"
                type="text"
                value={sourceNote}
                onChange={(e) => {
                  setSourceNote(e.target.value);
                  if (errors.source_note) setErrors((prev) => ({ ...prev, source_note: undefined }));
                }}
                disabled={isBlockedFromDirectEdit || isSubmitting}
                placeholder="الموقع الرسمي للحزب"
                maxLength={MAX_SOURCE_NOTE_LENGTH}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-gold/30 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                تظهر في أسفل نافذة العرض للزوار
              </span>
            </div>

            <div>
              <label htmlFor="popup-sort-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                ترتيب العرض
              </label>
              <input
                id="popup-sort-input"
                type="number"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  if (errors.sort_order) setErrors((prev) => ({ ...prev, sort_order: undefined }));
                }}
                disabled={isBlockedFromDirectEdit || isSubmitting}
                min={-32768}
                max={32767}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-gold/30 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                ترتيب تصاعدي (1 يسبق 2)
              </span>
            </div>
          </div>

          {/* Initial Publishing State for New Items */}
          {!isEditing && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    نشر العنصر مباشرة للجمهور عند الحفظ
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    الوضع الموصى به هو حفظه كمسودة غير منشورة أولاً لمراجعته ومعاينته بأمان.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isPublishedField}
                  onChange={(e) => setIsPublishedField(e.target.checked)}
                  disabled={isSubmitting}
                  className="size-4.5 rounded text-gold focus:ring-gold"
                />
              </label>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={handlePreviewCurrent}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs"
          >
            <Sparkles className="size-4 text-amber-500" />
            معاينة نافذة العرض
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isBlockedFromDirectEdit || isSubmitting || !canManage}
              className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Spinner size="sm" />}
              <Save className="size-4" />
              <span>
                {isSubmitting
                  ? "جاري الحفظ..."
                  : isBlockedFromDirectEdit
                  ? "التعديل متوقف لحماية المنشور"
                  : isEditing
                  ? "حفظ التعديلات"
                  : "إضافة العنصر"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
