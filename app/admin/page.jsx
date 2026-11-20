"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/lib/admin/auth-context";
import {
  canAccess,
  getRoleLabel,
  SECTIONS,
} from "@/lib/admin/permissions";
import { adminFetch } from "@/lib/admin/api";
import { NavIcon } from "@/components/Admin/AdminIcons";
import Skeleton from "@/components/Admin/ui/Skeleton";

// Convert numbers to Arabic-Indic digits
function toArabicDigits(num) {
  if (num === null || num === undefined) return "٠";
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// Arabic relative time helper
function formatRelativeTime(dateString) {
  if (!dateString) return "مؤخراً";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "الآن";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (diffInMinutes === 1) return "منذ دقيقة";
    if (diffInMinutes === 2) return "منذ دقيقتين";
    if (diffInMinutes <= 10) return `منذ ${toArabicDigits(diffInMinutes)} دقائق`;
    return `منذ ${toArabicDigits(diffInMinutes)} دقيقة`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (diffInHours === 1) return "منذ ساعة";
    if (diffInHours === 2) return "منذ ساعتين";
    if (diffInHours <= 10) return `منذ ${toArabicDigits(diffInHours)} ساعات`;
    return `منذ ${toArabicDigits(diffInHours)} ساعة`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "أمس";
  if (diffInDays === 2) return "منذ يومين";
  if (diffInDays <= 10) return `منذ ${toArabicDigits(diffInDays)} أيام`;
  return `منذ ${toArabicDigits(diffInDays)} يوماً`;
}

// Formatted Arabic date for hero header
function getTodayArabicDate() {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

// Animated count-up hook
function useCountUp(targetValue, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (targetValue === null || targetValue === undefined || isNaN(targetValue)) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      animationFrameId = requestAnimationFrame(() => {
        setCount(targetValue);
      });
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }

    let startTime = null;
    let animationFrameId;

    const easeOutQuad = (t) => t * (2 - t);

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutQuad(progress);
      setCount(Math.floor(easedProgress * targetValue));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  return count;
}

// Stat Card component with count-up animation and gold sparkline wave (matching mockup)
function StatCard({ title, value, icon, delay, loading, sparklinePath }) {
  const animatedValue = useCountUp(loading ? 0 : value ?? 0);

  return (
    <div
      className="group relative flex flex-col justify-between rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-card-hover animate-elem-fade-up motion-reduce:animate-none motion-reduce:transform-none"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs sm:text-sm font-bold text-muted">{title}</span>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark transition-all duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:text-white shadow-2xs">
          <NavIcon name={icon} className="size-5" />
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        {/* Golden Sparkline Wave from mockup */}
        <div className="shrink-0 pb-1 opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105">
          <svg viewBox="0 0 130 30" className="h-6 w-24 sm:w-28 overflow-visible" fill="none">
            <path
              d={sparklinePath}
              stroke="#C9A24B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Real Big Number Count */}
        <div className="min-w-0 text-left">
          {loading ? (
            <Skeleton width="50px" height="34px" rounded="rounded-xl" />
          ) : (
            <p className="text-3xl sm:text-[34px] font-black text-ink tracking-tight leading-none">
              {value === null || value === undefined ? "—" : toArabicDigits(animatedValue)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Status configuration mapping
const STATUS_CONFIG_MAP = {
  new: { label: "جديد", tone: "bg-sky-50 text-sky-800 border-sky-200" },
  under_review: { label: "قيد المراجعة", tone: "bg-gold-tint text-gold-dark border-gold/30" },
  in_progress: { label: "قيد المراجعة", tone: "bg-gold-tint text-gold-dark border-gold/30" },
  accepted: { label: "مقبول", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  completed: { label: "مقبول", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  rejected: { label: "مرفوض", tone: "bg-rose-50 text-rose-800 border-rose-200" },
  closed: { label: "مرفوض", tone: "bg-rose-50 text-rose-800 border-rose-200" },
};

// Application kind label mapping
const APP_KIND_LABELS = {
  member: "عضوية عاملة",
  volunteer: "عمل تطوعي",
  follower: "مناصرة ومتابعة",
};

export default function AdminOverviewPage() {
  const { user } = useAdminAuth();
  const [loading, setLoading] = useState(true);

  // Stats state from real APIs
  const [stats, setStats] = useState({
    applicationsTotal: null,
    serviceRequestsTotal: null,
    publishedNewsTotal: null,
    staffTotal: null,
  });

  // Recent requests state
  const [recentRequests, setRecentRequests] = useState([]);
  const [completionRate, setCompletionRate] = useState(null);

  // Fetch real data from available endpoints based on permissions
  useEffect(() => {
    if (!user?.role) return;

    let mounted = true;
    const loadDashboardData = async () => {
      setLoading(true);

      const nextStats = {
        applicationsTotal: null,
        serviceRequestsTotal: null,
        publishedNewsTotal: null,
        staffTotal: null,
      };

      const requestsList = [];
      let acceptedApps = 0;
      let completedSrv = 0;

      // 1. Applications API
      if (canAccess(user.role, "applications")) {
        try {
          const appRes = await adminFetch(
            "/api/admin/applications?page=1&page_size=6",
            { skipAuthRedirect: true },
          );
          const totalApps = appRes?.pagination?.total ?? appRes?.total;
          if (typeof totalApps === "number") {
            nextStats.applicationsTotal = totalApps;
          }
          if (Array.isArray(appRes?.applications)) {
            appRes.applications.forEach((app) => {
              requestsList.push({
                id: `app-${app.id}`,
                name: app.full_name,
                type: APP_KIND_LABELS[app.type] || "طلب انضمام",
                status: STATUS_CONFIG_MAP[app.status]?.label || "قيد المراجعة",
                rawStatus: app.status,
                createdAt: app.created_at,
                href: "/admin/applications",
              });
            });
          }

          // Fetch accepted applications count dynamically for completion rate
          if ((nextStats.applicationsTotal || 0) > 0) {
            try {
              const accRes = await adminFetch(
                "/api/admin/applications?status=accepted&page=1&page_size=1",
                { skipAuthRedirect: true },
              );
              const accTotal = accRes?.pagination?.total ?? accRes?.total;
              if (typeof accTotal === "number") {
                acceptedApps = accTotal;
              }
            } catch {
              // Ignore
            }
          }
        } catch {
          // Graceful fallback
        }
      }

      // 2. Service Requests API
      if (canAccess(user.role, "service-requests")) {
        try {
          const srvRes = await adminFetch(
            "/api/admin/service-requests?page=1&page_size=6",
            { skipAuthRedirect: true },
          );
          const totalSrv = srvRes?.pagination?.total ?? srvRes?.total;
          if (typeof totalSrv === "number") {
            nextStats.serviceRequestsTotal = totalSrv;
          }
          if (Array.isArray(srvRes?.service_requests)) {
            srvRes.service_requests.forEach((req) => {
              requestsList.push({
                id: `srv-${req.id}`,
                name: req.full_name,
                type: req.sector?.name_ar || req.ministry?.name_ar || "طلب خدمة مواطن",
                status: STATUS_CONFIG_MAP[req.status]?.label || "قيد المراجعة",
                rawStatus: req.status,
                createdAt: req.created_at,
                href: "/admin/service-requests",
              });
            });
          }

          // Fetch completed service requests count dynamically for completion rate
          if ((nextStats.serviceRequestsTotal || 0) > 0) {
            try {
              const compRes = await adminFetch(
                "/api/admin/service-requests?status=completed&page=1&page_size=1",
                { skipAuthRedirect: true },
              );
              const compTotal = compRes?.pagination?.total ?? compRes?.total;
              if (typeof compTotal === "number") {
                completedSrv = compTotal;
              }
            } catch {
              // Ignore
            }
          }
        } catch {
          // Graceful fallback
        }
      }

      // 3. News Articles API (or public news count)
      if (canAccess(user.role, "news")) {
        try {
          const newsRes = await adminFetch(
            "/api/admin/news/articles?status=published&page=1&page_size=1",
            { skipAuthRedirect: true },
          );
          const totalNews = newsRes?.pagination?.total ?? newsRes?.total;
          if (typeof totalNews === "number") {
            nextStats.publishedNewsTotal = totalNews;
          }
        } catch {
          // Try public content news count if admin news filtered
          try {
            const pubNews = await fetch("/api/content/news?page=1&page_size=1");
            const data = await pubNews.json();
            const pubTotal = data?.pagination?.total ?? data?.total;
            if (typeof pubTotal === "number") {
              nextStats.publishedNewsTotal = pubTotal;
            }
          } catch {
            // Ignore
          }
        }
      }

      // 4. Staff API
      if (canAccess(user.role, "staff")) {
        try {
          const staffRes = await adminFetch(
            "/api/admin/staff?page=1&page_size=1",
            { skipAuthRedirect: true },
          );
          const totalStaff = staffRes?.total ?? staffRes?.pagination?.total;
          if (typeof totalStaff === "number") {
            nextStats.staffTotal = totalStaff;
          }
        } catch {
          // Graceful fallback
        }
      }

      if (mounted) {
        // Sort requests: prioritize pending requests needing review (new, under_review, in_progress),
        // then newest created_at first, and take top 4
        requestsList.sort((a, b) => {
          const isPendingA =
            a.rawStatus === "new" ||
            a.rawStatus === "under_review" ||
            a.rawStatus === "in_progress";
          const isPendingB =
            b.rawStatus === "new" ||
            b.rawStatus === "under_review" ||
            b.rawStatus === "in_progress";
          if (isPendingA && !isPendingB) return -1;
          if (!isPendingA && isPendingB) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setRecentRequests(requestsList.slice(0, 4));
        setStats(nextStats);

        // Real dynamic completion rate calculated from database: (accepted + completed) / total
        const totalCount =
          (nextStats.applicationsTotal || 0) +
          (nextStats.serviceRequestsTotal || 0);
        if (totalCount > 0) {
          const completedCount = acceptedApps + completedSrv;
          const rate = Math.min(
            100,
            Math.max(0, Math.round((completedCount / totalCount) * 100)),
          );
          setCompletionRate(rate);
        } else {
          setCompletionRate(0);
        }

        setLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  // Quick Access Tiles filtered by role permissions
  const quickAccessTiles = useMemo(() => {
    const tileIds = [
      "news",
      "content",
      "catalogs",
      "news-sources",
      "staff",
      "audit-log",
    ];
    return SECTIONS.filter(
      (section) =>
        tileIds.includes(section.id) && canAccess(user?.role, section.id),
    );
  }, [user?.role]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Hero Card: Dark gradient + slow floating blur spheres */}
      <div className="relative overflow-hidden rounded-[26px] border border-[#2E323B] bg-gradient-to-l from-[#15171C] via-[#1C1F26] to-[#22252C] p-6 sm:p-9 text-white shadow-card animate-elem-fade-up motion-reduce:animate-none">
        {/* Floating blurred gold spheres (9s loop, transform only) */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-gold/15 blur-3xl animate-blob-1 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-16 -bottom-16 size-72 rounded-full bg-[#8c6a16]/20 blur-3xl animate-blob-2 motion-reduce:animate-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Right side: Role pill + Greeting + Description */}
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1 text-xs font-bold text-gold-light">
              <span className="size-1.5 rounded-full bg-gold animate-pulse motion-reduce:animate-none" />
              <span>{getRoleLabel(user?.role)}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              أهلاً بك، {user?.fullName || "المستخدم"}
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-on-dark/80 leading-relaxed">
              متابعة الطلبات ونشر المحتوى وإدارة الحزب من مكان واحد.
            </p>
          </div>

          {/* Left side: Date pill + Action buttons */}
          <div className="flex flex-col items-start lg:items-end gap-3.5 shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gold-light backdrop-blur-xs">
              {getTodayArabicDate()}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* + خبر جديد (Gold Primary) */}
              {canAccess(user?.role, "news") && (
                <Link
                  href="/admin/news"
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>خبر جديد</span>
                </Link>
              )}

              {/* مراجعة الطلبات (Transparent Outline) */}
              {canAccess(user?.role, "applications") && (
                <Link
                  href="/admin/applications"
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:bg-white/10 hover:border-white/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <span>مراجعة الطلبات</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Statistics Cards Grid (4 Cards with Count-Up, Real Data and Gold Wave Sparkline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="طلبات الانضمام"
          value={stats.applicationsTotal}
          icon="applications"
          delay={180}
          loading={loading}
          sparklinePath="M 0,22 C 20,24 35,14 55,18 C 75,22 90,8 110,6 C 120,4 125,8 130,5"
        />
        <StatCard
          title="طلبات الخدمات المفتوحة"
          value={stats.serviceRequestsTotal}
          icon="service-requests"
          delay={250}
          loading={loading}
          sparklinePath="M 0,16 C 15,26 30,6 50,18 C 70,30 90,10 110,14 C 120,18 125,10 130,12"
        />
        <StatCard
          title="أخبار منشورة"
          value={stats.publishedNewsTotal}
          icon="news"
          delay={320}
          loading={loading}
          sparklinePath="M 0,25 C 25,25 45,18 70,14 C 95,10 115,5 130,2"
        />
        <StatCard
          title="الموظفون"
          value={stats.staffTotal}
          icon="staff"
          delay={390}
          loading={loading}
          sparklinePath="M 0,22 C 30,22 60,18 90,15 C 110,13 120,11 130,10"
        />
      </div>

      {/* 3. Main Split Section: Requests Needing Review (1.7fr) + Quick Access (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 items-start">
        {/* Requests Needing Review Card */}
        <div
          className="rounded-3xl border border-line bg-white p-4 sm:p-6 lg:p-7 shadow-card animate-elem-fade-up motion-reduce:animate-none"
          style={{ animationDelay: "460ms" }}
        >
          {/* Card Header */}
          <div className="mb-4 sm:mb-5 flex items-center justify-between gap-2 border-b border-line pb-3.5 sm:pb-4">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-ink">
                طلبات تحتاج مراجعتك
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                أحدث الطلبات الواردة من المواطنين عبر الموقع
              </p>
            </div>

            <Link
              href="/admin/applications"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-muted hover:text-gold-dark transition-colors"
            >
              <span>عرض الكل</span>
              <svg className="size-3.5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton width="40px" height="40px" rounded="rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton width="120px" height="16px" rounded="rounded-md" />
                      <Skeleton width="80px" height="12px" rounded="rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <Skeleton width="70px" height="26px" rounded="rounded-lg" />
                    <Skeleton width="60px" height="28px" rounded="rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gold-tint text-gold-dark border border-gold/30">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-bold text-ink">لا توجد طلبات تحتاج مراجعة</p>
              <p className="mt-1 text-xs text-muted">تمت مراجعة جميع الطلبات الواردة بنجاح.</p>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3 py-3 md:py-3.5 transition-colors hover:bg-gold-tint/20 rounded-2xl p-2 md:px-2.5"
                >
                  <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
                    {/* Initials Avatar inside brackets [x] matching mockup */}
                    <div className="flex size-9 md:size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-xs shadow-2xs group-hover:border-gold/40 transition-colors">
                      {req.name ? `[${req.name.trim().charAt(0)}]` : "[م]"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs md:text-sm font-bold text-ink leading-tight">
                        {req.name}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                        <span>{req.type}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(req.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t border-line/40 md:border-t-0">
                    {/* Status Badge */}
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        STATUS_CONFIG_MAP[req.rawStatus]?.tone ||
                        (req.rawStatus === "new"
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-gold-tint text-gold-dark border border-gold/30")
                      }`}
                    >
                      {req.status}
                    </span>

                    {/* Review Button */}
                    <Link
                      href={req.href}
                      className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition-all hover:border-gold hover:bg-gold-tint hover:text-gold-dark group-hover:scale-105 shadow-2xs active:scale-95"
                    >
                      مراجعة
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weekly Progress Bar dynamically calculated from database */}
          <div className="mt-5 sm:mt-6 border-t border-line pt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-muted">نسبة إنجاز الطلبات هذا الأسبوع</span>
              <span className="text-gold-dark font-extrabold">
                [ {completionRate !== null ? `${toArabicDigits(completionRate)}٪` : "٠٪"} ]
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/80">
              <div
                className="h-full rounded-full bg-gold-gradient transition-all duration-1000 ease-out origin-right"
                style={{ width: `${completionRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Access Tiles Card (2x3 Grid) */}
        <div
          className="rounded-3xl border border-line bg-white p-4 sm:p-6 lg:p-7 shadow-card animate-elem-fade-up motion-reduce:animate-none"
          style={{ animationDelay: "530ms" }}
        >
          {/* Card Header */}
          <div className="mb-5 border-b border-line pb-4">
            <h3 className="text-base sm:text-lg font-bold text-ink">وصول سريع</h3>
            <p className="mt-0.5 text-xs text-muted">
              الانتقال المباشر لأهم وحدات النظام
            </p>
          </div>

          {/* 2x3 Grid Tiles (Centered Icon + Label matching mockup) */}
          <div className="grid grid-cols-2 gap-3">
            {quickAccessTiles.map((tile) => (
              <Link
                key={tile.id}
                href={tile.route}
                className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-line bg-[#FAFBFD] p-4 text-center transition-all duration-200 hover:scale-[1.04] hover:border-gold hover:bg-gold-tint/40 hover:shadow-card shadow-2xs"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold-tint text-gold-dark transition-all duration-200 group-hover:scale-110 group-hover:bg-gold group-hover:text-white shadow-2xs">
                  <NavIcon name={tile.icon} className="size-5" />
                </div>
                <span className="truncate text-xs font-bold text-ink transition-colors group-hover:text-gold-dark">
                  {tile.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
