"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import ApplicationDetailsModal from "@/components/Admin/Applications/ApplicationDetailsModal";
import CustomSelect from "@/components/Home/ui/CustomSelect";

// Type labels
const TYPE_CONFIG = {
  member: { label: "عضوية عاملة", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  volunteer: { label: "متطوع", tone: "bg-purple-50 text-purple-900 border-purple-200" },
  follower: { label: "متابع", tone: "bg-blue-50 text-blue-900 border-blue-200" },
};

// Status labels & styles
const STATUS_CONFIG = {
  new: {
    label: "جديد",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-600",
  },
  under_review: {
    label: "قيد المراجعة",
    tone: "bg-gold-tint text-gold-dark border-gold/40",
    dot: "bg-gold",
  },
  accepted: {
    label: "مقبول",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  rejected: {
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

// Format relative date in Arabic
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

export default function ApplicationsPage() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  // Data & Pagination state
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters state
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [governorateFilter, setGovernorateFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // Auxiliary data
  const [governorates, setGovernorates] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Modal state
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick Action States
  const [quickAcceptTarget, setQuickAcceptTarget] = useState(null);
  const [quickRejectTarget, setQuickRejectTarget] = useState(null);
  const [targetDeleteApp, setTargetDeleteApp] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const role = user?.role;
  const canView = canAccess(role, "applications");
  const canExport = canAccess(role, "applications:export");
  const canUpdate = canAccess(role, "applications:update");

  // Load Governorates
  useEffect(() => {
    let mounted = true;
    fetch("/api/governorates")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data?.governorates)) {
          setGovernorates(data.governorates);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Load Staff list for assignment if user has staff access
  useEffect(() => {
    if (role === "super_admin") {
      adminFetch("/api/admin/staff?page=1&page_size=100")
        .then((data) => {
          if (Array.isArray(data?.staff)) {
            setStaffList(data.staff.filter((s) => s.is_active));
          }
        })
        .catch(() => {});
    }
  }, [role]);

  // Fetch applications list on user action
  const fetchApplications = useCallback(
    async (pageToLoad = 1) => {
      if (role && !canAccess(role, "applications")) {
        setLoading(false);
        return;
      }
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(pageToLoad));
        queryParams.set("page_size", String(pagination.page_size));

        // Detect search type (national_id 14 digits, phone digits, or name)
        const trimmed = searchInput.trim();
        if (trimmed) {
          if (/^\d{14}$/.test(trimmed)) {
            queryParams.set("national_id", trimmed);
          } else if (/^\d{3,11}$/.test(trimmed)) {
            queryParams.set("phone", trimmed);
          } else if (/^\d{1,10}$/.test(trimmed)) {
            queryParams.set("application_no", trimmed);
          } else {
            queryParams.set("name", trimmed);
          }
        }

        if (statusFilter) queryParams.set("status", statusFilter);
        if (typeFilter) queryParams.set("application_type", typeFilter);
        if (governorateFilter) queryParams.set("governorate_id", governorateFilter);
        if (createdFrom) queryParams.set("created_from", createdFrom);
        if (createdTo) queryParams.set("created_to", createdTo);

        const data = await adminFetch(`/api/admin/applications?${queryParams.toString()}`);
        setApplications(Array.isArray(data?.applications) ? data.applications : []);
        if (data?.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        showError(err.message || "تعذر تحميل طلبات الانضمام");
      } finally {
        setLoading(false);
      }
    },
    [
      role,
      pagination.page_size,
      searchInput,
      statusFilter,
      typeFilter,
      governorateFilter,
      createdFrom,
      createdTo,
      showError,
    ],
  );

  // Fetch applications on filter changes via async promise chain
  useEffect(() => {
    let mounted = true;
    const queryParams = new URLSearchParams();
    queryParams.set("page", "1");
    queryParams.set("page_size", String(pagination.page_size));

    const trimmed = searchInput.trim();
    if (trimmed) {
      if (/^\d{14}$/.test(trimmed)) {
        queryParams.set("national_id", trimmed);
      } else if (/^\d{3,11}$/.test(trimmed)) {
        queryParams.set("phone", trimmed);
      } else if (/^\d{1,10}$/.test(trimmed)) {
        queryParams.set("application_no", trimmed);
      } else {
        queryParams.set("name", trimmed);
      }
    }

    if (statusFilter) queryParams.set("status", statusFilter);
    if (typeFilter) queryParams.set("application_type", typeFilter);
    if (governorateFilter) queryParams.set("governorate_id", governorateFilter);
    if (createdFrom) queryParams.set("created_from", createdFrom);
    if (createdTo) queryParams.set("created_to", createdTo);

    adminFetch(`/api/admin/applications?${queryParams.toString()}`)
      .then((data) => {
        if (mounted) {
          setApplications(Array.isArray(data?.applications) ? data.applications : []);
          if (data?.pagination) setPagination(data.pagination);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          showError(err.message || "تعذر تحميل طلبات الانضمام");
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
    typeFilter,
    governorateFilter,
    createdFrom,
    createdTo,
    showError,
  ]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchApplications(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setLoading(true);
    setSearchInput("");
    setStatusFilter("");
    setTypeFilter("");
    setGovernorateFilter("");
    setCreatedFrom("");
    setCreatedTo("");
  };

  const hasActiveFilters = Boolean(
    searchInput ||
      statusFilter ||
      typeFilter ||
      governorateFilter ||
      createdFrom ||
      createdTo,
  );

  // Open Details Modal
  const handleOpenDetails = (appId) => {
    setSelectedAppId(appId);
    setIsModalOpen(true);
  };

  // Quick Action: Start Review (new -> under_review)
  const handleStartReview = async (app) => {
    setActionInProgressId(app.id);
    try {
      await adminFetch(`/api/admin/applications/${app.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "under_review" }),
      });
      showSuccess(`تم نقل الطلب #${app.application_no} إلى قيد المراجعة بنجاح`);
      setApplications((prev) =>
        prev.map((item) =>
          item.id === app.id ? { ...item, status: "under_review" } : item,
        ),
      );
    } catch (err) {
      showError(err.message || "تعذر بدء مراجعة الطلب");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Quick Action: Confirm Accept (under_review -> accepted)
  const handleConfirmAccept = async () => {
    if (!quickAcceptTarget) return;
    setActionInProgressId(quickAcceptTarget.id);
    try {
      const res = await adminFetch(`/api/admin/applications/${quickAcceptTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      });
      if (res?.membership_no) {
        showSuccess(
          `تم قبول الطلب #${quickAcceptTarget.application_no} بنجاح، رقم العضوية المُنشأ: ${res.membership_no}`,
        );
      } else {
        showSuccess(`تم قبول الطلب #${quickAcceptTarget.application_no} بنجاح`);
      }
      setApplications((prev) =>
        prev.map((item) =>
          item.id === quickAcceptTarget.id ? { ...item, status: "accepted" } : item,
        ),
      );
      setQuickAcceptTarget(null);
    } catch (err) {
      showError(err.message || "تعذر قبول الطلب");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Quick Action: Confirm Reject (under_review -> rejected)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!quickRejectTarget) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      showError("يرجى إدخال سبب الرفض");
      return;
    }
    setActionInProgressId(quickRejectTarget.id);
    try {
      await adminFetch(`/api/admin/applications/${quickRejectTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected",
          rejection_reason: trimmedReason,
        }),
      });
      showSuccess(`تم رفض الطلب #${quickRejectTarget.application_no} بنجاح`);
      setApplications((prev) =>
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

  // Handle Application Deletion
  const handleConfirmDeleteApp = async () => {
    if (!targetDeleteApp) return;
    setActionInProgressId(targetDeleteApp.id);
    try {
      await adminFetch(`/api/admin/applications/${targetDeleteApp.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
      });
      showSuccess(`تم حذف طلب الانضمام رقم #${targetDeleteApp.application_no} نهائياً`);
      setApplications((prev) => prev.filter((item) => item.id !== targetDeleteApp.id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setTargetDeleteApp(null);
    } catch (err) {
      showError(err.message || "تعذر حذف طلب الانضمام");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle CSV Export
  const handleExportCSV = async () => {
    if (!canExport || exportLoading) return;
    setExportLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchInput.trim()) queryParams.set("name", searchInput.trim());
      if (statusFilter) queryParams.set("status", statusFilter);
      if (typeFilter) queryParams.set("application_type", typeFilter);
      if (governorateFilter) queryParams.set("governorate_id", governorateFilter);
      if (createdFrom) queryParams.set("created_from", createdFrom);
      if (createdTo) queryParams.set("created_to", createdTo);

      const res = await fetch(`/api/admin/applications/export?${queryParams.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل تصدير ملف الطلبات");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().substring(0, 10);
      a.download = `طلبات_الانضمام_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess("تم تنزيل ملف CSV بنجاح");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تصدير ملف CSV");
    } finally {
      setExportLoading(false);
    }
  };

  // Dropdown options for CustomSelect matching site style
  const typeOptions = useMemo(
    () => [
      { value: "", label: "جميع أنواع الانضمام" },
      { value: "member", label: "عضوية عاملة" },
      { value: "volunteer", label: "متطوع" },
      { value: "follower", label: "متابع" },
    ],
    [],
  );

  const governorateOptions = useMemo(
    () => [
      { value: "", label: "جميع المحافظات" },
      ...governorates.map((gov) => ({
        value: String(gov.id),
        label: gov.name_ar,
      })),
    ],
    [governorates],
  );

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
          قسم طلبات الانضمام متاح فقط لـ «مدير النظام» و«مسؤول العضوية».
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
      {/* 1. Page Header with Title, Badges & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-elem-fade-up">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              طلبات الانضمام
            </h1>
            <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
              {toArabicDigits(pagination.total)} طلب
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            إدارة ومتابعة طلبات العضوية والعمل التطوعي الواردة عبر الموقع
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export CSV Button (Super admin / authorized) */}
          {canExport && (
            <button
              type="button"
              disabled={exportLoading || pagination.total === 0}
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-2xs hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark transition-all duration-200 disabled:opacity-50"
            >
              {exportLoading ? (
                <Spinner size="sm" color="gold" />
              ) : (
                <svg className="size-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              <span>تصدير CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Status Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-page/70 border border-line shadow-2xs [scrollbar-width:none] animate-elem-fade-up">
        {[
          { id: "", label: "جميع الحالات" },
          { id: "new", label: "جديد" },
          { id: "under_review", label: "قيد المراجعة" },
          { id: "accepted", label: "مقبول" },
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
              className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 text-xs font-bold cursor-pointer transition-all duration-300 ease-out active:scale-95 ${
                isActive
                  ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] border border-gold/60 scale-[1.03] hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)]"
                  : "bg-white text-muted border border-line shadow-2xs hover:border-gold/50 hover:text-ink hover:bg-gold-tint/40 hover:shadow-xs hover:scale-105 hover:-translate-y-0.5"
              }`}
            >
              {tab.id && (
                <span
                  className={`size-2.5 rounded-full transition-transform duration-300 group-hover:scale-125 ${
                    isActive
                      ? "ring-2 ring-white/90 " + (STATUS_CONFIG[tab.id]?.dot || "bg-ink")
                      : STATUS_CONFIG[tab.id]?.dot || "bg-muted"
                  }`}
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search and Filters Bar styled identically to the website form */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-card animate-elem-fade-up">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-center">
            {/* Search Input with website form field style: h-14, rounded-2xl, border-border, hover:border-gold, gold focus shadow */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث بالاسم، الرقم القومي أو الهاتف..."
                className="h-14 w-full rounded-2xl border border-border bg-white pr-4 pl-12 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>

            {/* Type Filter: Website CustomSelect */}
            <div>
              <CustomSelect
                id="filter-type"
                placeholder="جميع أنواع الانضمام"
                options={typeOptions}
                value={typeFilter}
                onChange={(val) => {
                  setLoading(true);
                  setTypeFilter(val);
                }}
              />
            </div>

            {/* Governorate Filter: Website CustomSelect with search & portal listbox */}
            <div>
              <CustomSelect
                id="filter-governorate"
                placeholder="جميع المحافظات"
                options={governorateOptions}
                value={governorateFilter}
                onChange={(val) => {
                  setLoading(true);
                  setGovernorateFilter(val);
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

      {/* 4. Applications Data Table Card */}
      <div className="rounded-3xl border border-line bg-white shadow-card overflow-hidden animate-elem-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                <th className="py-4 px-5">رقم الطلب</th>
                <th className="py-4 px-5">مقدم الطلب</th>
                <th className="py-4 px-5">المحافظة</th>
                <th className="py-4 px-5">النوع</th>
                <th className="py-4 px-5">المسؤول</th>
                <th className="py-4 px-5">الحالة</th>
                <th className="py-4 px-5">تاريخ التقديم</th>
                <th className="py-4 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                // Skeletons while loading
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5"><Skeleton width="60px" height="20px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5">
                      <div className="space-y-1.5">
                        <Skeleton width="120px" height="16px" rounded="rounded-md" />
                        <Skeleton width="80px" height="12px" rounded="rounded-md" />
                      </div>
                    </td>
                    <td className="py-4 px-5"><Skeleton width="70px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="80px" height="20px" rounded="rounded-full" /></td>
                    <td className="py-4 px-5"><Skeleton width="90px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="70px" height="20px" rounded="rounded-full" /></td>
                    <td className="py-4 px-5"><Skeleton width="80px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5 text-center"><Skeleton width="70px" height="32px" rounded="rounded-xl" /></td>
                  </tr>
                ))
              ) : applications.length === 0 ? (
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
                      <p className="text-sm font-extrabold text-ink">لم يتم العثور على أي طلبات</p>
                      <p className="text-xs text-muted max-w-sm">
                        {hasActiveFilters
                          ? "لا توجد نتائج تطابق معايير البحث الحالية، جرّب تغيير الفلاتر."
                          : "لم يتم تقديم أي طلبات انضمام حتى الآن."}
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
                // Applications Rows
                applications.map((app) => {
                  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
                  const typeCfg = TYPE_CONFIG[app.application_type] || TYPE_CONFIG.member;

                  return (
                    <tr
                      key={app.id}
                      className="group transition-colors hover:bg-gold-tint/25"
                    >
                      {/* Application No */}
                      <td className="py-4 px-5 font-mono font-bold text-ink">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(app.id)}
                          className="hover:text-gold-dark hover:underline focus:outline-none"
                        >
                          #{app.application_no}
                        </button>
                      </td>

                      {/* Full Name & SN Snippet */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-xs shadow-2xs group-hover:border-gold/50 transition-colors">
                            {app.full_name ? app.full_name.trim().charAt(0) : "م"}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(app.id)}
                              className="text-right font-extrabold text-ink group-hover:text-gold-dark transition-colors"
                            >
                              {app.full_name}
                            </button>
                            <span className="block text-[11px] text-muted">
                              طلب رقم #{app.application_no}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Governorate */}
                      <td className="py-4 px-5 text-muted font-medium">
                        {app.governorate?.name_ar || "—"}
                      </td>

                      {/* Type Badge */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${typeCfg.tone}`}
                        >
                          {typeCfg.label}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-4 px-5 text-muted font-medium">
                        {app.assigned_staff_user?.full_name || app.assigned_to_user?.full_name ? (
                          <span className="font-bold text-ink text-[11px]">
                            {app.assigned_staff_user?.full_name || app.assigned_to_user?.full_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted/60">غير مسند</span>
                        )}
                      </td>

                      {/* Status Badge */}
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
                        {formatRelativeTime(app.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* If NEW: Quick Start Review */}
                          {canUpdate && app.status === "new" && (
                            <button
                              type="button"
                              disabled={actionInProgressId === app.id}
                              onClick={() => handleStartReview(app)}
                              className="inline-flex items-center gap-1 rounded-xl border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-800 hover:bg-sky-100 transition-all shadow-2xs disabled:opacity-50"
                              title="بدء مراجعة هذا الطلب"
                            >
                              {actionInProgressId === app.id ? (
                                <Spinner size="xs" color="ink" />
                              ) : (
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              )}
                              <span>بدء مراجعة</span>
                            </button>
                          )}

                          {/* If UNDER_REVIEW: Quick Accept & Quick Reject */}
                          {canUpdate && app.status === "under_review" && (
                            <>
                              <button
                                type="button"
                                disabled={actionInProgressId === app.id}
                                onClick={() => setQuickAcceptTarget(app)}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-all shadow-2xs disabled:opacity-50"
                                title="قبول الطلب"
                              >
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>قبول</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionInProgressId === app.id}
                                onClick={() => {
                                  setQuickRejectTarget(app);
                                  setRejectReason("");
                                }}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-2xs disabled:opacity-50"
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
                            onClick={() => handleOpenDetails(app.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink transition-all hover:border-gold hover:bg-gold-tint hover:text-gold-dark shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <span>التفاصيل</span>
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={actionInProgressId === app.id}
                            onClick={() => setTargetDeleteApp(app)}
                            className="inline-flex size-7.5 items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700 shadow-2xs transition-all duration-200 hover:bg-rose-100 hover:border-rose-300 hover:scale-110 active:scale-95 disabled:opacity-50"
                            title="حذف هذا الطلب نهائياً"
                            aria-label="حذف طلب الانضمام"
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
                  fetchApplications(pagination.page - 1);
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
                  fetchApplications(pagination.page + 1);
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
            className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-card-hover animate-elem-fade-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-ink">تأكيد قبول طلب الانضمام</h3>
                <p className="text-xs text-muted">طلب رقم #{quickAcceptTarget.application_no}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-ink leading-relaxed">
              هل أنت متأكد من رغبتك في قبول طلب الانضمام المقدم من{" "}
              <strong className="text-gold-dark font-black">
                «{quickAcceptTarget.full_name}»
              </strong>
              ؟
              {quickAcceptTarget.application_type === "member" && (
                <span className="block mt-2 text-xs text-muted">
                  * سيتم إنشاء رقم عضوية رسمي للمواطن تلقائياً وتحديث سجل الحالة فوراً.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgressId === quickAcceptTarget.id}
                onClick={() => setQuickAcceptTarget(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={actionInProgressId === quickAcceptTarget.id}
                onClick={handleConfirmAccept}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-btn disabled:opacity-50"
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
            className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-card-hover animate-elem-fade-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
                <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-ink">رفض طلب الانضمام</h3>
                <p className="text-xs text-muted">طلب رقم #{quickRejectTarget.application_no}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <p className="text-xs text-ink">
                يرجى تدوين سبب رفض طلب{" "}
                <strong className="text-rose-700 font-bold">
                  «{quickRejectTarget.full_name}»
                </strong>{" "}
                (سيتم توثيقه في سجل التدقيق):
              </p>

              <div>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="سبب الرفض (مثال: عدم استيفاء الشروط التنظيمية، بيانات غير صحيحة...)"
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
                  className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionInProgressId === quickRejectTarget.id || !rejectReason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-btn disabled:opacity-50"
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

      {/* 6. Delete Confirmation Modal */}
      {targetDeleteApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card animate-scale-up space-y-5 text-right">
            {/* Header with red warning and rotating gold close button */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">تأكيد حذف طلب الانضمام</h3>
                  <p className="text-xs text-muted">إجراء نهائي يتطلب تأكيداً مسبقاً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetDeleteApp(null)}
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95"
                aria-label="إغلاق النافذة"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Target details snippet */}
            <div className="rounded-2xl border border-line bg-page/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">رقم الطلب:</span>
                <span className="font-mono font-bold text-ink">#{targetDeleteApp.application_no}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">اسم المتقدم:</span>
                <span className="font-bold text-ink">{targetDeleteApp.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">نوع الانضمام:</span>
                <span className="font-bold text-ink">
                  {TYPE_CONFIG[targetDeleteApp.application_type]?.label || targetDeleteApp.application_type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">المحافظة:</span>
                <span className="font-bold text-ink">{targetDeleteApp.governorate?.name_ar || "—"}</span>
              </div>
            </div>

            {/* Warning alert */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 leading-relaxed font-medium">
              ⚠️ <strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه. سيتم حذف هذا الطلب وسجل حالته بالكامل من قاعدة البيانات.
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgressId === targetDeleteApp.id}
                onClick={() => setTargetDeleteApp(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={actionInProgressId === targetDeleteApp.id}
                onClick={handleConfirmDeleteApp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 cursor-pointer"
              >
                {actionInProgressId === targetDeleteApp.id ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                )}
                <span>تأكيد الحذف النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Application Details Modal */}
      <ApplicationDetailsModal
        applicationId={selectedAppId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppId(null);
        }}
        onStatusUpdated={() => {
          setLoading(true);
          fetchApplications(pagination.page);
        }}
        staffList={staffList}
      />
    </div>
  );
}
