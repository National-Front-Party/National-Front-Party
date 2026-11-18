"use client";

import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";

export default function AuditLogPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجل التدقيق"
        description="سجل العمليات والأنشطة الأمنية والإدارية في النظام"
      />

      <EmptyState
        icon={() => <NavIcon name="audit-log" className="size-8" />}
        title="سجل التدقيق (قريباً)"
        description="يجري تطوير واجهة استعراض وتدقيق سجل العمليات ضمن المراحل القادمة."
      />
    </div>
  );
}
