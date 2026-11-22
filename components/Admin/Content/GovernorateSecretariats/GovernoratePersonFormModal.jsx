"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import ImageUploadField from "@/components/Admin/Content/ImageUploadField";
import { X, UserPlus, Edit3, AlertCircle, Save, CheckCircle2 } from "lucide-react";

const MAX_NAME = 200;
const MAX_ROLE = 200;

export default function GovernoratePersonFormModal({
  isOpen,
  onClose,
  person = null,
  governorateId,
  governorateName = "",
  nextSortOrder = 1,
  onSave,
  isSubmitting = false,
}) {
  const isEditing = Boolean(person?.id);

  const [fullName, setFullName] = useState(person?.full_name || "");
  const [roleTitle, setRoleTitle] = useState(person?.role_title || "");
  const [photoUrl, setPhotoUrl] = useState(person?.photo_url || "");
  const [sortOrder, setSortOrder] = useState(
    person?.sort_order !== undefined && person?.sort_order !== null
      ? String(person.sort_order)
      : String(nextSortOrder)
  );
  const [isPublished, setIsPublished] = useState(person?.is_published ?? true);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

    const trimmedName = (fullName || "").trim();
    if (!trimmedName) {
      errs.fullName = "اسم العضو مطلوب: يرجى كتابة الاسم الثلاثي أو الرباعي للظهور بالموقع.";
    } else if (trimmedName.length > MAX_NAME) {
      errs.fullName = `اسم العضو طويل جداً: الحد الأقصى ${MAX_NAME} حرفاً (المدخل حالياً ${trimmedName.length} حرفاً).`;
    }

    const trimmedRole = (roleTitle || "").trim();
    if (trimmedRole.length > MAX_ROLE) {
      errs.roleTitle = `الصفة أو المنصب طويل جداً: الحد الأقصى ${MAX_ROLE} حرفاً (المدخل حالياً ${trimmedRole.length} حرفاً).`;
    }

    const rawOrder = String(sortOrder ?? "").trim();
    if (rawOrder === "") {
      errs.sortOrder = "ترتيب الظهور مطلوب: يرجى تحديد رقم ترتيب العضو.";
    } else {
      const orderNum = Number(rawOrder);
      if (!Number.isInteger(orderNum)) {
        errs.sortOrder = "ترتيب الظهور غير صحيح: يجب إدخال رقم صحيح فقط (مثل 1، 2، 3...).";
      } else if (orderNum < -32768 || orderNum > 32767) {
        errs.sortOrder = "الترتيب خارج النطاق المسموح به (-32,768 إلى 32,767).";
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (isUploadingPhoto) {
      setServerError("يرجى الانتظار حتى يكتمل رفع الصورة أولاً.");
      return;
    }

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      if (clientErrors.fullName) {
        initialInputRef.current?.focus();
      } else if (clientErrors.roleTitle) {
        document.getElementById("gov-person-role")?.focus();
      } else if (clientErrors.sortOrder) {
        document.getElementById("gov-person-sort-order")?.focus();
      }
      return;
    }

    try {
      setLocalSubmitting(true);
      await onSave({
        governorate_id: Number(governorateId),
        full_name: (fullName || "").trim(),
        role_title: (roleTitle || "").trim() || "",
        photo_url: (photoUrl || "").trim() || "",
        sort_order: Number(sortOrder),
        is_published: Boolean(isPublished),
      });
    } catch (err) {
      const fieldErrors = {};
      if (err?.issues && typeof err.issues === "object") {
        for (const [key, msgList] of Object.entries(err.issues)) {
          const firstMsg = Array.isArray(msgList) ? msgList[0] : String(msgList);
          if (key === "full_name") {
            fieldErrors.fullName = `خطأ في حقل الاسم: ${firstMsg}`;
          } else if (key === "role_title") {
            fieldErrors.roleTitle = `خطأ في حقل الصفة: ${firstMsg}`;
          } else if (key === "photo_url") {
            fieldErrors.photoUrl = `خطأ في الصورة: ${firstMsg}`;
          } else if (key === "sort_order") {
            fieldErrors.sortOrder = `خطأ في حقل الترتيب: ${firstMsg}`;
          }
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setServerError("يرجى مراجعة وتصحيح الحقول المحددة أدناه.");
      } else {
        setServerError(
          err?.message || "تعذر حفظ بيانات العضو. يرجى التأكد من الحقول والمحاولة مرة أخرى."
        );
      }
    } finally {
      setLocalSubmitting(false);
    }
  };

  const busy = isSubmitting || localSubmitting || isUploadingPhoto;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(serverError);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gov-person-form-title"
    >
      <div
        ref={modalCardRef}
        className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card-hover transition-all sm:max-h-[90dvh]"
        dir="rtl"
      >
        {/* Pinned Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-xs">
              {isEditing ? (
                <Edit3 className="size-5.5 text-gold-darker" aria-hidden="true" />
              ) : (
                <UserPlus className="size-5.5 text-gold-darker" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="gov-person-form-title" className="text-base font-black text-slate-900">
                {isEditing ? "تعديل بيانات عضو الأمانة" : "إضافة عضو جديد بأمانة المحافظة"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {governorateName ? `أمانة محافظة ${governorateName}` : "إدارة كوادر أمانة المحافظة"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
            aria-label="إغلاق النافذة"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {/* Validation Alert */}
          {hasErrors && (
            <div
              className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in duration-200"
              role="alert"
            >
              <AlertCircle className="size-4.5 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <span className="font-bold block">
                  {serverError || "يوجد بيانات غير صحيحة في النموذج:"}
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-red-700 font-medium">
                  {errors.fullName && <li>{errors.fullName}</li>}
                  {errors.roleTitle && <li>{errors.roleTitle}</li>}
                  {errors.sortOrder && <li>{errors.sortOrder}</li>}
                  {errors.photoUrl && <li>{errors.photoUrl}</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Direct Notice */}
          {!hasErrors && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
              <span>
                <strong>تحديث مباشر:</strong> التعديلات والإضافات تنعكس مباشرة في قائمة أمانة {governorateName || "المحافظة"} بالصفحة الرئيسية للموقع فور اعتمادها.
              </span>
            </div>
          )}

          <form id="gov-person-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="gov-person-fullname" className="text-sm font-bold text-ink">
                  الاسم بالكامل <span className="text-red-500">*</span>
                </label>
                <span
                  dir="ltr"
                  className={`inline-block text-[11px] font-medium ${
                    (fullName || "").trim().length > MAX_NAME
                      ? "text-red-600 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {(fullName || "").trim().length} / {MAX_NAME}
                </span>
              </div>
              <input
                ref={initialInputRef}
                id="gov-person-fullname"
                type="text"
                value={fullName}
                onChange={(e) => handleFieldChange("fullName", setFullName, e.target.value)}
                disabled={busy}
                maxLength={MAX_NAME}
                placeholder="مثال: المستشار محمد عبد الرحمن"
                className={`governorate-form-field h-14 w-full rounded-2xl border px-4 text-xs font-medium shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-60 focus:outline-none focus:ring-0 sm:text-sm ${
                  errors.fullName
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:!border-red-500 focus:!shadow-[0_2px_5px_rgba(220,38,38,0.25)]"
                    : "border-border bg-white text-ink placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "gov-person-fullname-error" : undefined}
              />
              {errors.fullName && (
                <p id="gov-person-fullname-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* Role Title & Sort Order Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Role Title */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="gov-person-role" className="text-sm font-bold text-ink">
                    الصفة أو المنصب بالأمانة
                  </label>
                  <span
                    dir="ltr"
                    className={`inline-block text-[11px] font-medium ${
                      (roleTitle || "").trim().length > MAX_ROLE
                        ? "text-red-600 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {(roleTitle || "").trim().length} / {MAX_ROLE}
                  </span>
                </div>
                <input
                  id="gov-person-role"
                  type="text"
                  value={roleTitle}
                  onChange={(e) => handleFieldChange("roleTitle", setRoleTitle, e.target.value)}
                  disabled={busy}
                  maxLength={MAX_ROLE}
                  placeholder="مثال: أمين المحافظة، أمين التنظيم..."
                  className={`governorate-form-field h-14 w-full rounded-2xl border px-4 text-xs font-medium shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-60 focus:outline-none focus:ring-0 sm:text-sm ${
                    errors.roleTitle
                      ? "border-red-400 bg-red-50/20 text-slate-900 focus:!border-red-500 focus:!shadow-[0_2px_5px_rgba(220,38,38,0.25)]"
                      : "border-border bg-white text-ink placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                  }`}
                  aria-invalid={Boolean(errors.roleTitle)}
                  aria-describedby={errors.roleTitle ? "gov-person-role-error" : undefined}
                />
                {errors.roleTitle && (
                  <p id="gov-person-role-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.roleTitle}</span>
                  </p>
                )}
              </div>

              {/* Sort Order */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="gov-person-sort-order" className="text-sm font-bold text-ink">
                    الترتيب <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">رقم صحيح</span>
                </div>
                <input
                  id="gov-person-sort-order"
                  type="number"
                  step="1"
                  value={sortOrder}
                  onChange={(e) => handleFieldChange("sortOrder", setSortOrder, e.target.value)}
                  disabled={busy}
                  className={`governorate-form-field h-14 w-full rounded-2xl border px-4 text-center font-mono text-xs font-medium shadow-none transition-all duration-300 ease-in-out disabled:opacity-60 focus:outline-none focus:ring-0 sm:text-sm ${
                    errors.sortOrder
                      ? "border-red-400 bg-red-50/20 text-slate-900 focus:!border-red-500 focus:!shadow-[0_2px_5px_rgba(220,38,38,0.25)]"
                      : "border-border bg-white text-ink hover:border-gold focus:!border-transparent focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                  }`}
                  aria-invalid={Boolean(errors.sortOrder)}
                  aria-describedby={errors.sortOrder ? "gov-person-sort-order-error" : undefined}
                />
                {errors.sortOrder && (
                  <p id="gov-person-sort-order-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.sortOrder}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Optional Photo Upload */}
            <div className="space-y-1.5 pt-1">
              <ImageUploadField
                value={photoUrl}
                onChange={(url) => {
                  setPhotoUrl(url || "");
                  if (errors.photoUrl) {
                    setErrors((prev) => {
                      const updated = { ...prev };
                      delete updated.photoUrl;
                      return updated;
                    });
                  }
                }}
                label="الصورة الشخصية (اختياري)"
                showFormatHint={false}
                error={errors.photoUrl}
                disabled={busy}
                id="gov-person-photo"
                className="governorate-form-field [&_[role=button]:focus]:border-transparent [&_[role=button]:focus]:outline-none [&_[role=button]:focus]:shadow-[0_2px_5px_rgba(201,162,74,0.45)] [&_button:focus]:outline-2 [&_button:focus]:outline-gold [&_button:focus]:outline-offset-2"
                onUploadStart={() => setIsUploadingPhoto(true)}
                onUploadEnd={() => setIsUploadingPhoto(false)}
              />
            </div>

            {/* Publish Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  disabled={busy}
                  className="size-4.5 rounded-md border-border accent-gold focus:outline-2 focus:outline-gold focus:outline-offset-2 disabled:opacity-50"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    نشر العضو وتفعيله مباشرة في قائمة الموقع العام
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    عند إلغاء التحديد، يظل العضو محفوظاً في لوحة التحكم ولكن لا يظهر لزوار الموقع.
                  </span>
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Pinned Footer */}
        <div className="flex shrink-0 flex-col-reverse items-stretch justify-end gap-2 border-t border-line bg-page/50 px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-12 rounded-2xl border border-line bg-white px-5 text-xs font-bold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50 sm:h-11"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="gov-person-form"
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11"
          >
            {busy ? (
              <>
                <Spinner className="size-4 text-ink" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                <span>{isEditing ? "حفظ التعديلات" : "إضافة العضو"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
