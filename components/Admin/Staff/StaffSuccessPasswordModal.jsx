"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, ShieldCheck, X } from "lucide-react";
import { useToast } from "@/lib/admin/toast-context";
import { RoleBadge } from "@/components/Admin/ui/Badge";

export default function StaffSuccessPasswordModal({
  isOpen,
  onClose,
  staffMember,
  password,
  actionType = "create",
}) {
  const { showSuccess, showError } = useToast();
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !staffMember || !password) return null;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(password)
      .then(() => {
        setCopied(true);
        showSuccess("تم نسخ كلمة المرور المؤقتة إلى الحافظة بنجاح");
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        showError("تعذر نسخ كلمة المرور");
      });
  };

  const isReset = actionType === "reset";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
              <ShieldCheck className="size-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">
                {isReset ? "تم إعادة تعيين كلمة المرور بنجاح" : "تم إنشاء حساب الموظف بنجاح"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                بيانات الدخول المؤقتة لحساب الموظف
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink active:scale-95 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Staff Info Card */}
          <div className="rounded-2xl border border-line bg-page/70 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted">اسم الموظف:</span>
              <span className="font-bold text-ink text-sm">{staffMember.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">البريد الإلكتروني:</span>
              <span className="font-mono font-medium text-ink dir-ltr">{staffMember.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">الدور الوظيفي:</span>
              <RoleBadge role={staffMember.role} />
            </div>
          </div>

          {/* Generated Temporary Password Box */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-ink mb-2">
              كلمة المرور المؤقتة المعتمدة
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                readOnly
                value={password}
                className="h-14 w-full rounded-2xl border border-gold/50 bg-gold-tint/30 pr-4 pl-24 font-mono text-sm sm:text-base font-bold text-ink shadow-2xs select-all text-left"
                style={{ direction: "ltr" }}
              />

              <div className="absolute left-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex size-9 items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-white/80 transition-all cursor-pointer"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex size-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                    copied
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-line bg-white text-ink hover:border-gold hover:bg-gold-tint"
                  }`}
                  title="نسخ كلمة المرور"
                >
                  {copied ? <Check className="size-4 text-emerald-700" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Security Alert Note */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 leading-relaxed font-medium space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <span>⚠️ تنبيه أمني هام للمسؤول:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1 pr-1 text-[11px] sm:text-xs">
              <li>
                يرجى مشاركة كلمة المرور هذه مع الموظف عبر قناة آمنة.
              </li>
              <li>
                النظام يُلزم الموظف تلقائياً بتغيير كلمة المرور المؤقتة فور أول تسجيل دخول.
              </li>
              <li>
                <strong>لن يتم عرض أو حفظ كلمة المرور المؤقتة مجدداً</strong> بعد إغلاق هذه النافذة حفاظاً على خصوصية وأمان الحساب.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-white px-5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/40 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? <Check className="size-4 text-emerald-700" /> : <Copy className="size-4" />}
            <span>{copied ? "تم النسخ" : "نسخ كلمة المرور"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-2xl bg-gold-gradient text-xs font-black text-ink shadow-btn hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            إغلاق ومتابعة
          </button>
        </div>
      </div>
    </div>
  );
}
