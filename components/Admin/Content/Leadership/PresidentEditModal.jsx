"use client";

import { useEffect, useRef, useState } from "react";
import ImageUploadField from "@/components/Admin/Content/ImageUploadField";
import Spinner from "@/components/Admin/ui/Spinner";
import { X, Crown, AlertCircle, Save, CheckCircle2, Image as ImageIcon, HelpCircle } from "lucide-react";

export default function PresidentEditModal({
  isOpen,
  onClose,
  president,
  onSave,
  isSubmitting = false,
}) {
  const [fullName, setFullName] = useState(president?.full_name || "");
  const [roleTitle, setRoleTitle] = useState(president?.role_title || "رئيس الحزب");
  const [badgeLabel, setBadgeLabel] = useState(president?.badge_label || "");
  const [photoUrl, setPhotoUrl] = useState(president?.photo_url || "");

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
      errs.fullName = "اسم رئيس الحزب مطلوب: يرجى إدخال اسم رئيس الحزب بالكامل (حقل إلزامي).";
    } else if (trimmedName.length > 200) {
      errs.fullName = `اسم رئيس الحزب طويل جداً: الحد الأقصى 200 حرف (المدخل حالياً ${trimmedName.length} حرفاً).`;
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

    // 4. Photo Validation (Mandatory for President)
    if (!photoUrl || !photoUrl.trim()) {
      errs.photoUrl = "صورة رئيس الحزب مطلوبة: يجب رفع صورة شخصية رسمية لرئيس الحزب للعرض في أعلى عمود الأمانات بالصفحة الرئيسية.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      // Auto-focus the first invalid field
      if (clientErrors.fullName) {
        initialInputRef.current?.focus();
      } else if (clientErrors.roleTitle) {
        document.getElementById("president-role")?.focus();
      } else if (clientErrors.badgeLabel) {
        document.getElementById("president-badge")?.focus();
      } else if (clientErrors.photoUrl) {
        document.getElementById("president-photo-upload")?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    try {
      setLocalSubmitting(true);
      await onSave({
        full_name: fullName.trim(),
        role_title: roleTitle.trim() || "",
        badge_label: badgeLabel.trim() || "",
        photo_url: photoUrl ? photoUrl.trim() : "",
        is_head: true,
      });
    } catch (err) {
      const fieldErrors = {};
      if (err?.issues && typeof err.issues === "object") {
        for (const [key, msgList] of Object.entries(err.issues)) {
          const firstMsg = Array.isArray(msgList) ? msgList[0] : String(msgList);
          if (key === "full_name") fieldErrors.fullName = `حقل الاسم: ${firstMsg}`;
          else if (key === "role_title") fieldErrors.roleTitle = `حقل الصفة: ${firstMsg}`;
          else if (key === "badge_label") fieldErrors.badgeLabel = `حقل الشارة: ${firstMsg}`;
          else if (key === "photo_url") fieldErrors.photoUrl = `حقل الصورة: ${firstMsg}`;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setServerError("يرجى تصحيح الأخطاء الموضحة أدناه أمام كل حقل غير صالح.");
      } else {
        setServerError(
          err?.message || "تعذر حفظ بيانات رئيس الحزب. يرجى مراجعة الحقول وإعادة المحاولة."
        );
      }
    } finally {
      setLocalSubmitting(false);
    }
  };

  const isEditing = Boolean(president?.id);
  const busy = isSubmitting || localSubmitting;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(serverError);
  const hasPhoto = Boolean(photoUrl && photoUrl.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="president-edit-modal-title"
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
            <Crown className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="president-edit-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {isEditing ? "تعديل بيانات رئيس الحزب" : "إضافة وتحديد رئيس الحزب"}
            </h2>
            <p className="text-xs text-slate-500">
              إدارة الصورة والاسم والصفة لرئيس الحزب بالصفحة الرئيسية
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {hasErrors && (
          <div
            className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 flex items-start gap-2.5 animate-in fade-in duration-200"
            role="alert"
          >
            <AlertCircle className="size-4.5 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <span className="font-bold block">
                {serverError || "تنبيه: يوجد حقول بحاجة إلى استكمال أو تعديل:"}
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-red-700 font-medium">
                {errors.fullName && <li>{errors.fullName}</li>}
                {errors.photoUrl && <li>{errors.photoUrl}</li>}
                {errors.roleTitle && <li>{errors.roleTitle}</li>}
                {errors.badgeLabel && <li>{errors.badgeLabel}</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Informative Guidance Banner (when no errors) */}
        {!hasErrors && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
            <span>
              <strong>تعليمات:</strong> يُرجى التأكد من كتابة الاسم الرسمي ورفع صورة رسمية واضحة؛ حيث يظهر رئيس الحزب مباشرة في أعلى العمود الثاني بالموقع.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4.5" noValidate>
          {/* Full Name Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="president-fullname" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>اسم رئيس الحزب بالكامل</span>
                <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[11px] font-medium ${
                  fullName.trim().length > 200 ? "text-red-600 font-bold" : "text-slate-400"
                }`}
              >
                {fullName.trim().length} / 200
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              الاسم الرسمي مع اللقب (مثال: المستشار / فلان الفلاني)، يظهر كعنوان رئيسي للبطاقة.
            </p>
            <input
              ref={initialInputRef}
              id="president-fullname"
              type="text"
              value={fullName}
              onChange={(e) => handleFieldChange("fullName", setFullName, e.target.value)}
              disabled={busy}
              maxLength={200}
              placeholder="اكتب اسم رئيس الحزب هنا..."
              className={`w-full h-11 rounded-2xl border px-4 text-sm font-semibold transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                errors.fullName
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
              }`}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "president-fullname-error" : undefined}
            />
            {errors.fullName && (
              <p id="president-fullname-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Role Title Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="president-role" className="text-xs font-bold text-slate-800">
                الصفة الحزبية / المسمى القيادي
              </label>
              <span
                className={`text-[11px] font-medium ${
                  roleTitle.trim().length > 200 ? "text-red-600 font-bold" : "text-slate-400"
                }`}
              >
                {roleTitle.trim().length} / 200
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              المسمى المعروض أسفل الاسم في الموقع (القيمة الافتراضية: «رئيس الحزب»).
            </p>
            <input
              id="president-role"
              type="text"
              value={roleTitle}
              onChange={(e) => handleFieldChange("roleTitle", setRoleTitle, e.target.value)}
              disabled={busy}
              maxLength={200}
              placeholder="مثال: رئيس الحزب"
              className={`w-full h-11 rounded-2xl border px-4 text-sm transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                errors.roleTitle
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
              }`}
              aria-invalid={Boolean(errors.roleTitle)}
              aria-describedby={errors.roleTitle ? "president-role-error" : undefined}
            />
            {errors.roleTitle && (
              <p id="president-role-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.roleTitle}</span>
              </p>
            )}
          </div>

          {/* Badge Label Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="president-badge" className="text-xs font-bold text-slate-800">
                الشارة التكريمية (اختياري)
              </label>
              <span
                className={`text-[11px] font-medium ${
                  badgeLabel.trim().length > 50 ? "text-red-600 font-bold" : "text-slate-400"
                }`}
              >
                {badgeLabel.trim().length} / 50
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              شارة بارزة تظهر بجانب الصفة (مثال: «المؤسس» أو «رئيس الهيئة العليا»).
            </p>
            <input
              id="president-badge"
              type="text"
              value={badgeLabel}
              onChange={(e) => handleFieldChange("badgeLabel", setBadgeLabel, e.target.value)}
              disabled={busy}
              maxLength={50}
              placeholder="مثال: المؤسس"
              className={`w-full h-11 rounded-2xl border px-4 text-sm transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 ${
                errors.badgeLabel
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
              }`}
              aria-invalid={Boolean(errors.badgeLabel)}
              aria-describedby={errors.badgeLabel ? "president-badge-error" : undefined}
            />
            {errors.badgeLabel && (
              <p id="president-badge-error" className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.badgeLabel}</span>
              </p>
            )}
          </div>

          {/* Photo Upload Section with Explicit Requirement Notice */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ImageIcon className="size-4 text-gold-darker" aria-hidden="true" />
                <span>الصورة الشخصية الرسمية</span>
                <span className="text-red-500">*</span>
              </div>

              {hasPhoto ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  <span>تم رفع الصورة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <HelpCircle className="size-3" aria-hidden="true" />
                  <span>مطلوب رفع صورة</span>
                </span>
              )}
            </div>

            {/* Photo missing warning banner */}
            {!hasPhoto && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span>
                  <strong>تنبيه:</strong> يلزم رفع صورة شخصية لرئيس الحزب لتكتمل بطاقة العرض بالصفحة الرئيسية.
                </span>
              </div>
            )}

            <div
              className={`rounded-2xl transition-all ${
                errors.photoUrl
                  ? "p-2 border-2 border-red-400 bg-red-50/20"
                  : ""
              }`}
            >
              <ImageUploadField
                id="president-photo-upload"
                value={photoUrl}
                onChange={(url) => handleFieldChange("photoUrl", setPhotoUrl, url || "")}
                disabled={busy}
                label=""
                hint="الصيغ المدعومة: JPG، PNG، WebP (حجم أقصى 5 ميجابايت). تظهر بدقة كصورة مربعة بارزة لرئيس الحزب."
              />
            </div>

            {errors.photoUrl && (
              <p className="text-xs text-red-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.photoUrl}</span>
              </p>
            )}
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
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
