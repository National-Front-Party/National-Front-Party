"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Globe,
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
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import ActionDropdown from "@/components/Admin/ui/ActionDropdown";
import SourceEditorModal from "@/components/Admin/News/SourceEditorModal";

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

export default function NewsSourcesPage() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const isSuperAdmin = user?.role === "super_admin";

  // Data & Pagination
  const [sources, setSources] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'active' | 'inactive'
  const [searchInput, setSearchInput] = useState("");

  // Modals & Action loading
  const [editingSource, setEditingSource] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [knownHasSources, setKnownHasSources] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteInFlightRef = useRef(false);

  // Fetch sources from API
  const fetchSources = useCallback(
    async (page = 1, showSpinner = false) => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          page_size: "25",
        });

        if (statusTab === "active") queryParams.set("is_active", "true");
        if (statusTab === "inactive") queryParams.set("is_active", "false");

        const data = await adminFetch(`/api/admin/news/sources?${queryParams.toString()}`);
        if (data && data.sources) {
          setSources(data.sources);
          if (data.pagination) {
            setPagination(data.pagination);
            if (statusTab === "all") {
              setKnownHasSources(data.pagination.total > 0);
            } else if (data.pagination.total > 0) {
              setKnownHasSources(true);
            }
          }
        }
      } catch (err) {
        showError(err.message || "تعذر تحميل قائمة مصادر الأخبار");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSuperAdmin, statusTab, showError],
  );

  // Initial and reactive load on statusTab or superAdmin change
  useEffect(() => {
    let mounted = true;
    if (!isSuperAdmin) {
      return;
    }

    const queryParams = new URLSearchParams({
      page: "1",
      page_size: "25",
    });

    if (statusTab === "active") queryParams.set("is_active", "true");
    if (statusTab === "inactive") queryParams.set("is_active", "false");

    adminFetch(`/api/admin/news/sources?${queryParams.toString()}`)
      .then((data) => {
        if (!mounted) return;
        if (data?.sources) {
          setSources(data.sources);
          if (data.pagination) {
            setPagination(data.pagination);
            if (statusTab === "all") {
              setKnownHasSources(data.pagination.total > 0);
            } else if (data.pagination.total > 0) {
              setKnownHasSources(true);
            }
          }
        }
      })
      .catch((err) => {
        if (!mounted) return;
        showError(err.message || "تعذر تحميل قائمة مصادر الأخبار");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isSuperAdmin, statusTab, showError]);

  // Client-side search filtering
  const filteredSources = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter(
      (s) =>
        s.name_ar?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q),
    );
  }, [sources, searchInput]);

  // Counts for tabs
  const activeCount = useMemo(
    () => sources.filter((s) => s.is_active).length,
    [sources],
  );
  const inactiveCount = useMemo(
    () => sources.filter((s) => !s.is_active).length,
    [sources],
  );

  // Toggle active/inactive status
  const handleToggleStatus = async (source) => {
    if (updatingStatusId === source.id) return;

    setUpdatingStatusId(source.id);
    const nextStatus = !source.is_active;

    try {
      await adminFetch(`/api/admin/news/sources/${source.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextStatus }),
      });

      // Update local state optimistically
      setSources((prev) =>
        prev.map((s) =>
          s.id === source.id ? { ...s, is_active: nextStatus } : s,
        ),
      );

      showSuccess(
        nextStatus
          ? `تم تفعيل واعتماد المصدر «${source.name_ar}» بنجاح`
          : `تم تعطيل المصدر «${source.name_ar}» مؤقتاً`,
      );
    } catch (err) {
      showError(err.message || "تعذر تغيير حالة المصدر الإعلامي");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Copy slug to clipboard
  const handleCopySlug = (slugText) => {
    navigator.clipboard?.writeText(slugText);
    setCopiedSlug(slugText);
    showSuccess(`تم نسخ المعرف (${slugText}) إلى الحافظة`);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const openDeleteConfirmation = (request) => {
    setDeleteError("");
    setDeleteRequest(request);
  };

  const closeDeleteConfirmation = () => {
    if (deleteInFlightRef.current) return;
    setDeleteError("");
    setDeleteRequest(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteRequest || deleteInFlightRef.current) return;

    deleteInFlightRef.current = true;
    setDeleteSubmitting(true);
    setDeleteError("");

    const isBulk = deleteRequest.type === "all";
    try {
      const result = await adminFetch(
        isBulk
          ? "/api/admin/news/sources"
          : `/api/admin/news/sources/${deleteRequest.source.id}`,
        {
          method: "DELETE",
          body: { confirm: true },
        },
      );

      if (isBulk) {
        const deletedCount = Number(result?.deleted_count) || 0;
        showSuccess(`تم حذف ${toArabicDigits(deletedCount)} مصدر صحفي بنجاح`);
        setKnownHasSources(false);
        setDeleteRequest(null);
        fetchSources(1, false);
      } else {
        showSuccess(`تم حذف المصدر «${deleteRequest.source.name_ar}» بنجاح`);
        const nextPage =
          sources.length === 1 && pagination.page > 1
            ? pagination.page - 1
            : pagination.page;
        if (statusTab === "all" && pagination.total <= 1) {
          setKnownHasSources(false);
        }
        setDeleteRequest(null);
        fetchSources(nextPage, false);
      }
    } catch (error) {
      const message =
        error?.code === "SOURCE_IN_USE"
          ? isBulk
            ? "لم يتم حذف أي مصدر؛ بعض المصادر مرتبطة بمقالات."
            : `لا يمكن حذف المصدر «${deleteRequest.source.name_ar}» لارتباط مقالات به.`
          : error?.message ||
            (isBulk
              ? "تعذر حذف مصادر الأخبار. يرجى المحاولة مرة أخرى."
              : "تعذر حذف المصدر الصحفي. يرجى المحاولة مرة أخرى.");
      setDeleteError(message);
      showError(message);
    } finally {
      deleteInFlightRef.current = false;
      setDeleteSubmitting(false);
    }
  };

  useEffect(() => {
    if (!deleteRequest) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deleteInFlightRef.current) {
        event.preventDefault();
        closeDeleteConfirmation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteRequest]);

  // Get dropdown items for a source
  const getSourceMenuItems = (source) => [
    {
      id: "edit",
      label: "تعديل بيانات المصدر",
      icon: <Pencil className="size-4 text-gold-dark" />,
      onClick: () => {
        setEditingSource(source);
        setIsEditorOpen(true);
      },
    },
    {
      id: "toggle-status",
      label: source.is_active ? "تعطيل المصدر مؤقتاً" : "تفعيل واعتماد المصدر",
      tone: source.is_active ? "danger" : "success",
      icon: source.is_active ? (
        <XCircle className="size-4 text-rose-600" />
      ) : (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ),
      onClick: () => handleToggleStatus(source),
    },
    { divider: true },
    {
      id: "copy-slug",
      label: "نسخ المعرف اللطيف (Slug)",
      icon: <Copy className="size-4 text-muted" />,
      onClick: () => handleCopySlug(source.slug),
    },
    { divider: true },
    {
      id: "delete",
      label: "حذف المصدر نهائياً",
      tone: "danger",
      icon: <Trash2 className="size-4 text-rose-600" />,
      onClick: () => openDeleteConfirmation({ type: "single", source }),
    },
  ];

  // RBAC Access Guard: Only super_admin can manage news sources
  if (!isSuperAdmin) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-3xl border border-rose-500/20 bg-rose-50/50 p-8 sm:p-12 text-center shadow-card animate-elem-fade-up">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-2xs mb-4">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="text-xl font-black text-ink mb-2">غير مصرح بالوصول</h2>
          <p className="max-w-md mx-auto text-sm text-muted mb-6 leading-relaxed">
            صفحة إدارة وتوثيق مصادر الأخبار مخصصة حصرياً لمدير النظام (Super Admin). يرجى الرجوع للوحة التحكم الرئيسية أو صفحة الأخبار.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/admin/news"
              className="rounded-2xl border border-line bg-white px-5 py-2.5 text-xs font-bold text-ink hover:border-gold hover:text-gold-dark transition-all"
            >
              الذهاب إلى الأخبار
            </Link>
            <Link
              href="/admin"
              className="rounded-2xl bg-gold-gradient px-5 py-2.5 text-xs font-black text-ink shadow-btn hover:brightness-110 transition-all"
            >
              الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full" dir="rtl">
      {/* 1. Page Header (Open, Breathable, Unboxed Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-elem-fade-up">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-gold-tint text-gold-dark shadow-2xs">
            <Globe className="size-6 sm:size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                مصادر الأخبار المعتمدة
              </h1>
              <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
                {toArabicDigits(pagination.total)} مصدر
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted">
              إدارة وتوثيق الصحف والمواقع الإخبارية والمنصات الصحفية المعتمدة لتوثيق مقالات الحزب
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex w-full flex-wrap items-center gap-2.5 shrink-0 sm:w-auto sm:flex-nowrap">
          <button
            type="button"
            onClick={() => fetchSources(pagination.page, false)}
            disabled={refreshing || loading}
            className="flex size-11 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/40 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className={`size-4 ${refreshing ? "animate-spin text-gold-dark" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => openDeleteConfirmation({ type: "all" })}
            disabled={loading || deleteSubmitting || knownHasSources === false}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-black text-rose-700 shadow-2xs transition-all hover:border-rose-400 hover:bg-rose-100 hover:text-rose-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
            title="Delete All News Sources"
          >
            <Trash2 className="size-4 shrink-0" />
            <span>حذف الكل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSource(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3 text-xs sm:text-sm font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)] hover:scale-[1.02] active:scale-95 cursor-pointer sm:flex-none"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>إضافة مصدر جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Controls Toolbar (Tabs + Search on the same clean row without heavy box wrappers) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 animate-elem-fade-up">
        {/* Status Filter Tabs */}
        <div className="flex sm:inline-flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-page/80 border border-line shadow-2xs w-full sm:w-auto overflow-hidden">
          {[
            { id: "all", label: "جميع المصادر", shortLabel: "الكل", count: sources.length },
            { id: "active", label: "المصادر المعتمدة", shortLabel: "المعتمدة", count: activeCount },
            { id: "inactive", label: "المعطلة مؤقتاً", shortLabel: "المعطلة", count: inactiveCount },
          ].map((tab) => {
            const isActive = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                className={`group relative flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-4 py-2 text-xs font-bold cursor-pointer transition-all duration-200 ease-out active:scale-95 select-none min-w-0 ${
                  isActive
                    ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] border border-gold/60 scale-[1.01] sm:scale-[1.03] hover:brightness-110"
                    : "bg-white text-muted border border-line shadow-2xs hover:border-gold/50 hover:text-ink hover:bg-gold-tint/40 hover:scale-105"
                }`}
              >
                <span className="truncate">
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                    isActive
                      ? "bg-ink text-white"
                      : "bg-page text-muted group-hover:bg-gold-tint group-hover:text-ink"
                  }`}
                >
                  {toArabicDigits(tab.count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar (Clean and compact, seamlessly integrated) */}
        <div className="relative w-full md:w-80 shrink-0">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث فوري باسم المصدر أو المعرف..."
            className="h-11 w-full rounded-2xl border border-line bg-white pr-4 pl-10 text-right text-xs font-medium text-ink shadow-2xs transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
          />
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <Search className="size-4" />
          </span>
        </div>
      </div>

      {/* 4. News Sources Listing Container */}
      <div className="rounded-3xl border border-line bg-white shadow-card overflow-hidden animate-elem-fade-up">
        {loading ? (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <Skeleton className="h-6 w-48 rounded-xl" />
              <Skeleton className="h-6 w-24 rounded-xl" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <Skeleton className="h-8 w-1/4 rounded-xl" />
                <Skeleton className="h-8 w-1/5 rounded-xl" />
                <Skeleton className="h-8 w-1/6 rounded-xl" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs mb-4">
              <Globe className="size-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-ink mb-1">
              {searchInput
                ? "لا توجد مصادر مطابقة لبحثك"
                : "لم يتم تسجيل أي مصادر إخبارية بعد"}
            </h3>
            <p className="max-w-md mx-auto text-xs sm:text-sm text-muted mb-6 leading-relaxed">
              {searchInput
                ? "جرب كتابة اسم مختلف أو معرف لطيف آخر للبحث في المصادر المعتمدة."
                : "يمكنك إضافة أول مصدر إعلامي معتمد مثل الجرائد والمواقع الصحفية الرسمية لربطه بمقالات الحزب."}
            </p>
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="rounded-2xl border border-line bg-white px-5 py-2.5 text-xs font-bold text-ink hover:border-gold hover:text-gold-dark transition-all"
              >
                مسح البحث
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingSource(null);
                  setIsEditorOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-2.5 text-xs font-black text-ink shadow-btn hover:brightness-110 transition-all"
              >
                <Plus className="size-4" />
                <span>إضافة أول مصدر الآن</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (hidden lg:block) - Zero horizontal scrolling */}
            <div className="hidden lg:block">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-3 w-[10%]"># المعرف</th>
                    <th className="py-4 px-3 w-[32%]">المصدر الصحفي</th>
                    <th className="py-4 px-3 w-[22%]">المعرف اللطيف (Slug)</th>
                    <th className="py-4 px-3 w-[12%] text-center">ترتيب العرض</th>
                    <th className="py-4 px-3 w-[12%]">حالة الاعتماد</th>
                    <th className="py-4 pr-3 pl-6 sm:pl-8 w-[12%] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredSources.map((source) => {
                    const menuItems = getSourceMenuItems(source);
                    const isUpdating = updatingStatusId === source.id;

                    return (
                      <tr
                        key={source.id}
                        className="group transition-colors hover:bg-gold-tint/25"
                      >
                        {/* ID */}
                        <td className="py-4 pr-6 pl-3 font-mono font-bold text-muted">
                          #{source.id}
                        </td>

                        {/* Arabic Name & Icon */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page/80 text-gold-dark shadow-2xs group-hover:border-gold/50 transition-colors">
                              <Globe className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block font-black text-ink group-hover:text-gold-dark transition-colors truncate">
                                {source.name_ar}
                              </span>
                              <span className="block text-[11px] text-muted truncate">
                                تم التسجيل: {formatDate(source.created_at)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Slug with Copy Button */}
                        <td className="py-4 px-3">
                          <button
                            type="button"
                            onClick={() => handleCopySlug(source.slug)}
                            className="group/slug inline-flex items-center gap-1.5 rounded-xl border border-line bg-page/50 px-2.5 py-1 font-mono text-[11px] font-bold text-ink hover:border-gold hover:bg-gold-tint/40 transition-all cursor-pointer"
                            title="انقر لنسخ المعرف اللطيف"
                          >
                            <span>{source.slug}</span>
                            {copiedSlug === source.slug ? (
                              <Check className="size-3 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="size-3 text-muted group-hover/slug:text-gold-dark shrink-0 transition-colors" />
                            )}
                          </button>
                        </td>

                        {/* Sort Order */}
                        <td className="py-4 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-ink">
                            <Hash className="size-3 text-muted" />
                            <span>{toArabicDigits(source.sort_order ?? 0)}</span>
                          </span>
                        </td>

                        {/* Status Badge & Fast Toggle */}
                        <td className="py-4 px-3">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleToggleStatus(source)}
                            className={`group/status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-all cursor-pointer ${
                              source.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            }`}
                            title={
                              source.is_active
                                ? "انقر للتعطيل المؤقت"
                                : "انقر لتفعيل واعتماد المصدر"
                            }
                          >
                            {isUpdating ? (
                              <Spinner size="xs" color="ink" />
                            ) : (
                              <span
                                className={`size-1.5 rounded-full ${
                                  source.is_active ? "bg-emerald-600" : "bg-rose-600"
                                }`}
                              />
                            )}
                            <span>{source.is_active ? "معتمد ونشط" : "معطل مؤقتاً"}</span>
                          </button>
                        </td>

                        {/* Actions: Edit button + ActionDropdown */}
                        <td className="py-4 pr-3 pl-6 sm:pl-8">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSource(source);
                                setIsEditorOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                              title="تعديل بيانات المصدر"
                            >
                              <Pencil className="size-3.5" />
                              <span>تعديل</span>
                            </button>

                            <ActionDropdown
                              items={menuItems}
                              label={`إجراءات المصدر #${source.id}`}
                            />
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
                {filteredSources.map((source) => {
                  const menuItems = getSourceMenuItems(source);
                  const isUpdating = updatingStatusId === source.id;

                  return (
                    <div
                      key={source.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-gold/50 transition-all duration-300"
                    >
                      {/* Card Top: Badges & ID */}
                      <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
                        <span className="font-mono text-xs font-bold text-muted">
                          #{source.id}
                        </span>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleStatus(source)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                            source.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {isUpdating ? (
                            <Spinner size="xs" color="ink" />
                          ) : (
                            <span
                              className={`size-1.5 rounded-full ${
                                source.is_active ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                          )}
                          <span>{source.is_active ? "معتمد ونشط" : "معطل مؤقتاً"}</span>
                        </button>
                      </div>

                      {/* Card Body: Name, Slug, Sort Order */}
                      <div className="my-3 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-page text-gold-dark">
                            <Globe className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-ink text-sm sm:text-base truncate">
                              {source.name_ar}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-muted">المعرف اللطيف:</span>
                          <button
                            type="button"
                            onClick={() => handleCopySlug(source.slug)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-ink bg-page/70 px-2 py-0.5 rounded-lg border border-line"
                          >
                            <span>{source.slug}</span>
                            <Copy className="size-3 text-muted" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">ترتيب العرض:</span>
                          <span className="font-mono font-bold text-ink">
                            {toArabicDigits(source.sort_order ?? 0)}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Creation Date & Actions */}
                      <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-muted font-mono">
                          <Calendar className="size-3" />
                          <span>{formatDate(source.created_at)}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSource(source);
                              setIsEditorOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                            <span>تعديل</span>
                          </button>

                          <ActionDropdown
                            items={menuItems}
                            label={`إجراءات المصدر #${source.id}`}
                          />
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
              <span> من إجمالي </span>
              <strong className="text-ink">{toArabicDigits(pagination.total)}</strong>
              <span> مصدر إعلامي</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchSources(pagination.page - 1)}
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-ink transition-all hover:border-gold hover:bg-gold-tint/40 disabled:opacity-40 cursor-pointer shadow-2xs"
                title="الصفحة السابقة"
              >
                <ChevronRight className="size-4" />
              </button>

              <span className="px-2 font-mono text-xs text-ink font-bold">
                {toArabicDigits(pagination.page)} / {toArabicDigits(pagination.total_pages)}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages || loading}
                onClick={() => fetchSources(pagination.page + 1)}
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-ink transition-all hover:border-gold hover:bg-gold-tint/40 disabled:opacity-40 cursor-pointer shadow-2xs"
                title="الصفحة التالية"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Source Editor Modal (Add/Edit) */}
      <SourceEditorModal
        isOpen={isEditorOpen}
        source={editingSource}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingSource(null);
        }}
        onSaved={() => {
          fetchSources(pagination.page, false);
        }}
      />

      {deleteRequest && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-xs sm:items-center sm:p-5"
          dir="rtl"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDeleteConfirmation();
          }}
        >
          <section
            className="my-auto w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-line bg-white p-4 shadow-card-hover animate-elem-fade-up sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-source-delete-title"
            aria-describedby="news-source-delete-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
                  <Trash2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="news-source-delete-title" className="text-base font-black text-ink sm:text-lg">
                    {deleteRequest.type === "all" ? "تأكيد حذف جميع المصادر" : "تأكيد حذف المصدر"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    حذف نهائي لا يمكن التراجع عنه.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={deleteSubmitting}
                aria-label="إغلاق نافذة التأكيد"
                className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
                title="إغلاق"
              >
                <svg
                  className="size-5 transition-transform duration-300 group-hover:rotate-90"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div
              id="news-source-delete-description"
              className="mt-5 space-y-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm leading-relaxed text-rose-950"
            >
              {deleteRequest.type === "all" ? (
                <>
                  <p className="font-black">
                    سيتم محاولة حذف جميع مصادر الأخبار في قاعدة البيانات، وليس المصادر الظاهرة في الصفحة أو نتائج الفلترة فقط.
                  </p>
                  <p className="text-xs text-rose-800">
                    إذا كان أي مصدر مستخدماً في مقال، فلن يتم حذف أي مصدر.
                  </p>
                </>
              ) : (
                <>
                  <p>هل تريد حذف هذا المصدر نهائياً؟</p>
                  <p className="break-words rounded-xl border border-rose-200 bg-white p-3 font-black">
                    {deleteRequest.source.name_ar}
                  </p>
                  <p className="text-xs text-rose-800">
                    لا يمكن حذف مصدر مرتبط بمقال. لن يتم حذف المقالات أو تعديلها.
                  </p>
                </>
              )}
            </div>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-800"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 break-words">{deleteError}</span>
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line/70 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={deleteSubmitting}
                className="rounded-xl border border-line bg-white px-5 py-3 text-xs font-bold text-muted transition hover:border-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                aria-busy={deleteSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-xs font-black text-white shadow-btn transition hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5"
              >
                {deleteSubmitting ? <Spinner size="xs" color="white" /> : <Trash2 className="size-4" />}
                <span>
                  {deleteSubmitting
                    ? "جارٍ الحذف..."
                    : deleteRequest.type === "all"
                      ? "تأكيد حذف الكل"
                      : "تأكيد الحذف"}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
