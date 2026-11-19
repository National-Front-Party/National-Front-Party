"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import ServiceRequestDetailsModal from "@/components/Admin/ServiceRequests/ServiceRequestDetailsModal";

// Status configuration
const STATUS_CONFIG = {
  new: {
    label: "جديد",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-600",
  },
  in_progress: {
    label: "قيد المراجعة",
    tone: "bg-gold-tint text-gold-dark border-gold/40",
    dot: "bg-gold",
  },
  completed: {
    label: "مقبول",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  rejected: {
    label: "مرفوض",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
  },
  closed: {
    label: "مرفوض",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
  },
};

// Convert numbers to Arabic-Indic digits
function toArabicDigits(num) {
  if (num === null || num === undefined) return "٠";
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// Format relative time in Arabic
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
  if (diffInDays < 30) {
    if (diffInDays === 1) return "أمس";
    if (diffInDays === 2) return "منذ يومين";
    if (diffInDays <= 10) return `منذ ${toArabicDigits(diffInDays)} أيام`;
    return `منذ ${toArabicDigits(diffInDays)} يوماً`;
  }
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

export default function ServiceRequestsPage() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const role = user?.role;
  const canView = canAccess(role, "service-requests");

  // Data & Pagination
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ministryFilter, setMinistryFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  // Auxiliary catalogs
  const [ministries, setMinistries] = useState([]);
  const [sectors, setSectors] = useState([]);

  // Modal state
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick Action States
  const [quickAcceptTarget, setQuickAcceptTarget] = useState(null);
  const [quickRejectTarget, setQuickRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Load Ministries for filter
  useEffect(() => {
    let mounted = true;
    fetch("/api/ministries")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data?.ministries)) {
          setMinistries(data.ministries);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Load Sectors for filter
  useEffect(() => {
    let mounted = true;
    fetch("/api/request-sectors")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data?.request_sectors)) {
          setSectors(data.request_sectors);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Service Requests
  const fetchRequests = useCallback(
    async (pageToLoad = 1) => {
      if (role && !canAccess(role, "service-requests")) {
        setLoading(false);
        return;
      }
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(pageToLoad));
        queryParams.set("page_size", String(pagination.page_size));

        const trimmed = searchInput.trim();
        if (trimmed) {
          if (/^\d{1,18}$/.test(trimmed)) {
            queryParams.set("phone", trimmed);
          } else {
            queryParams.set("name", trimmed);
          }
        }

        if (statusFilter) queryParams.set("status", statusFilter);
        if (ministryFilter) queryParams.set("ministry_id", ministryFilter);
        if (sectorFilter) queryParams.set("sector_id", sectorFilter);

        const data = await adminFetch(`/api/admin/service-requests?${queryParams.toString()}`);
        setRequests(Array.isArray(data?.service_requests) ? data.service_requests : []);
        if (data?.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        showError(err.message || "تعذر تحميل طلبات الخدمات");
      } finally {
        setLoading(false);
      }
    },
    [
      role,
      pagination.page_size,
      searchInput,
      statusFilter,
      ministryFilter,
      sectorFilter,
      showError,
    ],
  );

  // Fetch on filter changes
  useEffect(() => {
    let mounted = true;
    const queryParams = new URLSearchParams();
    queryParams.set("page", "1");
    queryParams.set("page_size", String(pagination.page_size));

    const trimmed = searchInput.trim();
    if (trimmed) {
      if (/^\d{1,18}$/.test(trimmed)) {
        queryParams.set("phone", trimmed);
      } else {
        queryParams.set("name", trimmed);
      }
    }

    if (statusFilter) queryParams.set("status", statusFilter);
    if (ministryFilter) queryParams.set("ministry_id", ministryFilter);
    if (sectorFilter) queryParams.set("sector_id", sectorFilter);

    adminFetch(`/api/admin/service-requests?${queryParams.toString()}`)
      .then((data) => {
        if (mounted) {
          setRequests(Array.isArray(data?.service_requests) ? data.service_requests : []);
          if (data?.pagination) setPagination(data.pagination);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          showError(err.message || "تعذر تحميل طلبات الخدمات");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    role,
    pagination.page_size,
    searchInput,
    statusFilter,
    ministryFilter,
    sectorFilter,
    showError,
  ]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchRequests(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setLoading(true);
    setSearchInput("");
    setStatusFilter("");
    setMinistryFilter("");
    setSectorFilter("");
  };

  const hasActiveFilters = Boolean(
    searchInput || statusFilter || ministryFilter || sectorFilter,
  );

  // Open Details Modal
  const handleOpenDetails = (reqId) => {
    setSelectedRequestId(reqId);
    setIsModalOpen(true);
  };

  // Quick Action: Start Progress (new -> in_progress)
  const handleStartProgress = async (req) => {
    setActionInProgressId(req.id);
    try {
      await adminFetch(`/api/admin/service-requests/${req.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress" }),
      });
      showSuccess(`تم نقل طلب الخدمة #${req.request_no} إلى قيد المتابعة`);
      setRequests((prev) =>
        prev.map((item) =>
          item.id === req.id ? { ...item, status: "in_progress" } : item,
        ),
      );
    } catch (err) {
      showError(err.message || "تعذر بدء متابعة الطلب");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Quick Action: Confirm Accept / Complete (in_progress -> completed)
  const handleConfirmAccept = async () => {
    if (!quickAcceptTarget) return;
    setActionInProgressId(quickAcceptTarget.id);
    try {
      await adminFetch(`/api/admin/service-requests/${quickAcceptTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      showSuccess(`تم قبول وإنجاز طلب الخدمة #${quickAcceptTarget.request_no} بنجاح`);
      setRequests((prev) =>
        prev.map((item) =>
          item.id === quickAcceptTarget.id ? { ...item, status: "completed" } : item,
        ),
      );
      setQuickAcceptTarget(null);
    } catch (err) {
      showError(err.message || "تعذر قبول الطلب");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Quick Action: Confirm Reject (in_progress -> rejected)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!quickRejectTarget) return;
    const trimmedReason = rejectReason.trim();
    setActionInProgressId(quickRejectTarget.id);
    try {
      await adminFetch(`/api/admin/service-requests/${quickRejectTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected",
          ...(trimmedReason ? { note: trimmedReason } : {}),
        }),
      });
      showSuccess(`تم رفض طلب الخدمة #${quickRejectTarget.request_no}`);
      setRequests((prev) =>
        prev.map((item) =>
          item.id === quickRejectTarget.id ? { ...item, status: "rejected" } : item,
        ),
      );
      setQuickRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      showError(err.message || "تعذر رفض الطلب");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Copy helper
  const handleCopyPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard
      .writeText(phone)
      .then(() => showSuccess("تم نسخ رقم الهاتف بنجاح"))
      .catch(() => showError("تعذر النسخ"));
  };

  // Dropdown options for CustomSelect
  const ministryOptions = useMemo(
    () => [
      { value: "", label: "جميع الوزارات المعنية" },
      ...ministries.map((m) => ({
        value: String(m.id),
        label: m.name_ar,
      })),
    ],
    [ministries],
  );

  const sectorOptions = useMemo(
    () => [
      { value: "", label: "جميع القطاعات الخدمية" },
      ...sectors.map((s) => ({
        value: String(s.id),
        label: s.name_ar,
      })),
    ],
    [sectors],
  );

  // Unauthorized view for users without service-requests permission
  if (user && !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-elem-fade-up" dir="rtl">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs mb-4">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-lg font-black text-ink">غير مصرح لك بالوصول إلى هذا القسم</h2>
        <p className="mt-1 text-xs sm:text-sm text-muted max-w-md">
          قسم متابعة طلبات الخدمات متاح فقط لـ «مدير النظام» و«مسؤول الخدمات».
        </p>
        <Link
          href="/admin"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-ink shadow-btn hover:brightness-110 transition-all"
        >
          <span>العودة للوحة التحكم الرئيسية</span>
          <svg className="size-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Page Header with Title, Count & Description */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-elem-fade-up">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              طلبات الخدمات
            </h1>
            <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
              {toArabicDigits(pagination.total)} طلب
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            متابعة طلبات المواطنين الخدمية الموجهة للوزارات والقطاعات والتنسيق بشأنها
          </p>
        </div>
      </div>

      {/* 2. Status Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] border-b border-line animate-elem-fade-up">
        {[
          { id: "", label: "جميع الحالات" },
          { id: "new", label: "جديد" },
          { id: "in_progress", label: "قيد المراجعة" },
          { id: "completed", label: "مقبول" },
          { id: "rejected", label: "مرفوض" },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setLoading(true);
                setStatusFilter(tab.id);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "bg-gold-tint text-gold-dark border border-gold/40 shadow-xs"
                  : "text-muted hover:bg-page hover:text-ink"
              }`}
            >
              {tab.id && (
                <span
                  className={`size-2 rounded-full ${
                    STATUS_CONFIG[tab.id]?.dot || "bg-muted"
                  }`}
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search and Filters Bar with website form field style */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-card animate-elem-fade-up">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-center">
            {/* Search Input: h-14, rounded-2xl, border-border, focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث باسم المواطن أو رقم الهاتف..."
                className="h-14 w-full rounded-2xl border border-border bg-white pr-4 pl-12 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>

            {/* Ministry Filter: Website CustomSelect */}
            <div>
              <CustomSelect
                id="filter-ministry"
                placeholder="جميع الوزارات المعنية"
                options={ministryOptions}
                value={ministryFilter}
                onChange={(val) => {
                  setLoading(true);
                  setMinistryFilter(val);
                }}
              />
            </div>

            {/* Sector Filter: Website CustomSelect */}
            <div>
              <CustomSelect
                id="filter-sector"
                placeholder="جميع القطاعات الخدمية"
                options={sectorOptions}
                value={sectorFilter}
                onChange={(val) => {
                  setLoading(true);
                  setSectorFilter(val);
                }}
              />
            </div>

            {/* Submit / Reset Actions matching field height h-14 */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 h-14 rounded-2xl bg-gold-gradient px-4 text-xs sm:text-sm font-bold text-ink shadow-btn hover:brightness-110 active:scale-95 transition-all"
              >
                تطبيق البحث
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-14 rounded-2xl border border-border bg-white px-4 text-xs font-bold text-muted hover:border-rose-300 hover:text-rose-600 transition-colors shadow-none"
                  title="إلغاء جميع الفلاتر"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 4. Service Requests Data Table Card */}
      <div className="rounded-3xl border border-line bg-white shadow-card overflow-hidden animate-elem-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                <th className="py-4 px-5">رقم الطلب</th>
                <th className="py-4 px-5">المواطن مقدم الطلب</th>
                <th className="py-4 px-5">رقم الهاتف</th>
                <th className="py-4 px-5">الوزارة المعنية</th>
                <th className="py-4 px-5">القطاع الخدمي</th>
                <th className="py-4 px-5">الحالة</th>
                <th className="py-4 px-5">تاريخ التقديم</th>
                <th className="py-4 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                // Skeletons
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5"><Skeleton width="60px" height="20px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="130px" height="18px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="90px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="120px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="110px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="70px" height="20px" rounded="rounded-full" /></td>
                    <td className="py-4 px-5"><Skeleton width="80px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5 text-center"><Skeleton width="60px" height="28px" rounded="rounded-xl" /></td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
                        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                      <p className="text-sm font-extrabold text-ink">لم يتم العثور على أي طلبات خدمات</p>
                      <p className="text-xs text-muted max-w-sm">
                        {hasActiveFilters
                          ? "لا توجد نتائج تطابق معايير البحث الحالية، جرّب تغيير الفلاتر."
                          : "لم يقم أي مواطن بتقديم طلب خدمة حتى الآن."}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 rounded-xl border border-gold/40 bg-gold-tint px-4 py-2 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs"
                        >
                          إعادة ضبط الفلاتر
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Requests Rows
                requests.map((req) => {
                  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.new;

                  return (
                    <tr
                      key={req.id}
                      className="group transition-colors hover:bg-gold-tint/25"
                    >
                      {/* Request Number */}
                      <td className="py-4 px-5 font-mono font-bold text-ink">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(req.id)}
                          className="hover:text-gold-dark hover:underline focus:outline-none"
                        >
                          #{req.request_no}
                        </button>
                      </td>

                      {/* Citizen Full Name */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-xs shadow-2xs group-hover:border-gold/50 transition-colors">
                            {req.full_name ? req.full_name.trim().charAt(0) : "م"}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(req.id)}
                              className="text-right font-extrabold text-ink group-hover:text-gold-dark transition-colors"
                            >
                              {req.full_name}
                            </button>
                            <span className="block text-[11px] text-muted">
                              طلب رقم #{req.request_no}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone with quick action */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-ink" dir="ltr">
                            {req.phone || "—"}
                          </span>
                          {req.phone && (
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(req.phone)}
                                className="text-[10px] text-gold-dark hover:underline font-bold"
                                title="نسخ رقم الهاتف"
                              >
                                نسخ
                              </button>
                              <a
                                href={`https://wa.me/20${req.phone.replace(/^0/, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 hover:underline font-bold"
                                title="واتساب"
                              >
                                واتساب
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ministry */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 font-bold text-ink text-xs">
                          {req.ministry?.name_ar || "—"}
                        </span>
                      </td>

                      {/* Sector */}
                      <td className="py-4 px-5 text-muted font-medium">
                        {req.request_sector?.name_ar || req.sector?.name_ar || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusCfg.tone}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-5 text-muted text-[11px]">
                        {formatRelativeTime(req.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* If NEW: Quick Start Review */}
                          {req.status === "new" && (
                            <button
                              type="button"
                              disabled={actionInProgressId === req.id}
                              onClick={() => handleStartProgress(req)}
                              className="inline-flex items-center gap-1 rounded-xl border border-gold bg-gold-tint px-2.5 py-1.5 text-[11px] font-bold text-gold-dark hover:bg-gold hover:text-white hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                              title="بدء مراجعة هذا الطلب"
                            >
                              {actionInProgressId === req.id ? (
                                <Spinner size="xs" color="gold" />
                              ) : (
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              )}
                              <span>بدء المراجعة</span>
                            </button>
                          )}

                          {/* If IN_PROGRESS: Quick Accept & Quick Reject */}
                          {req.status === "in_progress" && (
                            <>
                              <button
                                type="button"
                                disabled={actionInProgressId === req.id}
                                onClick={() => setQuickAcceptTarget(req)}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                                title="قبول وإنجاز الطلب"
                              >
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>قبول</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionInProgressId === req.id}
                                onClick={() => {
                                  setQuickRejectTarget(req);
                                  setRejectReason("");
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                                title="رفض الطلب"
                              >
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>رفض</span>
                              </button>
                            </>
                          )}

                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(req.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink transition-all hover:border-gold hover:bg-gold-tint hover:text-gold-dark hover:scale-105 active:scale-95 shadow-2xs"
                          >
                            <span>التفاصيل</span>
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line bg-page/40 px-6 py-4 text-xs font-bold text-muted">
            <div>
              <span>عرض </span>
              <strong className="text-ink">
                {toArabicDigits((pagination.page - 1) * pagination.page_size + 1)}
              </strong>
              <span> إلى </span>
              <strong className="text-ink">
                {toArabicDigits(
                  Math.min(pagination.page * pagination.page_size, pagination.total),
                )}
              </strong>
              <span> من أصل </span>
              <strong className="text-gold-dark">{toArabicDigits(pagination.total)}</strong>
              <span> طلب</span>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => {
                  setLoading(true);
                  fetchRequests(pagination.page - 1);
                }}
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-colors shadow-2xs"
                title="الصفحة السابقة"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <span className="px-3 py-1 rounded-xl bg-white border border-line text-ink font-bold shadow-2xs">
                صفحة {toArabicDigits(pagination.page)} من {toArabicDigits(pagination.total_pages)}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages || loading}
                onClick={() => {
                  setLoading(true);
                  fetchRequests(pagination.page + 1);
                }}
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-colors shadow-2xs"
                title="الصفحة التالية"
              >
                <svg className="size-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Accept Confirmation Modal */}
      {quickAcceptTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-card-hover animate-elem-fade-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">تأكيد قبول وإنجاز طلب الخدمة</h3>
                  <p className="text-xs text-muted">طلب رقم #{quickAcceptTarget.request_no}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickAcceptTarget(null)}
                aria-label="إغلاق"
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95"
              >
                <svg className="size-4.5 transition-transform duration-300 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-ink leading-relaxed">
              هل أنت متأكد من رغبتك في قبول وإتمام طلب الخدمة المقدم من المواطن{" "}
              <strong className="text-gold-dark font-black">
                «{quickAcceptTarget.full_name}»
              </strong>
              ؟
              <span className="block mt-2 text-xs text-muted">
                الوزارة المعنية: {quickAcceptTarget.ministry?.name_ar || "—"} • القطاع: {quickAcceptTarget.request_sector?.name_ar || "—"}
              </span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgressId === quickAcceptTarget.id}
                onClick={() => setQuickAcceptTarget(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={actionInProgressId === quickAcceptTarget.id}
                onClick={handleConfirmAccept}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
              >
                {actionInProgressId === quickAcceptTarget.id ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>تأكيد القبول</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reject Reason Modal */}
      {quickRejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-card-hover animate-elem-fade-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">رفض طلب الخدمة</h3>
                  <p className="text-xs text-muted">طلب رقم #{quickRejectTarget.request_no}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQuickRejectTarget(null);
                  setRejectReason("");
                }}
                aria-label="إغلاق"
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95"
              >
                <svg className="size-4.5 transition-transform duration-300 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <p className="text-xs text-ink">
                يرجى تدوين سبب رفض طلب المواطن{" "}
                <strong className="text-rose-700 font-bold">
                  «{quickRejectTarget.full_name}»
                </strong>{" "}
                (اختياري / للتوثيق الداخلي):
              </p>

              <div>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="سبب الرفض (مثال: عدم توافر الشروط بالوزارة، بيانات غير مكتملة...)"
                  className="w-full rounded-2xl border border-border bg-white p-3.5 text-right text-xs font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={actionInProgressId === quickRejectTarget.id}
                  onClick={() => {
                    setQuickRejectTarget(null);
                    setRejectReason("");
                  }}
                  className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionInProgressId === quickRejectTarget.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
                >
                  {actionInProgressId === quickRejectTarget.id ? (
                    <Spinner size="xs" color="white" />
                  ) : (
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                  <span>تأكيد الرفض</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Details Modal */}
      <ServiceRequestDetailsModal
        requestId={selectedRequestId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequestId(null);
        }}
        onStatusUpdated={() => {
          setLoading(true);
          fetchRequests(pagination.page);
        }}
      />
    </div>
  );
}
