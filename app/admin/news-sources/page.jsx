"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function NewsSourcesPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="مصادر الأخبار"
        description="إدارة الصحف والمصادر الإعلامية المعتمدة لتوثيق الأخبار"
      />

      <EmptyState
        icon={() => <NavIcon name="news-sources" className="size-8" />}
        title="مصادر الأخبار (قريباً)"
        description="يجري تطوير واجهة إدارة مصادر الأخبار المعتمدة ضمن المراحل القادمة."
      />
    </div>
  );
}
