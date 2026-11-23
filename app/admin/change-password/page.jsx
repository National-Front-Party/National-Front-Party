"use client";

import Card, { CardHeader, CardTitle, CardDescription } from "@/components/Admin/ui/Card";
import PasswordChangeForm from "@/components/Admin/PasswordChangeForm";
import { useAdminAuth } from "@/lib/admin/auth-context";

export default function AdminChangePasswordPage() {
  const { user } = useAdminAuth();

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl py-4 sm:py-6" dir="rtl">
      {user?.mustChangePassword && (
        <div
          role="alert"
          className="mb-5 flex min-w-0 items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-medium text-amber-900 shadow-xs sm:mb-6 sm:p-4"
        >
          <svg
            className="mt-0.5 size-5 shrink-0 text-amber-600"
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
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-amber-950">
              تغيير كلمة المرور المؤقتة إلزامي
            </h2>
            <p className="mt-1 leading-relaxed text-amber-800">
              هذا هو تسجيل دخولك الأول أو تم إعادة تعيين كلمة المرور الخاصة بك مؤخراً. لدواعي الأمان، يرجى تعيين كلمة مرور جديدة قوية قبل أن تتمكن من تصفح لوحة التحكم.
            </p>
          </div>
        </div>
      )}

      <Card className="border-t-[6px] border-t-gold shadow-card">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold text-ink sm:text-2xl md:text-3xl">
            تعيين كلمة مرور جديدة
          </CardTitle>
          <CardDescription className="text-sm font-medium text-muted">
            اختر كلمة مرور قوية مكونة من 10 أحرف على الأقل تحتوي على حروف وأرقام.
          </CardDescription>
          <div
            aria-hidden="true"
            className="mt-2 h-1 w-12 rounded-full bg-gold-gradient"
          />
        </CardHeader>

        <div className="pt-2">
          <PasswordChangeForm isForced={Boolean(user?.mustChangePassword)} />
        </div>
      </Card>
    </div>
  );
}
