"use client";

import { Suspense } from "react";
import PageHeader from "@/components/Admin/ui/PageHeader";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { NavIcon } from "@/components/Admin/AdminIcons";
import ContentTabs, {
  CONTENT_TABS,
  DEFAULT_CONTENT_TAB,
  VALID_TAB_IDS,
} from "@/components/Admin/Content/ContentTabs";
import Skeleton from "@/components/Admin/ui/Skeleton";
import PartyProgramManager from "@/components/Admin/Content/PartyProgram/PartyProgramManager";
import HomepagePopupsManager from "@/components/Admin/Content/Popups/HomepagePopupsManager";
import PartyLeadershipManager from "@/components/Admin/Content/Leadership/PartyLeadershipManager";
import CentralSecretariatsManager from "@/components/Admin/Content/CentralSecretariats/CentralSecretariatsManager";
import { useSearchParams } from "next/navigation";

function ContentPageBody() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTabId =
    rawTab && VALID_TAB_IDS.has(rawTab) ? rawTab : DEFAULT_CONTENT_TAB;

  return (
    <div className="space-y-10">
      {/* Homepage Content Section: Party Program Manager */}
      <section aria-labelledby="party-program-section-title">
        <PartyProgramManager />
      </section>

      {/* Organizational Content Tabs Navigation & Panels */}
      <section
        aria-labelledby="organizational-tabs-title"
        className="space-y-6 pt-6 border-t border-slate-200/80"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="organizational-tabs-title"
            className="text-lg font-bold text-slate-800"
          >
            التشكيلات والهياكل التنظيمية
          </h2>
          <p className="text-xs text-slate-500">
            إدارة تشكيلات الأمانات المركزية والمحافظات، الهيئة البرلمانية، القيادات، والنوافذ المنبثقة
          </p>
        </div>

        {/* Shared Tabs Navigation */}
        <ContentTabs />

        {/* Render all six tabpanels so every tab's aria-controls references an existing element */}
        {CONTENT_TABS.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`tabpanel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              hidden={!isActive}
              className={`w-full focus:outline-hidden ${!isActive ? "hidden" : ""}`}
            >
              {tab.id === "popups" ? (
                <HomepagePopupsManager />
              ) : tab.id === "leadership" ? (
                <PartyLeadershipManager />
              ) : tab.id === "central-secretariats" ? (
                <CentralSecretariatsManager />
              ) : (
                <EmptyState
                  icon={() => <NavIcon name="content" className="size-8" />}
                  title={`${tab.label} (قريباً)`}
                  description={`يجري تطوير واجهات إدارة «${tab.label}» ضمن المراحل القادمة.`}
                />
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default function ContentPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة المحتوى"
        description="إدارة محتوى بطاقات الموقع والصفحة الرئيسية، والتشكيلات والأقسام التنظيمية"
      />

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-3xl" />}>
        <ContentPageBody />
      </Suspense>
    </div>
  );
}
