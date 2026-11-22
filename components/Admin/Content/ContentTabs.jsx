"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const CONTENT_TABS = Object.freeze([
  {
    id: "central-secretariats",
    label: "الأمانات المركزية",
    description: "الأمانات المركزية وتشكيلاتها وكوادرها",
    icon: (
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "governorate-secretariats",
    label: "أمانات المحافظات",
    description: "أمناء المحافظات والمكاتب الإقليمية",
    icon: (
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
      </svg>
    ),
  },
  {
    id: "parliamentary-unit",
    label: "الهيئة البرلمانية",
    description: "نواب وشيوخ الحزب والمكتب البرلماني",
    icon: (
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="3" y1="22" x2="21" y2="22" />
        <line x1="6" y1="18" x2="6" y2="11" />
        <line x1="10" y1="18" x2="10" y2="11" />
        <line x1="14" y1="18" x2="14" y2="11" />
        <line x1="18" y1="18" x2="18" y2="11" />
        <polygon points="12 2 20 7 4 7" />
      </svg>
    ),
  },
  {
    id: "leadership",
    label: "قيادات الحزب",
    description: "اللجان القيادية والكوادر المركزية",
    icon: (
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: "decisions",
    label: "القرارات والبيانات",
    description: "القرارات القيادية وبيانات الحزب الرسمية",
    icon: (
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "popups",
    label: "محتوى الصفحة الرئيسية",
    description: "عناصر ومحتوى الصفحة الرئيسية والنوافذ التعريفية",
    icon: (
      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="18" height="14" x="3" y="5" rx="2" />
        <path d="M21 9H3" />
        <path d="M7 13h2" />
      </svg>
    ),
  },
]);

export const DEFAULT_CONTENT_TAB = "central-secretariats";
export const VALID_TAB_IDS = Object.freeze(
  new Set(CONTENT_TABS.map((t) => t.id)),
);

export default function ContentTabs({
  activeTab: controlledActiveTab,
  onChange,
  counts = {},
  className = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabListRef = useRef(null);

  // Validate controlled activeTab and query param against VALID_TAB_IDS
  const isValidControlledTab =
    controlledActiveTab && VALID_TAB_IDS.has(controlledActiveTab);
  const currentQueryTab = searchParams.get("tab");
  const isValidQueryTab =
    currentQueryTab && VALID_TAB_IDS.has(currentQueryTab);

  const activeTabId = isValidControlledTab
    ? controlledActiveTab
    : isValidQueryTab
    ? currentQueryTab
    : DEFAULT_CONTENT_TAB;

  // Safe URL synchronization: normalize missing or invalid ?tab= param without navigation loops
  useEffect(() => {
    // If active tab is controlled externally via props, do not alter URL autonomously
    if (controlledActiveTab) return;

    const rawTab = searchParams.get("tab");
    if (!rawTab || !VALID_TAB_IDS.has(rawTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", DEFAULT_CONTENT_TAB);
      const targetQuery = params.toString();
      const currentQuery = searchParams.toString();

      // Guard condition: only replace if the query string actually changed
      if (targetQuery !== currentQuery) {
        router.replace(`${pathname}?${targetQuery}`, { scroll: false });
      }
    }
  }, [controlledActiveTab, searchParams, pathname, router]);

  // Sync with URL when switching tabs
  const handleSelectTab = useCallback(
    (tabId) => {
      if (!VALID_TAB_IDS.has(tabId)) return;
      if (tabId === activeTabId) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);

      // Push new URL to support browser history (back/forward navigation)
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      onChange?.(tabId);
    },
    [pathname, router, searchParams, onChange, activeTabId],
  );

  // Keyboard navigation for accessible tabs (RTL aware)
  const handleKeyDown = (e, index) => {
    const tabCount = CONTENT_TABS.length;
    let nextIndex = null;

    if (e.key === "ArrowLeft") {
      // In RTL, ArrowLeft moves forward to next tab
      nextIndex = (index + 1) % tabCount;
    } else if (e.key === "ArrowRight") {
      // In RTL, ArrowRight moves backward to previous tab
      nextIndex = (index - 1 + tabCount) % tabCount;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabCount - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = CONTENT_TABS[nextIndex];
      handleSelectTab(nextTab.id);

      // Focus the newly active tab button
      const buttons = tabListRef.current?.querySelectorAll('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  return (
    <div className={`w-full ${className}`} dir="rtl">
      {/* Tab Navigation Container */}
      <div className="rounded-3xl border border-line bg-white p-2 shadow-card">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="أقسام المحتوى التنظيمي"
          className="flex flex-wrap items-center justify-center gap-1.5 py-0.5 px-0.5"
        >
          {CONTENT_TABS.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            const count = counts[tab.id];

            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                title={tab.description}
                className={`group relative flex min-w-0 max-w-full items-center gap-2 rounded-2xl px-2.5 py-3 text-xs font-bold transition-all duration-200 ease-out select-none focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 sm:px-4 sm:text-sm ${
                  isActive
                    ? "bg-gold-gradient text-ink shadow-btn hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0"
                    : "border border-transparent bg-white text-muted hover:border-gold/25 hover:bg-gold-tint/70 hover:text-gold-dark active:scale-[0.98]"
                }`}
              >
                {/* Tab Icon */}
                <span
                  className={`transition-colors duration-200 ${
                    isActive ? "text-ink" : "text-muted/70 group-hover:text-gold-dark"
                  }`}
                  aria-hidden="true"
                >
                  {tab.icon}
                </span>

                {/* Tab Label */}
                <span>{tab.label}</span>

                {/* Optional Count Badge */}
                {typeof count === "number" && (
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-line/60 text-muted group-hover:bg-gold-tint group-hover:text-gold-dark"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
