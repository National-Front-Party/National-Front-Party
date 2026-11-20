"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Landmark,
  Building2,
  Layers,
  Plus,
  Search,
  RotateCcw,
  Pencil,
  CheckCircle2,
  XCircle,
  Hash,
  Calendar,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
} from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import ActionDropdown from "@/components/Admin/ui/ActionDropdown";
import CatalogEditorModal from "@/components/Admin/Catalogs/CatalogEditorModal";

// Convert numbers to Arabic-Indic digits
function toArabicDigits(num) {
  if (num === null || num === undefined) return "٠";
  const arabic = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (d) => arabic[Number(d)]);
}

// Format date in Arabic locale
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export default function CatalogsPage() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const canManage =
    user?.role === "super_admin" ||
    user?.role === "service_officer" ||
    canAccess(user?.role, "catalogs") ||
    canAccess(user?.role, "services:manage");

  // Active Catalog Tab: 'ministries' | 'request_sectors'
  const [activeCatalog, setActiveCatalog] = useState("ministries");

  // Data & Pagination for Ministries
  const [ministries, setMinistries] = useState([]);
  const [ministriesPagination, setMinistriesPagination] = useState({
    page: 1,
    page_size: 100,
    total: 0,
    total_pages: 1,
  });

  // Data & Pagination for Request Sectors
  const [sectors, setSectors] = useState([]);
  const [sectorsPagination, setSectorsPagination] = useState({
    page: 1,
    page_size: 100,
    total: 0,
    total_pages: 1,
  });

  // Loading & Refreshing States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters (Client-side)
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [searchInput, setSearchInput] = useState("");

  // Modals & Action loading
  const [editingItem, setEditingItem] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const isMinistry = activeCatalog === "ministries";
  const activeRecords = isMinistry ? ministries : sectors;
  const activePagination = isMinistry ? ministriesPagination : sectorsPagination;

  // Fetch Ministries from API
  const fetchMinistries = useCallback(
    async (page = 1, showSpinner = false) => {
      if (!canManage) return;
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: "100",
        });

        const data = await adminFetch(`/api/admin/ministries?${queryParams.toString()}`);
        if (data && data.ministries) {
          setMinistries(data.ministries);
          if (data.pagination) {
            setMinistriesPagination(data.pagination);
          }
        }
      } catch (err) {
        showError(err.message || "فشل تحميل كتالوج الوزارات الحكومية");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canManage, showError],
  );

  // Fetch Request Sectors from API
  const fetchSectors = useCallback(
    async (page = 1, showSpinner = false) => {
      if (!canManage) return;
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: "100",
        });

        const data = await adminFetch(`/api/admin/request-sectors?${queryParams.toString()}`);
        if (data && data.request_sectors) {
          setSectors(data.request_sectors);
          if (data.pagination) {
            setSectorsPagination(data.pagination);
          }
        }
      } catch (err) {
        showError(err.message || "فشل تحميل كتالوج القطاعات الخدمية");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canManage, showError],
  );

  // Initial load via clean Promise.all
  useEffect(() => {
    let mounted = true;
    if (!canManage) {
      return;
    }

    Promise.all([
      adminFetch("/api/admin/ministries?page=1&page_size=100"),
      adminFetch("/api/admin/request-sectors?page=1&page_size=100"),
    ])
      .then(([minData, secData]) => {
        if (!mounted) return;
        if (minData?.ministries) {
          setMinistries(minData.ministries);
          if (minData.pagination) setMinistriesPagination(minData.pagination);
        }
        if (secData?.request_sectors) {
          setSectors(secData.request_sectors);
          if (secData.pagination) setSectorsPagination(secData.pagination);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        showError(err.message || "فشل تحميل الكتالوجات المرجعية");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [canManage, showError]);

  // Handle Tab Switch
  const handleTabSwitch = (tab) => {
    if (tab === activeCatalog) return;
    setActiveCatalog(tab);
    setSearchInput("");
    setStatusFilter("all");
  };

  // Compact Summary Statistics (dynamically computed from state)
  const summaryStats = useMemo(() => {
    const totalMinistries = ministries.length;
    const activeMinistries = ministries.filter((m) => m.is_active).length;
    const totalSectors = sectors.length;
    const activeSectors = sectors.filter((s) => s.is_active).length;

    return {
      totalMinistries,
      activeMinistries,
      totalSectors,
      activeSectors,
    };
  }, [ministries, sectors]);

  // Status Counts for active tab
  const { activeCount, inactiveCount } = useMemo(() => {
    let act = 0;
    let inact = 0;
    activeRecords.forEach((item) => {
      if (item.is_active) act += 1;
      else inact += 1;
    });
    return { activeCount: act, inactiveCount: inact };
  }, [activeRecords]);

  // Client-Side Search and Filter
  const filteredRecords = useMemo(() => {
    let list = activeRecords;

    // Status filter
    if (statusFilter === "active") {
      list = list.filter((item) => item.is_active);
    } else if (statusFilter === "inactive") {
      list = list.filter((item) => !item.is_active);
    }

    // Search filter
    const query = searchInput.trim().toLowerCase();
    if (query) {
      list = list.filter((item) => {
        const nameMatch = item.name_ar?.toLowerCase().includes(query);
        const keyMatch = isMinistry
          ? item.slug?.toLowerCase().includes(query)
          : item.code?.toLowerCase().includes(query);
        return nameMatch || keyMatch;
      });
    }

    return list;
  }, [activeRecords, statusFilter, searchInput, isMinistry]);

  // Toggle Active Status
  const handleToggleStatus = async (item) => {
    if (updatingStatusId === item.id) return;
    setUpdatingStatusId(item.id);

    const targetEndpoint = isMinistry
      ? `/api/admin/ministries/${item.id}/status`
      : `/api/admin/request-sectors/${item.id}/status`;

    const newStatus = !item.is_active;

    try {
      await adminFetch(targetEndpoint, {
        method: "PATCH",
        body: JSON.stringify({ is_active: newStatus }),
      });

      // Optimistic update in state
      if (isMinistry) {
        setMinistries((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, is_active: newStatus } : m)),
        );
      } else {
        setSectors((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, is_active: newStatus } : s)),
        );
      }

      showSuccess(
        newStatus
          ? `تم اعتماد وتفعيل "${item.name_ar}" بنجاح`
          : `تم تعطيل "${item.name_ar}" مؤقتاً`,
      );
    } catch (err) {
      showError(err.message || "فشل تغيير حالة النشاط");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Copy Key (Slug or Code)
  const handleCopyKey = (val) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(val);
    showSuccess("تم نسخ المعرف إلى الحافظة");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Callback when item is created or updated
  const handleItemSaved = (savedItem, isEdit) => {
    if (isMinistry) {
      if (isEdit) {
        setMinistries((prev) =>
          prev
            .map((m) => (m.id === savedItem.id ? { ...m, ...savedItem } : m))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id),
        );
      } else {
        fetchMinistries(ministriesPagination.page, false);
      }
    } else {
      if (isEdit) {
        setSectors((prev) =>
          prev
            .map((s) => (s.id === savedItem.id ? { ...s, ...savedItem } : s))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id),
        );
      } else {
        fetchSectors(sectorsPagination.page, false);
      }
    }
  };

  // Action Menu items for each row
  const getActionMenuItems = (item) => [
    {
      label: "تعديل البيانات",
      icon: <Pencil className="size-4 text-gold-dark" />,
      onClick: () => {
        setEditingItem(item);
        setIsEditorOpen(true);
      },
    },
    {
      label: item.is_active ? "تعطيل مؤقتاً" : "اعتماد وتفعيل",
      icon: item.is_active ? (
        <XCircle className="size-4 text-rose-600" />
      ) : (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ),
      onClick: () => handleToggleStatus(item),
    },
    {
      label: isMinistry ? "نسخ المعرف اللطيف" : "نسخ كود القطاع",
      icon: <Copy className="size-4 text-muted" />,
      onClick: () => handleCopyKey(isMinistry ? item.slug : item.code),
    },
  ];

  // RBAC Access Guard View
  if (!loading && !canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] p-6 text-center animate-elem-fade-in" dir="rtl">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm mb-4">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-lg font-black text-ink mb-1.5">
          غير مصرح لك بالوصول إلى إدارة الكتالوجات
        </h2>
        <p className="text-xs text-muted max-w-md">
          إدارة كتالوج الوزارات والقطاعات الخدمية تتطلب صلاحيات إدارة الخدمات (مسؤول الخدمات أو مدير النظام).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-elem-fade-up">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl sm:rounded-3xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs shrink-0">
            <Landmark className="size-6 sm:size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-gold-tint/80 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark border border-gold/30">
                <span>الكتالوجات المرجعية الرسمية</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              الوزارات والقطاعات
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              إدارة وتوثيق الكتالوجات المرجعية المعتمدة لطلبات الخدمات والتنسيق الحكومي
            </p>
          </div>
        </div>

        {/* Action Buttons: Refresh & Contextual Add */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (isMinistry) fetchMinistries(ministriesPagination.page, false);
              else fetchSectors(sectorsPagination.page, false);
            }}
            disabled={refreshing || loading}
            className="flex size-11 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/40 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className={`size-4 ${refreshing ? "animate-spin text-gold-dark" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3 text-xs sm:text-sm font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)] hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>{isMinistry ? "إضافة وزارة" : "إضافة قطاع"}</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-elem-fade-up">
        {/* Card 1: Total Ministries */}
        <div className="group relative rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:-translate-y-0.5 hover:border-gold/50 transition-all duration-300">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">إجمالي الوزارات</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs group-hover:scale-105 transition-transform">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-ink font-mono group-hover:text-gold-dark transition-colors">
              {toArabicDigits(summaryStats.totalMinistries)}
            </span>
            <span className="text-[11px] text-muted">وزارة حكومية</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
            <span>الكتالوج المعتمد</span>
            <span className="font-bold text-ink">حكومي</span>
          </div>
        </div>

        {/* Card 2: Active Ministries */}
        <div className="group relative rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:-translate-y-0.5 hover:border-gold/50 transition-all duration-300">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">الوزارات المعتمدة</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-ink font-mono group-hover:text-emerald-700 transition-colors">
              {toArabicDigits(summaryStats.activeMinistries)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold">نشطة ومتاحة</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
            <span>تظهر للجمهور</span>
            <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Total Sectors */}
        <div className="group relative rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:-translate-y-0.5 hover:border-gold/50 transition-all duration-300">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">إجمالي القطاعات</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs group-hover:scale-105 transition-transform">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-ink font-mono group-hover:text-gold-dark transition-colors">
              {toArabicDigits(summaryStats.totalSectors)}
            </span>
            <span className="text-[11px] text-muted">قطاع خدمي</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
            <span>ملفات الخدمة</span>
            <span className="font-bold text-ink">تخصصي</span>
          </div>
        </div>

        {/* Card 4: Active Sectors */}
        <div className="group relative rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:-translate-y-0.5 hover:border-gold/50 transition-all duration-300">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">القطاعات المعتمدة</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-ink font-mono group-hover:text-emerald-700 transition-colors">
              {toArabicDigits(summaryStats.activeSectors)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold">نشطة ومتاحة</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
            <span>متاحة للتقديم</span>
            <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. Primary Segmented Tabs: Ministries vs Request Sectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-page/80 border border-line shadow-2xs w-full sm:w-auto sm:inline-flex animate-elem-fade-up">
        <button
          type="button"
          onClick={() => handleTabSwitch("ministries")}
          className={`group relative flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-3 rounded-xl px-4 sm:px-6 py-3 sm:py-2.5 text-xs sm:text-sm font-bold cursor-pointer transition-all duration-300 ease-out active:scale-95 select-none whitespace-nowrap min-w-0 ${
            isMinistry
              ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] border border-gold/60 scale-[1.01] sm:scale-[1.02] hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)]"
              : "bg-white text-muted border border-line shadow-2xs hover:border-gold/60 hover:text-gold-dark hover:bg-gold-tint/50 hover:shadow-xs hover:scale-[1.01] sm:hover:scale-105 sm:hover:-translate-y-0.5"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Building2
              className={`size-4 shrink-0 transition-transform duration-300 ${
                isMinistry ? "text-ink" : "text-muted group-hover:text-gold-dark group-hover:scale-110"
              }`}
            />
            <span className="whitespace-nowrap">الوزارات الحكومية</span>
          </div>
          <span
            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono shrink-0 transition-all duration-300 ${
              isMinistry
                ? "bg-ink text-white shadow-2xs"
                : "bg-page text-muted border border-line/60 group-hover:border-gold/40 group-hover:bg-gold-tint group-hover:text-gold-dark group-hover:scale-110"
            }`}
          >
            {toArabicDigits(ministries.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("request_sectors")}
          className={`group relative flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-3 rounded-xl px-4 sm:px-6 py-3 sm:py-2.5 text-xs sm:text-sm font-bold cursor-pointer transition-all duration-300 ease-out active:scale-95 select-none whitespace-nowrap min-w-0 ${
            !isMinistry
              ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] border border-gold/60 scale-[1.01] sm:scale-[1.02] hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)]"
              : "bg-white text-muted border border-line shadow-2xs hover:border-gold/60 hover:text-gold-dark hover:bg-gold-tint/50 hover:shadow-xs hover:scale-[1.01] sm:hover:scale-105 sm:hover:-translate-y-0.5"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers
              className={`size-4 shrink-0 transition-transform duration-300 ${
                !isMinistry ? "text-ink" : "text-muted group-hover:text-gold-dark group-hover:scale-110"
              }`}
            />
            <span className="whitespace-nowrap">القطاعات الخدمية</span>
          </div>
          <span
            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono shrink-0 transition-all duration-300 ${
              !isMinistry
                ? "bg-ink text-white shadow-2xs"
                : "bg-page text-muted border border-line/60 group-hover:border-gold/40 group-hover:bg-gold-tint group-hover:text-gold-dark group-hover:scale-110"
            }`}
          >
            {toArabicDigits(sectors.length)}
          </span>
        </button>
      </div>

      {/* 4. Toolbar: Status Filter Tabs + Search Input */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 animate-elem-fade-up">
        {/* Status Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1.5 rounded-2xl bg-page/80 border border-line shadow-2xs w-full md:w-auto">
          {[
            { id: "all", label: "جميع العناصر", count: activeRecords.length },
            { id: "active", label: "المعتمدة والنشطة", count: activeCount },
            { id: "inactive", label: "المعطلة مؤقتاً", count: inactiveCount },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`group relative flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-2.5 rounded-xl px-4 sm:px-4 py-2.5 sm:py-2 text-xs font-bold cursor-pointer transition-all duration-300 ease-out active:scale-95 select-none whitespace-nowrap min-w-0 ${
                  isActive
                    ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] border border-gold/60 scale-[1.01] sm:scale-[1.03] hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)]"
                    : "bg-white text-muted border border-line shadow-2xs hover:border-gold/60 hover:text-gold-dark hover:bg-gold-tint/50 hover:shadow-xs hover:scale-[1.01] sm:hover:scale-105 sm:hover:-translate-y-0.5"
                }`}
              >
                <span className="whitespace-nowrap">{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold font-mono shrink-0 transition-all duration-300 ${
                    isActive
                      ? "bg-ink text-white shadow-2xs"
                      : "bg-page text-muted border border-line/60 group-hover:border-gold/40 group-hover:bg-gold-tint group-hover:text-gold-dark group-hover:scale-110"
                  }`}
                >
                  {toArabicDigits(tab.count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Instant Search Bar styled identically to the website form */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              isMinistry
                ? "بحث باسم الوزارة أو المعرف اللطيف (Slug)..."
                : "بحث باسم القطاع أو الكود (Code)..."
            }
            className="h-14 w-full rounded-2xl border border-border bg-white pr-4 pl-12 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <Search className="size-5" />
          </span>
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute left-11 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-lg text-xs font-bold text-muted hover:bg-gold-tint hover:text-gold-dark hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Records Container: Desktop Table & Mobile Cards */}
      <div className="rounded-3xl border border-line bg-white shadow-2xs overflow-hidden animate-elem-fade-up">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex size-14 mx-auto items-center justify-center rounded-3xl bg-gold-tint/60 text-gold-dark border border-gold/30 mb-3.5">
              {isMinistry ? (
                <Building2 className="size-7" />
              ) : (
                <Layers className="size-7" />
              )}
            </div>
            <h3 className="text-sm font-black text-ink mb-1">
              {searchInput || statusFilter !== "all"
                ? "لا توجد نتائج مطابقة لشروط الفلترة الحالية"
                : isMinistry
                  ? "لم يتم تسجيل أي وزارات حتى الآن"
                  : "لم يتم تسجيل أي قطاعات حتى الآن"}
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto mb-4">
              {searchInput || statusFilter !== "all"
                ? "جرّب تغيير كلمات البحث أو إعادة ضبط فلتر الحالة لعرض كافة العناصر."
                : `يمكنك البدء بإضافة أول ${isMinistry ? "وزارة حكومية" : "قطاع خدمي"} عبر الزر أعلاه.`}
            </p>
            {searchInput || statusFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setStatusFilter("all");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-page/60 px-4 py-2 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/40 transition-colors cursor-pointer"
              >
                <span>إعادة ضبط الفلاتر</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsEditorOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-2.5 text-xs font-black text-ink shadow-btn hover:brightness-110 transition-all cursor-pointer"
              >
                <Plus className="size-4" />
                <span>إضافة أول عنصر الآن</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg:block) */}
            <div className="hidden lg:block">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-3 w-[8%]"># المعرف</th>
                    <th className="py-4 px-3 w-[30%]">
                      {isMinistry ? "الوزارة الحكومية" : "القطاع الخدمي"}
                    </th>
                    <th className="py-4 px-3 w-[20%]">
                      {isMinistry ? "المعرف اللطيف (Slug)" : "كود القطاع (Code)"}
                    </th>
                    <th className="py-4 px-3 w-[12%] text-center">ترتيب العرض</th>
                    {isMinistry && (
                      <th className="py-4 px-3 w-[16%]">تاريخ التسجيل</th>
                    )}
                    <th className="py-4 px-3 w-[14%] text-center">حالة الاعتماد</th>
                    <th className="py-4 pr-3 pl-6 sm:pl-8 w-[10%] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredRecords.map((item) => {
                    const menuItems = getActionMenuItems(item);
                    const isUpdating = updatingStatusId === item.id;
                    const keyVal = isMinistry ? item.slug : item.code;

                    return (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-gold-tint/25"
                      >
                        {/* ID */}
                        <td className="py-4 pr-6 pl-3 font-mono font-bold text-muted">
                          #{toArabicDigits(item.id)}
                        </td>

                        {/* Name & Icon */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 text-gold-dark shadow-2xs group-hover:border-gold/50 transition-colors">
                              {isMinistry ? (
                                <Building2 className="size-4" />
                              ) : (
                                <Layers className="size-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block font-black text-ink group-hover:text-gold-dark transition-colors truncate">
                                {item.name_ar}
                              </span>
                              <span className="block text-[11px] text-muted truncate">
                                {isMinistry ? "جهة حكومية معتمدة" : "ملف خدمي معتمد"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Slug or Code with Copy Button */}
                        <td className="py-4 px-3">
                          <button
                            type="button"
                            onClick={() => handleCopyKey(keyVal)}
                            className="group/key inline-flex items-center gap-1.5 rounded-xl border border-line bg-page/50 px-2.5 py-1 font-mono text-[11px] font-bold text-ink hover:border-gold hover:bg-gold-tint/40 transition-all cursor-pointer"
                            title="انقر لنسخ المعرف"
                          >
                            <span>{keyVal}</span>
                            {copiedKey === keyVal ? (
                              <Check className="size-3 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="size-3 text-muted group-hover/key:text-gold-dark shrink-0 transition-colors" />
                            )}
                          </button>
                        </td>

                        {/* Sort Order */}
                        <td className="py-4 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-ink bg-page/60 px-2.5 py-0.5 rounded-lg border border-line">
                            <Hash className="size-3 text-muted" />
                            <span>{toArabicDigits(item.sort_order ?? 0)}</span>
                          </span>
                        </td>

                        {/* Registration Date (only when available for ministries) */}
                        {isMinistry && (
                          <td className="py-4 px-3 text-muted text-[11px]">
                            {item.created_at ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="size-3 text-muted shrink-0" />
                                <span>{formatDate(item.created_at)}</span>
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        )}

                        {/* Active Status Badge + Toggle */}
                        <td className="py-4 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            disabled={isUpdating}
                            className="group/badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="انقر لتبديل حالة النشاط"
                          >
                            {isUpdating ? (
                              <Spinner size="xs" color="gold" />
                            ) : item.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 group-hover/badge:border-emerald-300">
                                <span className="size-1.5 rounded-full bg-emerald-600" />
                                <span>معتمد ونشط</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 group-hover/badge:border-rose-300">
                                <span className="size-1.5 rounded-full bg-rose-500" />
                                <span>معطل مؤقتاً</span>
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pr-3 pl-6 sm:pl-8 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsEditorOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
                              title="تعديل البيانات"
                            >
                              <Pencil className="size-3 text-gold-dark" />
                              <span>تعديل</span>
                            </button>

                            <ActionDropdown items={menuItems} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (lg:hidden) */}
            <div className="lg:hidden divide-y divide-line/70">
              {filteredRecords.map((item) => {
                const isUpdating = updatingStatusId === item.id;
                const keyVal = isMinistry ? item.slug : item.code;

                return (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-gold-tint/15 transition-colors">
                    {/* Top Row: Name, ID & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page text-gold-dark shadow-2xs">
                          {isMinistry ? (
                            <Building2 className="size-4" />
                          ) : (
                            <Layers className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-black text-ink truncate">
                            {item.name_ar}
                          </h4>
                          <span className="text-[11px] font-mono text-muted">
                            #{toArabicDigits(item.id)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={isUpdating}
                        className="shrink-0 cursor-pointer"
                        title="انقر لتبديل حالة النشاط"
                      >
                        {isUpdating ? (
                          <Spinner size="xs" color="gold" />
                        ) : item.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            <span className="size-1.5 rounded-full bg-emerald-600" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
                            <span className="size-1.5 rounded-full bg-rose-500" />
                            <span>معطل</span>
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Middle Row: Key & Sort Order */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(keyVal)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page/60 px-2.5 py-1 font-mono font-bold text-ink cursor-pointer"
                        title="انقر لنسخ المعرف"
                      >
                        <span>{keyVal}</span>
                        {copiedKey === keyVal ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3 text-muted" />
                        )}
                      </button>

                      <div className="inline-flex items-center gap-1 text-muted font-bold">
                        <span>الترتيب:</span>
                        <span className="font-mono text-ink font-black bg-page/60 px-2 py-0.5 rounded border border-line">
                          {toArabicDigits(item.sort_order ?? 0)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Date & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/50">
                      <span className="text-[10px] text-muted">
                        {isMinistry && item.created_at
                          ? `تسجيل: ${formatDate(item.created_at)}`
                          : "مرجعية معتمدة"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsEditorOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
                        >
                          <Pencil className="size-3 text-gold-dark" />
                          <span>تعديل</span>
                        </button>
                        <ActionDropdown items={getActionMenuItems(item)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 6. Pagination Bar (if total_pages > 1) */}
        {activePagination.total_pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-line bg-page/40 text-xs">
            <span className="text-muted font-bold">
              عرض الصفحة {toArabicDigits(activePagination.page)} من إجمالي{" "}
              {toArabicDigits(activePagination.total_pages)} صفحة (
              {toArabicDigits(activePagination.total)} عنصر مسجل)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={activePagination.page <= 1 || loading}
                onClick={() => {
                  const targetPage = activePagination.page - 1;
                  if (isMinistry) fetchMinistries(targetPage, true);
                  else fetchSectors(targetPage, true);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 font-bold text-ink shadow-2xs hover:border-gold hover:bg-gold-tint/40 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="size-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                disabled={activePagination.page >= activePagination.total_pages || loading}
                onClick={() => {
                  const targetPage = activePagination.page + 1;
                  if (isMinistry) fetchMinistries(targetPage, true);
                  else fetchSectors(targetPage, true);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 font-bold text-ink shadow-2xs hover:border-gold hover:bg-gold-tint/40 disabled:opacity-40 cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Editor Modal (Create / Edit) */}
      <CatalogEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        type={activeCatalog}
        onSaved={handleItemSaved}
      />
    </div>
  );
}
