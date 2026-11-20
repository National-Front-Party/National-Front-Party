"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import { X, UserPlus, Edit3, AlertCircle, Save, CheckCircle2 } from "lucide-react";

export default function LeaderFormModal({
  isOpen,
  onClose,
  leader = null,
  nextSortOrder = 1,
  onSave,
  isSubmitting = false,
}) {
  const isEditing = Boolean(leader?.id);

  const [fullName, setFullName] = useState(leader?.full_name || "");
  const [roleTitle, setRoleTitle] = useState(leader?.role_title || "");
  const [badgeLabel, setBadgeLabel] = useState(leader?.badge_label || "");
  const [sortOrder, setSortOrder] = useState(
    leader?.sort_order !== undefined && leader?.sort_order !== null
      ? String(leader.sort_order)
      : String(nextSortOrder)
  );
  const [isPublished, setIsPublished] = useState(leader?.is_published ?? true);

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

  // Focus trap & Escape key
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

  // Clear specific error on field change
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

    // 1. Full Name Validation
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errs.fullName = "اسم القيادي مطلوب: يرجى إدخال اسم القيادي للظهور في قائمة قيادات الحزب.";
    } else if (trimmedName.length > 200) {
      errs.fullName = `اسم القيادي طويل جداً: الحد الأقصى 200 حرف (المدخل حالياً ${trimmedName.length} حرفاً).`;
    }

    // 2. Role Title Validation
    const trimmedRole = roleTitle.trim();
    if (trimmedRole.length > 200) {
      errs.roleTitle = `الصفة الحزبية طويلة جداً: الحد الأقصى 200 حرف (المدخل حالياً ${trimmedRole.length} حرفاً).`;
    }

    // 3. Badge Label Validation
    const trimmedBadge = badgeLabel.trim();
    if (trimmedBadge.length > 50) {
      errs.badgeLabel = `الشارة التكريمية طويلة جداً: الحد الأقصى 50 حرفاً (المدخل حالياً ${trimmedBadge.length} حرفاً).`;
    }

    // 4. Sort Order Validation
    const rawOrder = String(sortOrder).trim();
    if (rawOrder === "") {
      errs.sortOrder = "حقل الترتيب مطلوب: يرجى تحديد رقم ترتيب ظهور القيادي في القائمة.";
    } else {
      const orderNum = Number(rawOrder);
      if (!Number.isInteger(orderNum)) {
        errs.sortOrder = "ترتيب الظهور غير صحيح: يجب إدخال رقم صحيح فقط (مثل 1، 2، 3...).";
      } else if (orderNum < -32768 || orderNum > 32767) {
        errs.sortOrder = "الترتيب خارج النطاق المسموح به: يجب أن يكون بين -32,768 و 32,767.";
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
      // Focus first erroneous input
      if (clientErrors.fullName) {
        initialInputRef.current?.focus();
      } else if (clientErrors.roleTitle) {
        document.getElementById("leader-role")?.focus();
      } else if (clientErrors.badgeLabel) {
        document.getElementById("leader-badge")?.focus();
      } else if (clientErrors.sortOrder) {
        document.getElementById("leader-sort-order")?.focus();
      }
      return;
    }

    try {
      setLocalSubmitting(true);
      await onSave({
        full_name: fullName.trim(),
        role_title: roleTitle.trim() || "",
        badge_label: badgeLabel.trim() || "",
        sort_order: Number(sortOrder),
        is_published: Boolean(isPublished),
        is_head: false,
      });
    } catch (err) {
      // Map server-side validation issues to fields if returned
      const fieldErrors = {};
      if (err?.issues && typeof err.issues === "object") {
        for (const [key, msgList] of Object.entries(err.issues)) {
          const firstMsg = Array.isArray(msgList) ? msgList[0] : String(msgList);
          if (key === "full_name") {
            fieldErrors.fullName = `خطأ في حقل الاسم: ${firstMsg}`;
          } else if (key === "role_title") {
            fieldErrors.roleTitle = `خطأ في حقل الصفة: ${firstMsg}`;
          } else if (key === "badge_label") {
            fieldErrors.badgeLabel = `خطأ في حقل الشارة: ${firstMsg}`;
          } else if (key === "sort_order") {
            fieldErrors.sortOrder = `خطأ في حقل الترتيب: ${firstMsg}`;
          }
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setServerError("يرجى تصحيح الأخطاء الموضحة أدناه أمام كل حقل غير صالح.");
      } else {
        setServerError(
          err?.message || "تعذر حفظ بيانات القيادي. يرجى التأكد من الحقول والمحاولة مرة أخرى."
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leader-form-modal-title"
    >
      <div
        ref={modalCardRef}
        className="relative my-8 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl transition-all"
        dir="rtl"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute left-5 top-5 inline-flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
          aria-label="إغلاق النافذة"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-xs">
            {isEditing ? (
              <Edit3 className="size-6" aria-hidden="true" />
            ) : (
              <UserPlus className="size-6" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2
              id="leader-form-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {isEditing ? "تعديل بيانات القيادي" : "إضافة قيادي جديد"}
            </h2>
            <p className="text-xs text-slate-500">
              إدارة أعضاء قائمة قيادات الحزب المعروضة أسفل رئيس الحزب بالصفحة الرئيسية
            </p>
          </div>
        </div>

        {/* Global Validation / Error Banner */}
        {hasErrors && (
          <div
            className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in duration-200"
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
                {errors.badgeLabel && <li>{errors.badgeLabel}</li>}
                {errors.sortOrder && <li>{errors.sortOrder}</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Direct Edit Notice (when no errors) */}
        {!hasErrors && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
            <span>
              <strong>تحديث مباشر:</strong> التعديلات والإضافات تنعكس مباشرة في قائمة القيادات بالصفحة الرئيسية.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {/* Full Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="leader-fullname" className="text-xs font-bold text-slate-800">
                الاسم بالكامل <span className="text-red-500">*</span>
              </label>
              <span
                dir="ltr"
                className={`inline-block text-[11px] font-medium ${
                  fullName.trim().length > 200 ? "text-red-600 font-bold" : "text-slate-400"
                }`}
              >
                {fullName.trim().length} / 200
              </span>
            </div>
            <input
              ref={initialInputRef}
              id="leader-fullname"
              type="text"
              value={fullName}
              onChange={(e) => handleFieldChange("fullName", setFullName, e.target.value)}
              disabled={busy}
              maxLength={200}
              placeholder="مثال: د. أحمد محمد..."
              className={`w-full h-11 rounded-2xl border px-4 text-sm font-semibold transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                errors.fullName
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
              }`}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "leader-fullname-error" : undefined}
            />
            {errors.fullName && (
              <p id="leader-fullname-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Role Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="leader-role" className="text-xs font-bold text-slate-800">
                الصفة الحزبية / المنصب
              </label>
              <span
                dir="ltr"
                className={`inline-block text-[11px] font-medium ${
                  roleTitle.trim().length > 200 ? "text-red-600 font-bold" : "text-slate-400"
                }`}
              >
                {roleTitle.trim().length} / 200
              </span>
            </div>
            <input
              id="leader-role"
              type="text"
              value={roleTitle}
              onChange={(e) => handleFieldChange("roleTitle", setRoleTitle, e.target.value)}
              disabled={busy}
              maxLength={200}
              placeholder="مثال: نائب رئيس الحزب للشؤون السياسية"
              className={`w-full h-11 rounded-2xl border px-4 text-sm transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                errors.roleTitle
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
              }`}
              aria-invalid={Boolean(errors.roleTitle)}
              aria-describedby={errors.roleTitle ? "leader-role-error" : undefined}
            />
            {errors.roleTitle && (
              <p id="leader-role-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.roleTitle}</span>
              </p>
            )}
          </div>

          {/* Badge Label & Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Badge Label */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="leader-badge" className="text-xs font-bold text-slate-800">
                  الشارة (اختياري)
                </label>
                <span
                  dir="ltr"
                  className={`inline-block text-[11px] font-medium ${
                    badgeLabel.trim().length > 50 ? "text-red-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {badgeLabel.trim().length} / 50
                </span>
              </div>
              <input
                id="leader-badge"
                type="text"
                value={badgeLabel}
                onChange={(e) => handleFieldChange("badgeLabel", setBadgeLabel, e.target.value)}
                disabled={busy}
                maxLength={50}
                placeholder="مثال: عضو مؤسس"
                className={`w-full h-11 rounded-2xl border px-4 text-sm transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                  errors.badgeLabel
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
                }`}
                aria-invalid={Boolean(errors.badgeLabel)}
                aria-describedby={errors.badgeLabel ? "leader-badge-error" : undefined}
              />
              {errors.badgeLabel && (
                <p id="leader-badge-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.badgeLabel}</span>
                </p>
              )}
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="leader-sort-order" className="text-xs font-bold text-slate-800">
                  ترتيب الظهور <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  رقم صحيح
                </span>
              </div>
              <input
                id="leader-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => handleFieldChange("sortOrder", setSortOrder, e.target.value)}
                disabled={busy}
                min={-32768}
                max={32767}
                placeholder="مثال: 1"
                className={`w-full h-11 rounded-2xl border px-4 text-sm font-semibold transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                  errors.sortOrder
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
                }`}
                aria-invalid={Boolean(errors.sortOrder)}
                aria-describedby={errors.sortOrder ? "leader-sort-order-error" : undefined}
              />
              {errors.sortOrder && (
                <p id="leader-sort-order-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.sortOrder}</span>
                </p>
              )}
            </div>
          </div>

          {/* Published Toggle */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={busy}
                className="size-4.5 rounded-lg border-slate-300 text-gold focus:ring-gold/20"
              />
              <span className="text-xs font-bold text-slate-800">
                نشر القيادي مباشرة في قائمة الموقع العام
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Spinner size="sm" color="ink" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" aria-hidden="true" />
                  <span>{isEditing ? "حفظ التعديلات" : "إضافة القيادي"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
