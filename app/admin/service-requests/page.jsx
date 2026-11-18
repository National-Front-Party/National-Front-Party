"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function ServiceRequestsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="طلبات الخدمات"
        description="متابعة طلبات المواطنين الخدمية الموجهة للوزارات والقطاعات"
      />

      <EmptyState
        icon={() => <NavIcon name="service-requests" className="size-8" />}
        title="طلبات الخدمات (قريباً)"
        description="يجري تطوير واجهة استعراض طلبات المواطنين الخدمية ضمن المراحل القادمة."
      />
    </div>
  );
}
