"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function ContentPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="المحتوى التنظيمي"
        description="إدارة تشكيلات الأمانات، القيادات، الهيئة البرلمانية، والنوافذ المنبثقة"
      />

      <EmptyState
        icon={() => <NavIcon name="content" className="size-8" />}
        title="المحتوى التنظيمي (قريباً)"
        description="يجري تطوير واجهات إدارة الأمانات والقيادات الحزبية ضمن المراحل القادمة."
      />
    </div>
  );
}
