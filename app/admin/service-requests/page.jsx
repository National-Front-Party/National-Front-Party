"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Eye,
  Trash2,
  Clock,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  MessageCircle,
  Copy,
} from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import ServiceRequestDetailsModal from "@/components/Admin/ServiceRequests/ServiceRequestDetailsModal";
import ActionDropdown from "@/components/Admin/ui/ActionDropdown";

// Status configuration & styling
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
  const canUpdate = canAccess(role, "services:manage") || role === "super_admin";
  const canBulkDelete = role === "super_admin" || canAccess(role, "records:delete");

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
  const [targetDeleteReq, setTargetDeleteReq] = useState(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
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

  // Handle Single Service Request Deletion
  const handleConfirmDeleteReq = async () => {
    if (!targetDeleteReq) return;
    setActionInProgressId(targetDeleteReq.id);
    try {
      await adminFetch(`/api/admin/service-requests/${targetDeleteReq.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
      });
      showSuccess(`تم حذف طلب الخدمة رقم #${targetDeleteReq.request_no} نهائياً`);
      setRequests((prev) => prev.filter((item) => item.id !== targetDeleteReq.id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setTargetDeleteReq(null);
    } catch (err) {
      showError(err.message || "تعذر حذف طلب الخدمة");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Bulk Deletion (Current Page)
  const handleConfirmBulkDeleteRequests = async () => {
    if (!canBulkDelete || requests.length === 0) return;
    setBulkDeleteLoading(true);

    try {
      const itemsToDelete = [...requests];
      const deletePromises = itemsToDelete.map((req) =>
        adminFetch(`/api/admin/service-requests/${req.id}`, {
          method: "DELETE",
          body: JSON.stringify({ confirm: true }),
        })
          .then(() => ({ success: true, id: req.id }))
          .catch((err) => ({ success: false, id: req.id, error: err.message })),
      );

      const results = await Promise.allSettled(deletePromises);
      const successfulCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success,
      ).length;

      if (successfulCount > 0) {
        showSuccess(
          `تم بنجاح حذف ${toArabicDigits(successfulCount)} طلب من أصل ${toArabicDigits(itemsToDelete.length)} طلب بالصفحة`,
        );
      } else {
        showError("فشل في حذف طلبات الصفحة الحالية، يرجى المحاولة لاحقاً");
      }

      setIsBulkDeleteModalOpen(false);
      setLoading(true);

      const targetPage =
        successfulCount === itemsToDelete.length && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      fetchRequests(targetPage);
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تنفيذ الحذف الجماعي");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Copy helper
  const handleCopyPhone = useCallback((phone) => {
    if (!phone) return;
    navigator.clipboard
      .writeText(phone)
      .then(() => showSuccess("تم نسخ رقم الهاتف بنجاح"))
      .catch(() => showError("تعذر النسخ"));
  }, [showSuccess, showError]);

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

  // Build Row Actions Menu Items
  const getRowMenuItems = useCallback(
    (req) => {
      const items = [];

      // View details
      items.push({
        id: "view",
        label: "عرض تفاصيل الطلب",
        icon: <Eye className="size-4 text-ink" />,
        onClick: () => handleOpenDetails(req.id),
      });

      // Quick reject for in_progress
      if (canUpdate && req.status === "in_progress") {
        items.push({
          id: "reject",
          label: "رفض الطلب مع ذكر السبب",
          icon: <X className="size-4 text-rose-600" />,
          tone: "danger",
          onClick: () => {
            setQuickRejectTarget(req);
            setRejectReason("");
          },
        });
      }

      // Phone actions if phone exists
      if (req.phone) {
        items.push({ divider: true });
        items.push({
          id: "copy-phone",
          label: "نسخ رقم الهاتف",
          icon: <Copy className="size-4 text-gold-dark" />,
          onClick: () => handleCopyPhone(req.phone),
        });
        items.push({
          id: "whatsapp",
          label: "مراسلة عبر واتساب",
          icon: <MessageCircle className="size-4 text-emerald-600" />,
          onClick: () => {
            window.open(
              `https://wa.me/20${req.phone.replace(/^0/, "")}`,
              "_blank",
              "noreferrer",
            );
          },
        });
      }

      // Delete action (always available in menu with confirmation modal)
      items.push({ divider: true });
      items.push({
        id: "delete",
        label: "حذف الطلب نهائياً",
        icon: <Trash2 className="size-4 text-rose-600" />,
        tone: "danger",
        onClick: () => setTargetDeleteReq(req),
      });

      return items;
    },
    [canUpdate, handleCopyPhone],
  );

  // Unauthorized view
  if (user && !canView) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 text-center animate-elem-fade-up"
        dir="rtl"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs mb-4">
          <AlertTriangle className="size-8" />
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
          <ChevronLeft className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Page Header with Title, Count & Actions */}
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

        {/* Action Buttons: Bulk Delete (super_admin) */}
        {canBulkDelete && requests.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              disabled={bulkDeleteLoading || loading}
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 hover:border-rose-300 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              title="حذف جميع طلبات الخدمة المعروضة في الصفحة الحالية"
            >
              <Trash2 className="size-4 text-rose-600" />
              <span>حذف طلبات الصفحة ({toArabicDigits(requests.length)})</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Status Segmented Tabs - Zero scroll responsive control */}
      <div className="flex w-full sm:w-auto sm:inline-flex items-center gap-0.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-page/70 border border-line shadow-2xs overflow-hidden animate-elem-fade-up">
        {[
          { id: "", label: "جميع الحالات", shortLabel: "الكل" },
          { id: "new", label: "جديد", shortLabel: "جديد" },
          { id: "in_progress", label: "قيد المراجعة", shortLabel: "مراجعة" },
          { id: "completed", label: "مقبول", shortLabel: "مقبول" },
          { id: "rejected", label: "مرفوض", shortLabel: "مرفوض" },
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
              className={`group relative flex flex-1 sm:flex-initial items-center justify-center gap-1 sm:gap-2 rounded-xl px-1 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold cursor-pointer transition-all duration-300 ease-out active:scale-95 min-w-0 ${
                isActive
                  ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] border border-gold/60 scale-[1.02] sm:scale-[1.03] hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)]"
                  : "bg-white text-muted border border-line shadow-2xs hover:border-gold/50 hover:text-ink hover:bg-gold-tint/40 hover:shadow-xs hover:scale-[1.02] sm:hover:scale-105 hover:-translate-y-0.5"
              }`}
            >
              {tab.id && (
                <span
                  className={`hidden sm:inline-block size-2.5 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125 ${
                    isActive
                      ? "ring-2 ring-white/90 " + (STATUS_CONFIG[tab.id]?.dot || "bg-ink")
                      : STATUS_CONFIG[tab.id]?.dot || "bg-muted"
                  }`}
                />
              )}
              <span className="whitespace-nowrap text-center">
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search and Filters Bar with website form field style */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-card animate-elem-fade-up">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4 2xl:gap-3.5">
            {/* Search Input: h-14, rounded-2xl, border-border, focus:gold shadow */}
            <div className="relative min-w-0">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث باسم المواطن أو رقم الهاتف..."
                className="h-14 w-full min-w-0 rounded-2xl border border-border bg-white pr-3 pl-10 text-right text-[11px] 2xl:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <Search className="size-5" />
              </span>
            </div>

            {/* Ministry Filter: Website CustomSelect */}
            <div className="min-w-0">
              <CustomSelect
                id="filter-ministry"
                fitContent
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
            <div className="min-w-0">
              <CustomSelect
                id="filter-sector"
                fitContent
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
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="submit"
                className="h-14 min-w-0 flex-1 rounded-2xl bg-gold-gradient px-3 2xl:px-4 text-xs 2xl:text-sm font-bold text-ink shadow-btn hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                تطبيق البحث
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-14 shrink-0 rounded-2xl border border-border bg-white px-3 2xl:px-4 text-xs font-bold text-muted hover:border-rose-300 hover:text-rose-600 transition-colors shadow-none cursor-pointer"
                  title="إلغاء جميع الفلاتر"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 4. Service Requests Data Presentation (Responsive - No Table Scrolling) */}
      <div className="rounded-3xl border border-line bg-white shadow-card overflow-hidden animate-elem-fade-up">
        {loading ? (
          // Skeletons
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-line/60 animate-pulse bg-page/30"
              >
                <div className="flex items-center gap-3">
                  <Skeleton width="40px" height="40px" rounded="rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton width="140px" height="16px" rounded="rounded-md" />
                    <Skeleton width="100px" height="12px" rounded="rounded-md" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <Skeleton width="90px" height="16px" rounded="rounded-md" />
                  <Skeleton width="80px" height="20px" rounded="rounded-full" />
                </div>
                <Skeleton width="90px" height="32px" rounded="rounded-xl" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          // Empty State
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
                <Search className="size-7" />
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
                  className="mt-2 rounded-xl border border-gold/40 bg-gold-tint px-4 py-2 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View (hidden lg:block) - proportional, clean, no horizontal scrolling */}
            <div className="hidden lg:block w-full">
              <table className="w-full text-right text-xs table-fixed">
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-3 w-[10%]">رقم الطلب</th>
                    <th className="py-4 px-3 w-[22%]">المواطن مقدم الطلب</th>
                    <th className="py-4 px-3 w-[14%]">رقم الهاتف</th>
                    <th className="py-4 px-3 w-[15%]">الوزارة المعنية</th>
                    <th className="py-4 px-3 w-[12%]">القطاع الخدمي</th>
                    <th className="py-4 px-3 w-[10%]">الحالة</th>
                    <th className="py-4 pr-3 pl-6 sm:pl-8 w-[17%] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {requests.map((req) => {
                    const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.new;
                    const menuItems = getRowMenuItems(req);

                    return (
                      <tr
                        key={req.id}
                        className="group transition-colors hover:bg-gold-tint/25"
                      >
                        {/* Request Number */}
                        <td className="py-4 pr-6 pl-3 font-mono font-bold text-ink truncate">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(req.id)}
                            className="hover:text-gold-dark hover:underline focus:outline-none cursor-pointer"
                          >
                            #{req.request_no}
                          </button>
                        </td>

                        {/* Citizen Full Name */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-xs shadow-2xs group-hover:border-gold/50 transition-colors">
                              {req.full_name ? req.full_name.trim().charAt(0) : "م"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(req.id)}
                                className="block text-right font-extrabold text-ink group-hover:text-gold-dark transition-colors truncate w-full cursor-pointer"
                                title={req.full_name}
                              >
                                {req.full_name}
                              </button>
                              <span className="block text-[11px] text-muted truncate">
                                {formatRelativeTime(req.created_at)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone with quick action */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium text-ink truncate" dir="ltr">
                              {req.phone || "—"}
                            </span>
                            {req.phone && (
                              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhone(req.phone)}
                                  className="text-[10px] text-gold-dark hover:underline font-bold cursor-pointer"
                                  title="نسخ رقم الهاتف"
                                >
                                  نسخ
                                </button>
                                <a
                                  href={`https://wa.me/20${req.phone.replace(/^0/, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                                  title="مراسلة عبر واتساب"
                                >
                                  واتساب
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Ministry */}
                        <td className="py-4 px-3 text-ink font-bold truncate">
                          {req.ministry?.name_ar || "—"}
                        </td>

                        {/* Sector */}
                        <td className="py-4 px-3 text-muted font-medium truncate">
                          {req.request_sector?.name_ar || req.sector?.name_ar || "—"}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusCfg.tone}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Actions: Primary Action Button + Three-dot Menu */}
                        <td className="py-4 pr-3 pl-6 sm:pl-8">
                          <div className="flex items-center justify-center gap-2">
                            {/* Primary Dynamic Action based on status */}
                            {canUpdate && req.status === "new" ? (
                              <button
                                type="button"
                                disabled={actionInProgressId === req.id}
                                onClick={() => handleStartProgress(req)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold-tint px-3 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="بدء مراجعة هذا الطلب"
                              >
                                {actionInProgressId === req.id ? (
                                  <Spinner size="xs" color="gold" />
                                ) : (
                                  <Clock className="size-3.5" />
                                )}
                                <span>بدء المراجعة</span>
                              </button>
                            ) : canUpdate && req.status === "in_progress" ? (
                              <button
                                type="button"
                                disabled={actionInProgressId === req.id}
                                onClick={() => setQuickAcceptTarget(req)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="قبول وإنجاز الطلب"
                              >
                                <Check className="size-3.5" />
                                <span>قبول</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(req.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                title="عرض التفاصيل"
                              >
                                <Eye className="size-3.5" />
                                <span>التفاصيل</span>
                              </button>
                            )}

                            {/* Secondary Actions Dropdown */}
                            <ActionDropdown items={menuItems} label={`إجراءات الطلب #${req.request_no}`} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card Layout (block lg:hidden) - Zero horizontal scrolling */}
            <div className="block lg:hidden p-4 sm:p-5 bg-page/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map((req) => {
                  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.new;
                  const menuItems = getRowMenuItems(req);

                  return (
                    <div
                      key={req.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-gold/50 transition-all duration-300"
                    >
                      {/* Card Top: Number & Status */}
                      <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(req.id)}
                          className="font-mono text-xs font-bold text-gold-dark hover:underline cursor-pointer"
                        >
                          #{req.request_no}
                        </button>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusCfg.tone}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Card Body: Citizen Info, Phone, Ministry */}
                      <div className="my-3 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-sm shadow-2xs group-hover:border-gold/50 transition-colors">
                            {req.full_name ? req.full_name.trim().charAt(0) : "م"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(req.id)}
                              className="text-right font-black text-sm text-ink group-hover:text-gold-dark transition-colors truncate block w-full cursor-pointer"
                            >
                              {req.full_name}
                            </button>
                            {req.phone && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs font-medium text-muted" dir="ltr">
                                  {req.phone}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhone(req.phone)}
                                  className="text-[10px] text-gold-dark font-bold hover:underline cursor-pointer"
                                >
                                  نسخ
                                </button>
                                <a
                                  href={`https://wa.me/20${req.phone.replace(/^0/, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                                >
                                  واتساب
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ministry & Sector */}
                        <div className="space-y-1 text-[11px] text-muted pt-1">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3 text-gold-dark shrink-0" />
                            <span className="font-bold text-ink truncate">
                              {req.ministry?.name_ar || "الوزارة غير محددة"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="size-3 text-muted/70 shrink-0" />
                            <span className="truncate">
                              القطاع: {req.request_sector?.name_ar || req.sector?.name_ar || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Relative Date & Actions */}
                      <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-muted">
                          <Clock className="size-3" />
                          <span>{formatRelativeTime(req.created_at)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Primary Dynamic Action based on status */}
                          {canUpdate && req.status === "new" ? (
                            <button
                              type="button"
                              disabled={actionInProgressId === req.id}
                              onClick={() => handleStartProgress(req)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold-tint px-3 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="بدء مراجعة هذا الطلب"
                            >
                              {actionInProgressId === req.id ? (
                                <Spinner size="xs" color="gold" />
                              ) : (
                                <Clock className="size-3.5" />
                              )}
                              <span>بدء المراجعة</span>
                            </button>
                          ) : canUpdate && req.status === "in_progress" ? (
                            <button
                              type="button"
                              disabled={actionInProgressId === req.id}
                              onClick={() => setQuickAcceptTarget(req)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="قبول وإنجاز الطلب"
                            >
                              <Check className="size-3.5" />
                              <span>قبول</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(req.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark transition-all shadow-2xs active:scale-95 cursor-pointer"
                              title="عرض التفاصيل"
                            >
                              <Eye className="size-3.5" />
                              <span>التفاصيل</span>
                            </button>
                          )}

                          {/* Secondary Actions Dropdown */}
                          <ActionDropdown items={menuItems} label={`إجراءات الطلب #${req.request_no}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

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
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                title="الصفحة السابقة"
              >
                <ChevronRight className="size-4" />
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
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Bulk Delete Confirmation Modal (Super Admin) */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-elem-fade-up"
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-card space-y-5 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with red warning and rotating gold close button */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">
                    تأكيد حذف جميع طلبات الخدمات بالصفحة الحالية
                  </h3>
                  <p className="text-xs text-muted">
                    عملية حذف جماعي نهائية للصفحة المعروضة
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={bulkDeleteLoading}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer disabled:opacity-50"
                aria-label="إغلاق النافذة"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scope Details */}
            <div className="rounded-2xl border border-line bg-page/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">عدد الطلبات المستهدفة:</span>
                <span className="font-bold text-rose-600 font-mono text-sm">
                  {toArabicDigits(requests.length)} طلب
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">الصفحة المستهدفة:</span>
                <span className="font-bold text-ink">
                  صفحة {toArabicDigits(pagination.page)} من أصل {toArabicDigits(pagination.total_pages)}
                </span>
              </div>
              {hasActiveFilters && (
                <div className="flex justify-between items-center">
                  <span className="text-muted">نطاق الفلترة:</span>
                  <span className="font-bold text-gold-dark">
                    فلاتر مخصصة مفعلة حالياً
                  </span>
                </div>
              )}
            </div>

            {/* Warning alert */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 leading-relaxed font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-black text-rose-900">
                <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                <span>تحذير أمني صارم (لا يمكن التراجع عنه)</span>
              </div>
              <p>
                سيؤدي هذا الإجراء إلى حذف جميع طلبات الخدمات الـ (
                {toArabicDigits(requests.length)}) المعروضة حالياً في هذه الصفحة وسجلات بياناتها نهائياً من قاعدة البيانات.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={bulkDeleteLoading}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={bulkDeleteLoading}
                onClick={handleConfirmBulkDeleteRequests}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 cursor-pointer"
              >
                {bulkDeleteLoading ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span>تأكيد الحذف الجماعي ({toArabicDigits(requests.length)} طلب)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Quick Accept Confirmation Modal */}
      {quickAcceptTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-elem-fade-up"
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs">
                  <Check className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">تأكيد قبول وإنجاز طلب الخدمة</h3>
                  <p className="text-xs text-muted">طلب رقم #{quickAcceptTarget.request_no}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickAcceptTarget(null)}
                aria-label="إغلاق النافذة"
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-ink leading-relaxed">
              هل أنت متأكد من رغبتك في قبول وإتمام طلب الخدمة المقدم من المواطن{" "}
              <strong className="text-gold-dark font-black">
                «{quickAcceptTarget.full_name}»
              </strong>
              ؟
              <span className="block mt-2 text-xs text-muted">
                الوزارة المعنية: {quickAcceptTarget.ministry?.name_ar || "—"} • القطاع:{" "}
                {quickAcceptTarget.request_sector?.name_ar || "—"}
              </span>
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgressId === quickAcceptTarget.id}
                onClick={() => setQuickAcceptTarget(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={actionInProgressId === quickAcceptTarget.id}
                onClick={handleConfirmAccept}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 cursor-pointer"
              >
                {actionInProgressId === quickAcceptTarget.id ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>تأكيد القبول</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Quick Reject Reason Modal */}
      {quickRejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-elem-fade-up"
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
                  <X className="size-6" />
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
                aria-label="إغلاق النافذة"
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
              >
                <X className="size-4" />
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
                  className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionInProgressId === quickRejectTarget.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 cursor-pointer"
                >
                  {actionInProgressId === quickRejectTarget.id ? (
                    <Spinner size="xs" color="white" />
                  ) : (
                    <X className="size-4" />
                  )}
                  <span>تأكيد الرفض</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Single Delete Confirmation Modal */}
      {targetDeleteReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-elem-fade-up">
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card space-y-5 text-right">
            {/* Header with red warning and rotating gold close button */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">تأكيد حذف طلب الخدمة</h3>
                  <p className="text-xs text-muted">إجراء نهائي يتطلب تأكيداً مسبقاً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetDeleteReq(null)}
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Target details snippet */}
            <div className="rounded-2xl border border-line bg-page/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">رقم الطلب:</span>
                <span className="font-mono font-bold text-ink">#{targetDeleteReq.request_no}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">اسم المواطن:</span>
                <span className="font-bold text-ink">{targetDeleteReq.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">الوزارة:</span>
                <span className="font-bold text-ink">{targetDeleteReq.ministry?.name_ar || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">القطاع:</span>
                <span className="font-bold text-ink">
                  {targetDeleteReq.request_sector?.name_ar || targetDeleteReq.sector?.name_ar || "—"}
                </span>
              </div>
            </div>

            {/* Warning alert */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 leading-relaxed font-medium">
              ⚠️ <strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه. سيتم حذف هذا الطلب وسجل بياناته بالكامل من قاعدة البيانات.
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionInProgressId === targetDeleteReq.id}
                onClick={() => setTargetDeleteReq(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={actionInProgressId === targetDeleteReq.id}
                onClick={handleConfirmDeleteReq}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 cursor-pointer"
              >
                {actionInProgressId === targetDeleteReq.id ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span>تأكيد الحذف النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Service Request Details Modal */}
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
