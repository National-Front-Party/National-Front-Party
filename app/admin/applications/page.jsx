"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  X,
  Eye,
  Trash2,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
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
import ApplicationDetailsModal from "@/components/Admin/Applications/ApplicationDetailsModal";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import ActionDropdown from "@/components/Admin/ui/ActionDropdown";

// Type labels and styling
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
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionInProgressId, setActionInProgressId] = useState(null);

  const role = user?.role;
  const canView = canAccess(role, "applications");
  const canExport = canAccess(role, "applications:export");
  const canUpdate = canAccess(role, "applications:update");
  const canBulkDelete = role === "super_admin" || canAccess(role, "records:delete");

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

  // Copy helper
  const handleCopyPhone = useCallback((phone) => {
    if (!phone) return;
    navigator.clipboard
      .writeText(phone)
      .then(() => showSuccess("تم نسخ رقم الهاتف بنجاح"))
      .catch(() => showError("تعذر النسخ"));
  }, [showSuccess, showError]);

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

  // Handle Single Application Deletion
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

  // Handle Bulk Deletion (Current Page)
  const handleConfirmBulkDeleteApplications = async () => {
    if (!canBulkDelete || applications.length === 0) return;
    setBulkDeleteLoading(true);

    try {
      const itemsToDelete = [...applications];
      const deletePromises = itemsToDelete.map((app) =>
        adminFetch(`/api/admin/applications/${app.id}`, {
          method: "DELETE",
          body: JSON.stringify({ confirm: true }),
        })
          .then(() => ({ success: true, id: app.id }))
          .catch((err) => ({ success: false, id: app.id, error: err.message })),
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

      // Refresh list: if whole page deleted and page > 1, go to page - 1
      const targetPage =
        successfulCount === itemsToDelete.length && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      fetchApplications(targetPage);
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تنفيذ الحذف الجماعي");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Handle Excel Export (.xlsx)
  const handleExportExcel = async () => {
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

      const res = await fetch(`/api/admin/applications/export/excel?${queryParams.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل تصدير ملف إكسيل");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().substring(0, 10);
      a.download = `تقرير_طلبات_الانضمام_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess("تم تصدير تقرير Excel بنجاح");
    } catch (err) {
      showError(err.message || "حدث خطأ أثناء تصدير ملف Excel");
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

  // Build Row Actions Menu Items
  const getRowMenuItems = useCallback(
    (app) => {
      const items = [];

      // View details
      items.push({
        id: "view",
        label: "عرض التفاصيل الكاملة",
        icon: <Eye className="size-4 text-ink" />,
        onClick: () => handleOpenDetails(app.id),
      });

      // Quick reject for under_review
      if (canUpdate && app.status === "under_review") {
        items.push({
          id: "reject",
          label: "رفض الطلب مع ذكر السبب",
          icon: <X className="size-4 text-rose-600" />,
          tone: "danger",
          onClick: () => {
            setQuickRejectTarget(app);
            setRejectReason("");
          },
        });
      }

      // Phone actions if phone exists
      if (app.phone) {
        items.push({ divider: true });
        items.push({
          id: "copy-phone",
          label: "نسخ رقم الهاتف",
          icon: <Copy className="size-4 text-gold-dark" />,
          onClick: () => handleCopyPhone(app.phone),
        });
        items.push({
          id: "whatsapp",
          label: "مراسلة عبر واتساب",
          icon: <MessageCircle className="size-4 text-emerald-600" />,
          onClick: () => {
            window.open(
              `https://wa.me/20${app.phone.replace(/^0/, "")}`,
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
        onClick: () => setTargetDeleteApp(app),
      });

      return items;
    },
    [canUpdate, handleCopyPhone],
  );

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
          قسم طلبات الانضمام متاح فقط لـ «مدير النظام» و«مسؤول العضوية».
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

        {/* Action Buttons: Bulk Delete (super_admin) & Export CSV */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canBulkDelete && applications.length > 0 && (
            <button
              type="button"
              disabled={bulkDeleteLoading || loading}
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 hover:border-rose-300 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              title="حذف جميع الطلبات المعروضة في الصفحة الحالية"
            >
              <Trash2 className="size-4 text-rose-600" />
              <span>حذف طلبات الصفحة ({toArabicDigits(applications.length)})</span>
            </button>
          )}

          {canExport && (
            <button
              type="button"
              disabled={exportLoading || pagination.total === 0}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-2xs hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              title="تصدير تقرير إكسيل احترافي مع لوحة المؤشرات والإحصائيات"
            >
              {exportLoading ? (
                <Spinner size="sm" color="gold" />
              ) : (
                <FileSpreadsheet className="size-4 text-emerald-700" />
              )}
              <span>تصدير Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Status Segmented Tabs - Zero scroll responsive control */}
      <div className="flex w-full sm:w-auto sm:inline-flex items-center gap-0.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-page/70 border border-line shadow-2xs overflow-hidden animate-elem-fade-up">
        {[
          { id: "", label: "جميع الحالات", shortLabel: "الكل" },
          { id: "new", label: "جديد", shortLabel: "جديد" },
          { id: "under_review", label: "قيد المراجعة", shortLabel: "مراجعة" },
          { id: "accepted", label: "مقبول", shortLabel: "مقبول" },
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
            {/* Search Input: h-14, rounded-2xl, border-border, gold focus shadow */}
            <div className="relative min-w-0">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث بالاسم، الرقم القومي أو الهاتف..."
                className="h-14 w-full min-w-0 rounded-2xl border border-border bg-white pr-3 pl-10 text-right text-[11px] 2xl:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <Search className="size-5" />
              </span>
            </div>

            {/* Type Filter: Website CustomSelect */}
            <div className="min-w-0">
              <CustomSelect
                id="filter-type"
                fitContent
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
            <div className="min-w-0">
              <CustomSelect
                id="filter-governorate"
                fitContent
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

      {/* 4. Applications Data Presentation (Responsive - No Table Scrolling) */}
      <div className="rounded-3xl border border-line bg-white shadow-card overflow-hidden animate-elem-fade-up">
        {loading ? (
          // Skeletons while loading
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
                    <Skeleton width="90px" height="12px" rounded="rounded-md" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <Skeleton width="70px" height="16px" rounded="rounded-md" />
                  <Skeleton width="80px" height="20px" rounded="rounded-full" />
                </div>
                <Skeleton width="90px" height="32px" rounded="rounded-xl" />
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          // Empty State
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
                <Search className="size-7" />
              </div>
              <p className="text-sm font-extrabold text-ink">لم يتم العثور على أي طلبات انضمام</p>
              <p className="text-xs text-muted max-w-sm">
                {hasActiveFilters
                  ? "لا توجد نتائج تطابق معايير البحث الحالية، جرّب تغيير الفلاتر."
                  : "لم يتم تقديم أي طلبات انضمام حتى الآن."}
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
                    <th className="py-4 px-3 w-[23%]">مقدم الطلب</th>
                    <th className="py-4 px-3 w-[12%]">المحافظة</th>
                    <th className="py-4 px-3 w-[13%]">نوع الانضمام</th>
                    <th className="py-4 px-3 w-[13%]">المسؤول</th>
                    <th className="py-4 px-3 w-[11%]">الحالة</th>
                    <th className="py-4 pr-3 pl-6 sm:pl-8 w-[18%] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {applications.map((app) => {
                    const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
                    const typeCfg = TYPE_CONFIG[app.application_type] || TYPE_CONFIG.member;
                    const menuItems = getRowMenuItems(app);

                    return (
                      <tr
                        key={app.id}
                        className="group transition-colors hover:bg-gold-tint/25"
                      >
                        {/* Application No */}
                        <td className="py-4 pr-6 pl-3 font-mono font-bold text-ink truncate">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(app.id)}
                            className="hover:text-gold-dark hover:underline focus:outline-none cursor-pointer"
                          >
                            #{app.application_no}
                          </button>
                        </td>

                        {/* Full Name & SN Snippet */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-xs shadow-2xs group-hover:border-gold/50 transition-colors">
                              {app.full_name ? app.full_name.trim().charAt(0) : "م"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(app.id)}
                                className="block text-right font-extrabold text-ink group-hover:text-gold-dark transition-colors truncate w-full cursor-pointer"
                                title={app.full_name}
                              >
                                {app.full_name}
                              </button>
                              <span className="block text-[11px] text-muted truncate">
                                {formatRelativeTime(app.created_at)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Governorate */}
                        <td className="py-4 px-3 text-muted font-medium truncate">
                          {app.governorate?.name_ar || "—"}
                        </td>

                        {/* Type Badge */}
                        <td className="py-4 px-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${typeCfg.tone}`}
                          >
                            {typeCfg.label}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td className="py-4 px-3 text-muted font-medium truncate">
                          {app.assigned_staff_user?.full_name || app.assigned_to_user?.full_name ? (
                            <span className="font-bold text-ink text-[11px]">
                              {app.assigned_staff_user?.full_name || app.assigned_to_user?.full_name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted/60">غير مسند</span>
                          )}
                        </td>

                        {/* Status Badge */}
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
                            {canUpdate && app.status === "new" ? (
                              <button
                                type="button"
                                disabled={actionInProgressId === app.id}
                                onClick={() => handleStartReview(app)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold-tint px-3 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="بدء مراجعة هذا الطلب"
                              >
                                {actionInProgressId === app.id ? (
                                  <Spinner size="xs" color="gold" />
                                ) : (
                                  <Clock className="size-3.5" />
                                )}
                                <span>بدء مراجعة</span>
                              </button>
                            ) : canUpdate && app.status === "under_review" ? (
                              <button
                                type="button"
                                disabled={actionInProgressId === app.id}
                                onClick={() => setQuickAcceptTarget(app)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="قبول الطلب"
                              >
                                <Check className="size-3.5" />
                                <span>قبول</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(app.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                title="عرض التفاصيل"
                              >
                                <Eye className="size-3.5" />
                                <span>التفاصيل</span>
                              </button>
                            )}

                            {/* Secondary Actions Dropdown */}
                            <ActionDropdown items={menuItems} label={`إجراءات الطلب #${app.application_no}`} />
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
                {applications.map((app) => {
                  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
                  const typeCfg = TYPE_CONFIG[app.application_type] || TYPE_CONFIG.member;
                  const menuItems = getRowMenuItems(app);

                  return (
                    <div
                      key={app.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-gold/50 transition-all duration-300"
                    >
                      {/* Card Top: Number, Status, Type */}
                      <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(app.id)}
                          className="font-mono text-xs font-bold text-gold-dark hover:underline cursor-pointer"
                        >
                          #{app.application_no}
                        </button>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${typeCfg.tone}`}
                          >
                            {typeCfg.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusCfg.tone}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Applicant Info */}
                      <div className="my-3 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 font-bold text-ink text-sm shadow-2xs group-hover:border-gold/50 transition-colors">
                            {app.full_name ? app.full_name.trim().charAt(0) : "م"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(app.id)}
                              className="text-right font-black text-sm text-ink group-hover:text-gold-dark transition-colors truncate block w-full cursor-pointer"
                            >
                              {app.full_name}
                            </button>
                            <span className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
                              <MapPin className="size-3 text-gold-dark" />
                              <span>{app.governorate?.name_ar || "محافظة غير محددة"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Assignee if exists */}
                        <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                          <span className="flex items-center gap-1">
                            <User className="size-3 text-muted/70" />
                            <span>المسؤول:</span>
                          </span>
                          <span className="font-bold text-ink">
                            {app.assigned_staff_user?.full_name || app.assigned_to_user?.full_name || "غير مسند"}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Relative Date & Actions */}
                      <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-muted">
                          <Clock className="size-3" />
                          <span>{formatRelativeTime(app.created_at)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Primary Dynamic Action based on status */}
                          {canUpdate && app.status === "new" ? (
                            <button
                              type="button"
                              disabled={actionInProgressId === app.id}
                              onClick={() => handleStartReview(app)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold-tint px-3 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="بدء مراجعة هذا الطلب"
                            >
                              {actionInProgressId === app.id ? (
                                <Spinner size="xs" color="gold" />
                              ) : (
                                <Clock className="size-3.5" />
                              )}
                              <span>بدء مراجعة</span>
                            </button>
                          ) : canUpdate && app.status === "under_review" ? (
                            <button
                              type="button"
                              disabled={actionInProgressId === app.id}
                              onClick={() => setQuickAcceptTarget(app)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                              title="قبول الطلب"
                            >
                              <Check className="size-3.5" />
                              <span>قبول</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(app.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark transition-all shadow-2xs active:scale-95 cursor-pointer"
                              title="عرض التفاصيل"
                            >
                              <Eye className="size-3.5" />
                              <span>التفاصيل</span>
                            </button>
                          )}

                          {/* Secondary Actions Dropdown */}
                          <ActionDropdown items={menuItems} label={`إجراءات الطلب #${app.application_no}`} />
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
                  fetchApplications(pagination.page - 1);
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
                  fetchApplications(pagination.page + 1);
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
                    تأكيد حذف جميع طلبات الصفحة الحالية
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
                  {toArabicDigits(applications.length)} طلب
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
                سيؤدي هذا الإجراء إلى حذف جميع طلبات الانضمام الـ (
                {toArabicDigits(applications.length)}) المعروضة حالياً في هذه الصفحة وسجلات حالتها نهائياً من قاعدة البيانات.
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
                onClick={handleConfirmBulkDeleteApplications}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 cursor-pointer"
              >
                {bulkDeleteLoading ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span>تأكيد الحذف الجماعي ({toArabicDigits(applications.length)} طلب)</span>
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
                  <h3 className="text-base font-black text-ink">تأكيد قبول طلب الانضمام</h3>
                  <p className="text-xs text-muted">طلب رقم #{quickAcceptTarget.application_no}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickAcceptTarget(null)}
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="size-4" />
              </button>
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
                  <h3 className="text-base font-black text-ink">رفض طلب الانضمام</h3>
                  <p className="text-xs text-muted">طلب رقم #{quickRejectTarget.application_no}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQuickRejectTarget(null);
                  setRejectReason("");
                }}
                className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="size-4" />
              </button>
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
                  className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionInProgressId === quickRejectTarget.id || !rejectReason.trim()}
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
      {targetDeleteApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-elem-fade-up">
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card space-y-5 text-right">
            {/* Header with red warning and rotating gold close button */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">تأكيد حذف طلب الانضمام</h3>
                  <p className="text-xs text-muted">إجراء نهائي يتطلب تأكيداً مسبقاً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetDeleteApp(null)}
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
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
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
                  <Trash2 className="size-4" />
                )}
                <span>تأكيد الحذف النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Application Details Modal */}
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
