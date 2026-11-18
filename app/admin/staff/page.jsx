"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function StaffPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الموظفون"
        description="إدارة حسابات فريق العمل، الأدوار الوظيفية، والصلاحيات"
      />

      <EmptyState
        icon={() => <NavIcon name="staff" className="size-8" />}
        title="إدارة الموظفين (قريباً)"
        description="يجري تطوير واجهات إدارة حسابات الموظفين والصلاحيات ضمن المراحل القادمة."
      />
    </div>
  );
}
