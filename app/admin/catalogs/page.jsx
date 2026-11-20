"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function CatalogsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الوزارات والقطاعات"
        description="إدارة كتالوج الوزارات والقطاعات الخدمية ومتابعة حالتها"
      />

      <EmptyState
        icon={() => <NavIcon name="catalogs" className="size-8" />}
        title="الوزارات والقطاعات (قريباً)"
        description="يجري تطوير واجهات إدارة كتالوج الوزارات والقطاعات ضمن المراحل القادمة."
      />
    </div>
  );
}
