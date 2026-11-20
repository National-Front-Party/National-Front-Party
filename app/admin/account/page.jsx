"use client";

import { useAdminAuth } from "@/lib/admin/auth-context";
import PageHeader from "@/components/Admin/ui/PageHeader";
import Card, { CardHeader, CardTitle, CardDescription } from "@/components/Admin/ui/Card";
import { RoleBadge } from "@/components/Admin/ui/Badge";
import PasswordChangeForm from "@/components/Admin/PasswordChangeForm";

export default function AdminAccountPage() {
  const { user } = useAdminAuth();

  return (
    <div className="space-y-8 max-w-4xl" dir="rtl">
      <PageHeader
        title="حسابي"
        description="إدارة معلوماتك الشخصية وإعدادات أمان حسابك"
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>البيانات الشخصية</CardTitle>
              <CardDescription>معلومات حسابك المسجلة بالنظام</CardDescription>
            </CardHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-line bg-[#FBFBFC] p-4">
                <p className="text-[11px] font-bold text-muted">الاسم الكامل</p>
                <p className="mt-1 text-sm font-bold text-ink">{user?.fullName}</p>
              </div>

              <div className="rounded-2xl border border-line bg-[#FBFBFC] p-4">
                <p className="text-[11px] font-bold text-muted">البريد الإلكتروني</p>
                <p className="mt-1 font-mono text-xs text-ink" dir="ltr">
                  {user?.email}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-[#FBFBFC] p-4">
                <p className="text-[11px] font-bold text-muted">الدور الوظيفي</p>
                <div className="mt-1.5">
                  <RoleBadge role={user?.role} />
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-[#FBFBFC] p-4">
                <p className="text-[11px] font-bold text-muted">حالة الحساب</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-800">نشط</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة المرور</CardTitle>
              <CardDescription>
                يمكنك تحديث كلمة المرور الخاصة بك في أي وقت لتعزيز أمان الحساب
              </CardDescription>
            </CardHeader>

            <div className="pt-2">
              <PasswordChangeForm isForced={false} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
