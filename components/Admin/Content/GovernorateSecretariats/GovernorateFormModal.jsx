"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import { X, MapPin, Edit3, AlertCircle, Save, CheckCircle2 } from "lucide-react";

const MAX_NAME = 100;
const MAX_CODE = 10;

export default function GovernorateFormModal({
  isOpen,
  onClose,
  governorate = null,
  nextSortOrder = 1,
  onSave,
  isSubmitting = false,
}) {
  const isEditing = Boolean(governorate?.id);

  const [nameAr, setNameAr] = useState(governorate?.name_ar || "");
  const [code, setCode] = useState(governorate?.code || "");
  const [sortOrder, setSortOrder] = useState(
    governorate?.sort_order !== undefined && governorate?.sort_order !== null
      ? String(governorate.sort_order)
      : String(nextSortOrder)
  );
  const [isActive, setIsActive] = useState(governorate?.is_active ?? true);

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
      errs.nameAr = "اسم المحافظة مطلوب: يرجى كتابة اسم المحافظة بالعربية.";
    } else if (trimmedName.length > MAX_NAME) {
      errs.nameAr = `اسم المحافظة طويل جداً: الحد الأقصى ${MAX_NAME} حرفاً.`;
    }

    const trimmedCode = (code || "").trim().toUpperCase();
    if (!trimmedCode) {
      errs.code = "كود المحافظة مطلوب: يرجى كتابة كود فريد (مثل EG-C أو EG-ALX).";
    } else if (trimmedCode.length < 2 || trimmedCode.length > MAX_CODE) {
      errs.code = `كود المحافظة يجب أن يكون بين 2 و ${MAX_CODE} حروف.`;
    } else if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      errs.code = "كود المحافظة يجب أن يحتوي على أحرف وأرقام إنجليزية وشرطات فقط.";
    }

    const rawOrder = String(sortOrder ?? "").trim();
    if (rawOrder === "") {
      errs.sortOrder = "ترتيب الظهور مطلوب: يرجى تحديد رقم ترتيب المحافظة.";
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

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      if (clientErrors.nameAr) {
        initialInputRef.current?.focus();
      } else if (clientErrors.code) {
        document.getElementById("gov-code")?.focus();
      } else if (clientErrors.sortOrder) {
        document.getElementById("gov-sort-order")?.focus();
      }
      return;
    }

    try {
      setLocalSubmitting(true);
      await onSave({
        name_ar: (nameAr || "").trim(),
        code: (code || "").trim().toUpperCase(),
        sort_order: Number(sortOrder),
        is_active: Boolean(isActive),
      });
    } catch (err) {
      if (err?.code === "DUPLICATE_CODE" || err?.message?.includes("كود")) {
        setErrors((prev) => ({
          ...prev,
          code: "كود المحافظة مستخدم بالفعل، يرجى كتابة كود فريد.",
        }));
        setServerError("كود المحافظة مستخدم بالفعل، يرجى كتابة كود فريد.");
      } else {
        setServerError(
          err?.message || "تعذر حفظ بيانات المحافظة. يرجى التأكد من الحقول والمحاولة مرة أخرى."
        );
      }
    } finally {
      setLocalSubmitting(false);
    }
  };

  const busy = isSubmitting || localSubmitting;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(serverError);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gov-form-title"
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
                <MapPin className="size-5.5 text-gold-darker" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="gov-form-title" className="text-base font-black text-slate-900">
                {isEditing ? "تعديل بيانات المحافظة والظهور" : "إضافة محافظة جديدة"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                التحكم في بيانات المحافظة وترتيبها وظهورها بالصفحة الرئيسية للموقع
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
                  {errors.nameAr && <li>{errors.nameAr}</li>}
                  {errors.code && <li>{errors.code}</li>}
                  {errors.sortOrder && <li>{errors.sortOrder}</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Info Note */}
          {!hasErrors && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
              <span>
                <strong>التحكم في الظهور:</strong> المحافظات المفعلة تظهر في العمود الثالث بالموقع وقائمة طلبات الانضمام، بينما المحافظات المعطلة تختفي تماماً.
              </span>
            </div>
          )}

          <form id="gov-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Governorate Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="gov-name-ar" className="text-sm font-bold text-ink">
                  اسم المحافظة بالعربية <span className="text-red-500">*</span>
                </label>
                <span
                  dir="ltr"
                  className={`inline-block text-[11px] font-medium ${
                    (nameAr || "").trim().length > MAX_NAME
                      ? "text-red-600 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {(nameAr || "").trim().length} / {MAX_NAME}
                </span>
              </div>
              <input
                ref={initialInputRef}
                id="gov-name-ar"
                type="text"
                value={nameAr}
                onChange={(e) => handleFieldChange("nameAr", setNameAr, e.target.value)}
                disabled={busy}
                maxLength={MAX_NAME}
                placeholder="مثال: الوادي الجديد، الأقصر، القاهرة..."
                className={`governorate-form-field h-14 w-full rounded-2xl border px-4 text-xs font-medium shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-60 focus:outline-none focus:ring-0 sm:text-sm ${
                  errors.nameAr
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:!border-red-500 focus:!shadow-[0_2px_5px_rgba(220,38,38,0.25)]"
                    : "border-border bg-white text-ink placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
                aria-invalid={Boolean(errors.nameAr)}
                aria-describedby={errors.nameAr ? "gov-name-ar-error" : undefined}
              />
              {errors.nameAr && (
                <p id="gov-name-ar-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.nameAr}</span>
                </p>
              )}
            </div>

            {/* Code & Sort Order Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Governorate Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="gov-code" className="text-sm font-bold text-ink">
                    كود المحافظة <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">حروف إنجليزية</span>
                </div>
                <input
                  id="gov-code"
                  type="text"
                  dir="ltr"
                  value={code}
                  onChange={(e) => handleFieldChange("code", setCode, e.target.value.toUpperCase())}
                  disabled={busy}
                  maxLength={MAX_CODE}
                  placeholder="EG-WAD"
                className={`governorate-form-field h-14 w-full rounded-2xl border px-4 font-mono text-xs font-medium uppercase shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-60 focus:outline-none focus:ring-0 sm:text-sm ${
                    errors.code
                      ? "border-red-400 bg-red-50/20 text-slate-900 focus:!border-red-500 focus:!shadow-[0_2px_5px_rgba(220,38,38,0.25)]"
                      : "border-border bg-white text-ink placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                  }`}
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby={errors.code ? "gov-code-error" : undefined}
                />
                {errors.code && (
                  <p id="gov-code-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.code}</span>
                  </p>
                )}
              </div>

              {/* Sort Order */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="gov-sort-order" className="text-sm font-bold text-ink">
                    ترتيب العرض <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">أول 8 تظهر بالصفحة</span>
                </div>
                <input
                  id="gov-sort-order"
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
                  aria-describedby={errors.sortOrder ? "gov-sort-order-error" : undefined}
                />
                {errors.sortOrder && (
                  <p id="gov-sort-order-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.sortOrder}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Active / Visibility Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={busy}
                  className="size-4.5 rounded-md border-border accent-gold focus:outline-2 focus:outline-gold focus:outline-offset-2 disabled:opacity-50"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    إظهار المحافظة وتفعيلها في الموقع العام
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    عند إلغاء التحديد، يتم إخفاء المحافظة تماماً من عمود أمانات المحافظات ومن قوائم طلبات الانضمام.
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
            form="gov-form"
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
                <span>{isEditing ? "حفظ التعديلات" : "إضافة المحافظة"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
