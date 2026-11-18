"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function NewsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الأخبار والمقالات"
        description="تحرير ومراجعة ونشر الأخوار والمقالات الصحفية للحزب"
      />

      <EmptyState
        icon={() => <NavIcon name="news" className="size-8" />}
        title="إدارة الأخبار (قريباً)"
        description="يجري تطوير نظام التحرير والمراجعة والنشر الصحفي ضمن المراحل القادمة."
      />
    </div>
  );
}
