"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, UserCheck, UserX } from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import { RoleBadge } from "@/components/Admin/ui/Badge";

export default function StaffStatusModal({
  isOpen,
  onClose,
  staffMember,
  currentUserId,
  onSuccess,
}) {
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !staffMember) return null;

  const isSelf = staffMember.id === currentUserId;
  const willActivate = !staffMember.is_active;

  const handleToggleStatus = async () => {
    if (isSelf && !willActivate) {
      showError("لا يمكنك تعطيل حسابك الشخصي الحالي.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/staff/${staffMember.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: willActivate }),
      });

      showSuccess(
        willActivate
          ? `تم تفعيل حساب الموظف "${staffMember.full_name}" بنجاح`
          : `تم تعطيل حساب الموظف "${staffMember.full_name}" فورياً`,
      );

      onSuccess(res.staff);
      onClose();
    } catch (err) {
      if (err.code === "LAST_ACTIVE_SUPER_ADMIN") {
        showError(
          "لا يمكن تعطيل هذا الحساب: إنه آخر مدير نظام نشط في النظام، ويجب الحفاظ على مدير نظام واحد نشط على الأقل.",
        );
      } else if (err.code === "NOT_FOUND") {
        showError("حساب الموظف غير موجود أو تم حذفه.");
        onClose();
      } else {
        showError(err.message || "تعذر تعديل حالة حساب الموظف");
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
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 sm:px-6 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 items-center justify-center rounded-2xl border shadow-2xs ${
                willActivate
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {willActivate ? <UserCheck className="size-6" /> : <UserX className="size-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">
                {willActivate ? "تأكيد تفعيل الحساب" : "تأكيد تعطيل الحساب"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                تعديل حالة وصول الموظف إلى لوحة التحكم
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
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

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Target Info */}
          <div className="rounded-2xl border border-line bg-page/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">الموظف:</span>
              <span className="font-bold text-ink text-sm">{staffMember.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">البريد الإلكتروني:</span>
              <span className="font-mono text-ink dir-ltr">{staffMember.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">الدور الوظيفي:</span>
              <RoleBadge role={staffMember.role} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">الحالة الحالية:</span>
              <span
                className={`font-bold ${
                  staffMember.is_active ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {staffMember.is_active ? "نشط حالياً" : "معطل حالياً"}
              </span>
            </div>
          </div>

          {/* Self-deactivation blocking warning */}
          {isSelf && !willActivate ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 leading-relaxed font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-950">
                <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                <span>إجراء غير مسموح:</span>
              </div>
              <p>
                لا يمكنك تعطيل حسابك الشخصي الذي تستخدمه حالياً لتسجيل الدخول. يجب على مدير نظام آخر تنفيذ هذا الإجراء إذا لزم الأمر.
              </p>
            </div>
          ) : willActivate ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 leading-relaxed font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>الأثر الأمني للتفعيل:</span>
              </div>
              <p>
                سيتمكن الموظف فوراً من تسجيل الدخول إلى النظام واستئناف الصلاحيات المرتبطة بدوره الوظيفي.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 leading-relaxed font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-950">
                <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                <span>الأثر الأمني الصارم للتعطيل (فوري ولحظي):</span>
              </div>
              <p>
                سيتم **فوراً** إلغاء أي جلسة عمل نشطة للموظف وطرده من لوحة التحكم، وحظر أي محاولة تسجيل دخول قادمة حتى تتم إعادة تفعيل الحساب من قِبل مدير النظام.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 px-5 sm:px-6 py-3.5 sm:py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-12 px-6 rounded-2xl border border-line bg-page text-xs font-bold text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={submitting || (isSelf && !willActivate)}
            onClick={handleToggleStatus}
            className={`inline-flex h-12 items-center gap-2 rounded-2xl px-7 text-xs font-bold text-white shadow-btn hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              willActivate
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {submitting && <Spinner size="sm" color="white" />}
            <span>{willActivate ? "تأكيد تفعيل الحساب" : "تأكيد تعطيل الحساب"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
