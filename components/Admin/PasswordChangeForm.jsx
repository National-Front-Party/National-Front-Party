"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, ApiError } from "@/lib/admin/api";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useToast } from "@/lib/admin/toast-context";
import Field from "./ui/Field";
import Button from "./ui/Button";

function RuleCheck({ valid, label }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded-full transition-colors ${
          valid ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-muted"
        }`}
      >
        {valid ? (
          <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className="size-1 rounded-full bg-muted" />
        )}
      </span>
      <span className={valid ? "font-medium text-emerald-800" : "text-muted"}>
        {label}
      </span>
    </li>
  );
}

export default function PasswordChangeForm({ isForced = false, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { refresh } = useAdminAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const formId = useId();

  // Password rules validation
  const hasLength = newPassword.length >= 10;
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isFormValid = hasLength && hasLetter && hasNumber && isMatch && Boolean(currentPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    const nextErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = "يرجى إدخال كلمة المرور الحالية";
    }

    if (!hasLength || !hasLetter || !hasNumber) {
      nextErrors.newPassword = "يجب أن تستوفي كلمة المرور كافة الشروط الأمنية";
    }

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "كلمتا المرور غير متطابقتين";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await adminFetch("/api/admin/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });

      setIsSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showSuccess("تم تغيير كلمة المرور بنجاح");
      await refresh();

      if (onSuccess) {
        onSuccess();
      }

      if (isForced) {
        router.push("/admin");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_CURRENT_PASSWORD") {
          setErrors({ currentPassword: err.message });
        } else if (err.code === "PASSWORD_NOT_CHANGED") {
          setErrors({ newPassword: err.message });
        } else if (err.code === "WEAK_PASSWORD") {
          setErrors({ newPassword: err.message });
        } else if (err.issues) {
          const fieldMap = {};
          for (const [key, msgs] of Object.entries(err.issues)) {
            fieldMap[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
          }
          setErrors(fieldMap);
        } else {
          setGeneralError(err.message);
          showError(err.message);
        }
      } else {
        const msg = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";
        setGeneralError(msg);
        showError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {generalError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800"
        >
          <svg
            className="size-4 shrink-0 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{generalError}</span>
        </div>
      )}

      {isSuccess && !isForced && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"
        >
          <svg
            className="size-4 shrink-0 text-emerald-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>تم تحديث كلمة المرور بنجاح.</span>
        </div>
      )}

      <Field
        id={`${formId}-current-password`}
        name="currentPassword"
        type="password"
        label="كلمة المرور الحالية"
        required
        autoComplete="current-password"
        placeholder="أدخل كلمة المرور الحالية"
        value={currentPassword}
        onChange={(e) => {
          setCurrentPassword(e.target.value);
          if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: null }));
        }}
        error={errors.currentPassword}
        disabled={isSubmitting}
      />

      <Field
        id={`${formId}-new-password`}
        name="newPassword"
        type="password"
        label="كلمة المرور الجديدة"
        required
        autoComplete="new-password"
        placeholder="10 أحرف على الأقل، تتضمن حروفاً وأرقاماً"
        value={newPassword}
        onChange={(e) => {
          setNewPassword(e.target.value);
          if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
        }}
        error={errors.newPassword}
        disabled={isSubmitting}
      />

      {/* Live Password Strength Checklist */}
      <div className="rounded-2xl border border-[#E7E9EE] bg-[#FBFBFC] p-3.5">
        <p className="mb-2 text-[11px] font-bold text-ink">شروط كلمة المرور:</p>
        <ul className="space-y-1.5" aria-live="polite">
          <RuleCheck valid={hasLength} label="10 أحرف أو أكثر" />
          <RuleCheck valid={hasLetter} label="تحتوي على حرف واحد على الأقل" />
          <RuleCheck valid={hasNumber} label="تحتوي على رقم واحد على الأقل" />
          <RuleCheck valid={isMatch} label="تطابق كلمتي المرور" />
        </ul>
      </div>

      <Field
        id={`${formId}-confirm-password`}
        name="confirmPassword"
        type="password"
        label="تأكيد كلمة المرور الجديدة"
        required
        autoComplete="new-password"
        placeholder="أعد إدخال كلمة المرور الجديدة"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
        }}
        error={errors.confirmPassword}
        disabled={isSubmitting}
      />

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full sm:w-auto min-w-40"
          loading={isSubmitting}
          loadingText="جارٍ الحفظ..."
          disabled={!isFormValid || isSubmitting}
        >
          {isForced ? "تحديث كلمة المرور ومتابعة الدخول" : "تحديث كلمة المرور"}
        </Button>
      </div>
    </form>
  );
}
