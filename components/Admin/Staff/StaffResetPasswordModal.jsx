"use client";

import { useState, useEffect } from "react";
import { KeyRound, RefreshCw, Eye, EyeOff, AlertCircle, X } from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import { RoleBadge } from "@/components/Admin/ui/Badge";
import { generateTemporaryPassword } from "@/lib/admin/staff-utils";

export default function StaffResetPasswordModal({
  isOpen,
  onClose,
  staffMember,
  onSuccess,
}) {
  const { showError } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword(generateTemporaryPassword());
      setShowPassword(false);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !staffMember) return null;

  const handleRegenerate = () => {
    setPassword(generateTemporaryPassword());
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = password.trim();
    if (!trimmed) {
      setError("كلمة المرور المؤقتة مطلوبة");
      return;
    }
    if (trimmed.length < 10) {
      setError("كلمة المرور يجب أن تتكون من 10 أحرف على الأقل");
      return;
    }
    if (!/\p{L}/u.test(trimmed)) {
      setError("كلمة المرور يجب أن تحتوي على حرف واحد على الأقل");
      return;
    }
    if (!/\d/.test(trimmed)) {
      setError("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/staff/${staffMember.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ temporary_password: trimmed }),
      });

      onSuccess(res.staff, trimmed);
    } catch (err) {
      if (err.code === "WEAK_PASSWORD") {
        setError("كلمة المرور ضعيفة: يجب ألا تقل عن 10 أحرف وتشمل حرفاً ورقماً.");
      } else if (err.code === "NOT_FOUND") {
        showError("حساب الموظف غير موجود أو تم حذفه.");
        onClose();
      } else {
        showError(err.message || "تعذر إعادة تعيين كلمة المرور");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      dir="rtl"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
              <KeyRound className="size-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">
                إعادة تعيين كلمة المرور
              </h2>
              <p className="text-xs text-muted mt-0.5">
                توليد كلمة مرور مؤقتة جديدة لحساب الموظف
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Staff Summary */}
          <div className="rounded-2xl border border-line bg-page/70 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted">الموظف:</span>
              <span className="font-bold text-ink text-sm">{staffMember.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">البريد الإلكتروني:</span>
              <span className="font-mono text-ink dir-ltr">{staffMember.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">الدور الحالي:</span>
              <RoleBadge role={staffMember.role} />
            </div>
          </div>

          {/* Password Field with Regenerate & Show/Hide */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-ink">
                كلمة المرور المؤقتة الجديدة <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-dark hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" />
                <span>توليد كلمة أخرى</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={submitting}
                className="h-14 w-full rounded-2xl border border-border bg-white pr-4 pl-14 font-mono text-sm sm:text-base font-bold text-ink shadow-none transition-all hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] text-left disabled:opacity-50"
                style={{ direction: "ltr" }}
                maxLength={128}
              />

              <div className="absolute left-2.5 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex size-9 items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-page transition-all cursor-pointer"
                  title={showPassword ? "إخفاء" : "إظهار"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-elem-fade-up">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <p className="text-[11px] text-muted/80 mt-1.5 mr-1">
              يجب أن لا تقل عن 10 أحرف وتحتوي على حرف ورقم على الأقل.
            </p>
          </div>

          {/* Workflow Warning */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-bold">⚠️ ما الذي سيحدث بعد الضغط على تأكيد؟</p>
            <p className="text-[11px] sm:text-xs text-amber-800">
              سيتم استبدال كلمة مرور الموظف فوراً بكلمة المرور المؤقتة أعلاه، وسيُجبر الموظف على تعيين كلمة مرور جديدة خاصة به فور تسجيل دخوله القادم.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 px-5 sm:px-7 py-3.5 sm:py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 px-5 rounded-2xl border border-line bg-white text-xs font-bold text-muted hover:border-gold hover:text-ink active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-600 px-6 text-xs font-bold text-white shadow-btn hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Spinner size="sm" color="white" />}
            <span>تأكيد إعادة التعيين</span>
          </button>
        </div>
      </form>
    </div>
  );
}
