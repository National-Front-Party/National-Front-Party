"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import ArticleEditorModal from "@/components/Admin/News/ArticleEditorModal";
import ArticleReviewModal from "@/components/Admin/News/ArticleReviewModal";
import ArticleDeleteModal from "@/components/Admin/News/ArticleDeleteModal";
import ArticleDetailsModal from "@/components/Admin/News/ArticleDetailsModal";

// Convert numbers to Arabic-Indic digits
function toArabicDigits(num) {
  if (num === null || num === undefined) return "٠";
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// Format relative/full date in Arabic
function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

// Status definitions and styling
const STATUS_CONFIG = {
  draft: {
    label: "مسودة",
    tone: "bg-slate-100 text-slate-800 border-slate-200",
    dot: "bg-slate-500",
  },
  pending_review: {
    label: "قيد المراجعة",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-600",
  },
  changes_requested: {
    label: "مطلوب تعديلات",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
  },
  published: {
    label: "منشور",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
};

// Fallback seed sources if API is restricted or database has no loaded sources yet
const FALLBACK_SOURCES = [
  { id: 1, name_ar: "اليوم السابع", slug: "youm7", is_active: true },
  { id: 2, name_ar: "صفحة الحزب الرسمية", slug: "party-fb", is_active: true },
];

export default function NewsPage() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const role = user?.role;
  const canView = canAccess(role, "news");
  const isSuperAdmin = role === "super_admin";
  const isReviewer = role === "news_reviewer";
  const isEditor = role === "news_editor";

  // Data & Pagination
  const [articles, setArticles] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");

  // Catalogs
  const [sourcesList, setSourcesList] = useState(FALLBACK_SOURCES);
  const [staffList, setStaffList] = useState([]);

  // Modals state
  const [editingArticle, setEditingArticle] = useState(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  const [reviewArticle, setReviewArticle] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [detailsArticle, setDetailsArticle] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [targetDeleteArticle, setTargetDeleteArticle] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Load News Sources (if super_admin, fetch directly; otherwise rely on fallbacks and articles list)
  useEffect(() => {
    let mounted = true;
    if (isSuperAdmin) {
      adminFetch("/api/admin/news/sources")
        .then((data) => {
          if (mounted && Array.isArray(data?.sources) && data.sources.length > 0) {
            setSourcesList(data.sources.filter((s) => s.is_active));
          }
        })
        .catch(() => {
          // Graceful fallback to default seed sources
          if (mounted) setSourcesList(FALLBACK_SOURCES);
        });
    }

    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  // Load Staff List (for author filter in super_admin view)
  useEffect(() => {
    let mounted = true;
    if (isSuperAdmin) {
      adminFetch("/api/admin/staff")
        .then((data) => {
          if (mounted && Array.isArray(data?.staff)) {
            setStaffList(
              data.staff.filter((s) => s.is_active && (s.role === "news_editor" || s.role === "super_admin" || s.role === "news_reviewer")),
            );
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [isSuperAdmin]);

  // Fetch Articles
  const fetchArticles = useCallback(
    async (pageToLoad = 1) => {
      if (!user || !canView) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("page", String(pageToLoad));
        queryParams.set("page_size", String(pagination.page_size));

        if (statusFilter) queryParams.set("status", statusFilter);
        if (sourceFilter) queryParams.set("source_id", sourceFilter);
        if (featuredFilter) queryParams.set("is_featured", featuredFilter);
        if (authorFilter && (isSuperAdmin || isReviewer)) {
          queryParams.set("author_id", authorFilter);
        }

        const trimmed = searchInput.trim();
        if (trimmed) queryParams.set("search", trimmed);

        const data = await adminFetch(`/api/admin/news/articles?${queryParams.toString()}`);
        const loadedArticles = Array.isArray(data?.articles) ? data.articles : [];

        setArticles(loadedArticles);
        if (data?.pagination) {
          setPagination(data.pagination);
        }

        // Merge any new sources encountered in loaded articles
        if (loadedArticles.length > 0) {
          setSourcesList((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            for (const a of loadedArticles) {
              if (a.source && !map.has(a.source.id)) {
                map.set(a.source.id, a.source);
              }
            }
            return Array.from(map.values());
          });
        }
      } catch (err) {
        showError(err.message || "تعذر تحميل الأخبار والمقالات");
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      canView,
      pagination.page_size,
      statusFilter,
      sourceFilter,
      featuredFilter,
      authorFilter,
      isSuperAdmin,
      isReviewer,
      searchInput,
      showError,
    ],
  );

  // Sync fetch on filter changes
  useEffect(() => {
    let mounted = true;
    const queryParams = new URLSearchParams();
    queryParams.set("page", "1");
    queryParams.set("page_size", String(pagination.page_size));

    if (statusFilter) queryParams.set("status", statusFilter);
    if (sourceFilter) queryParams.set("source_id", sourceFilter);
    if (featuredFilter) queryParams.set("is_featured", featuredFilter);
    if (authorFilter && (isSuperAdmin || isReviewer)) {
      queryParams.set("author_id", authorFilter);
    }

    const trimmed = searchInput.trim();
    if (trimmed) queryParams.set("search", trimmed);

    adminFetch(`/api/admin/news/articles?${queryParams.toString()}`)
      .then((data) => {
        if (!mounted) return;
        const loaded = Array.isArray(data?.articles) ? data.articles : [];
        setArticles(loaded);
        if (data?.pagination) setPagination(data.pagination);
        setLoading(false);

        // Merge sources from articles
        if (loaded.length > 0) {
          setSourcesList((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            for (const a of loaded) {
              if (a.source && !map.has(a.source.id)) {
                map.set(a.source.id, a.source);
              }
            }
            return Array.from(map.values());
          });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        showError(err.message || "تعذر تحميل الأخبار والمقالات");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    pagination.page_size,
    statusFilter,
    sourceFilter,
    featuredFilter,
    authorFilter,
    isSuperAdmin,
    isReviewer,
    searchInput,
    showError,
  ]);

  // Action: Submit for review
  const handleSubmitForReview = async (article) => {
    setActionInProgressId(article.id);
    try {
      await adminFetch(`/api/admin/news/articles/${article.id}/submit`, {
        method: "POST",
      });
      showSuccess(`تم إرسال المقال «${article.title}» للمراجعة بنجاح`);
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, status: "pending_review" } : a)),
      );
    } catch (err) {
      showError(err.message || "تعذر إرسال المقال للمراجعة");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Action: Unpublish article
  const handleUnpublish = async (article) => {
    setActionInProgressId(article.id);
    try {
      await adminFetch(`/api/admin/news/articles/${article.id}/unpublish`, {
        method: "POST",
      });
      showSuccess(`تم سحب المقال «${article.title}» من النشر وإعادته كمسودة`);
      setArticles((prev) =>
        prev.map((a) =>
          a.id === article.id ? { ...a, status: "draft", is_published: false } : a,
        ),
      );
    } catch (err) {
      showError(err.message || "تعذر إلغاء نشر المقال");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArticles(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setLoading(true);
    setSearchInput("");
    setStatusFilter("");
    setSourceFilter("");
    setAuthorFilter("");
    setFeaturedFilter("");
  };

  const hasActiveFilters = Boolean(
    searchInput || statusFilter || sourceFilter || authorFilter || featuredFilter,
  );

  // Dropdown options
  const sourceOptions = useMemo(
    () => [
      { value: "", label: "جميع المصادر الإعلامية" },
      ...sourcesList.map((s) => ({
        value: String(s.id),
        label: s.name_ar,
      })),
    ],
    [sourcesList],
  );

  // Author options: merge staff list and any author found in articles
  const authorOptions = useMemo(() => {
    const map = new Map();
    for (const s of staffList) {
      map.set(s.id, s.full_name);
    }
    for (const a of articles) {
      if (a.created_by_user?.id && !map.has(a.created_by_user.id)) {
        map.set(a.created_by_user.id, a.created_by_user.full_name);
      }
    }
    return [
      { value: "", label: "جميع المحررين والكتّاب" },
      ...Array.from(map.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ];
  }, [staffList, articles]);

  const featuredOptions = useMemo(
    () => [
      { value: "", label: "جميع المقالات (المميزة والعادية)" },
      { value: "true", label: "المقالات المميزة فقط ★" },
      { value: "false", label: "المقالات العادية فقط" },
    ],
    [],
  );

  // Unauthorized view
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
          قسم تحرير ومراجعة الأخبار متاح فقط للمحررين والمراجعين ومديري النظام.
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
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-elem-fade-up">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              الأخبار والمقالات الصحفية
            </h1>
            <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
              {toArabicDigits(pagination.total)} مقال
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            إدارة دورة حياة المقالات والتقارير الصحفية ونشرها وتدقيقها لتوثيق أنشطة الحزب
          </p>
        </div>

        {/* Action Button: Create New Article (Allowed for super_admin and news_editor) */}
        {(isSuperAdmin || isEditor) && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingArticle(null);
                setIsEditorModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3 text-xs font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ مقال صحفي جديد</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Role Context Banners */}
      {isEditor && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-center justify-between gap-3 text-xs font-bold text-amber-900 animate-elem-fade-up">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-sm">
              ✍️
            </span>
            <span>
              أنت مسجل كـ <strong>«محرر أخبار»</strong>: يتم عرض مقالاتك الصحفية الخاصة فقط، ويمكنك إنشاء مسودات جديدة وتعديلها وإرسالها للمراجعة.
            </span>
          </div>
          <span className="rounded-full bg-white border border-amber-300 px-3 py-1 text-[11px] font-black shrink-0">
            مقالاتي الخاصة فقط
          </span>
        </div>
      )}

      {isReviewer && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 flex items-center justify-between gap-3 text-xs font-bold text-sky-800 animate-elem-fade-up">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 text-sm">
              ✓
            </span>
            <span>
              أنت مسجل كـ <strong>«مراجع أخبار»</strong>: يمكنك مراجعة وتدقيق كافة مقالات المحررين، واعتماد ونشر المقالات أو إرجاعها بطلب تعديلات.
            </span>
          </div>
          <span className="rounded-full bg-white border border-sky-300 px-3 py-1 text-[11px] font-black shrink-0">
            تدقيق واعتماد
          </span>
        </div>
      )}

      {/* 3. Status Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-page/70 border border-line shadow-2xs [scrollbar-width:none] animate-elem-fade-up">
        {[
          { id: "", label: "جميع الحالات" },
          { id: "draft", label: "مسودة" },
          { id: "pending_review", label: "قيد المراجعة" },
          { id: "changes_requested", label: "مطلوب تعديلات" },
          { id: "published", label: "منشور" },
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

      {/* 4. Search and Filters Card styled identically to the website form */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-card animate-elem-fade-up">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              isSuperAdmin || isReviewer ? "lg:grid-cols-5" : "lg:grid-cols-4"
            } gap-3.5 items-center`}
          >
            {/* Search Input: h-14, rounded-2xl, border-border, gold focus shadow */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث في عنوان أو نص المقال..."
                className="h-14 w-full rounded-2xl border border-border bg-white pr-4 pl-12 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>

            {/* Author Filter: Visible only for super_admin and news_reviewer */}
            {(isSuperAdmin || isReviewer) && (
              <div>
                <CustomSelect
                  id="filter-author"
                  placeholder="جميع المحررين والكتّاب"
                  options={authorOptions}
                  value={authorFilter}
                  onChange={(val) => {
                    setLoading(true);
                    setAuthorFilter(val);
                  }}
                />
              </div>
            )}

            {/* Source Filter: Website CustomSelect */}
            <div>
              <CustomSelect
                id="filter-source"
                placeholder="جميع المصادر الإعلامية"
                options={sourceOptions}
                value={sourceFilter}
                onChange={(val) => {
                  setLoading(true);
                  setSourceFilter(val);
                }}
              />
            </div>

            {/* Featured Filter: Website CustomSelect */}
            <div>
              <CustomSelect
                id="filter-featured"
                placeholder="حالة التمييز"
                options={featuredOptions}
                value={featuredFilter}
                onChange={(val) => {
                  setLoading(true);
                  setFeaturedFilter(val);
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

      {/* 5. Articles Data Table Card */}
      <div className="rounded-3xl border border-line bg-white shadow-card overflow-hidden animate-elem-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                <th className="py-4 px-5">المقال الصحفي</th>
                <th className="py-4 px-5">المصدر</th>
                <th className="py-4 px-5">الكاتب / المحرر</th>
                <th className="py-4 px-5">الحالة</th>
                <th className="py-4 px-5">تاريخ النشر</th>
                <th className="py-4 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                // Skeletons while loading
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Skeleton width="48px" height="48px" rounded="rounded-xl" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton width="220px" height="18px" rounded="rounded-md" />
                          <Skeleton width="120px" height="14px" rounded="rounded-md" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5"><Skeleton width="90px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="100px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5"><Skeleton width="80px" height="22px" rounded="rounded-full" /></td>
                    <td className="py-4 px-5"><Skeleton width="90px" height="16px" rounded="rounded-md" /></td>
                    <td className="py-4 px-5 text-center"><Skeleton width="140px" height="30px" rounded="rounded-xl" /></td>
                  </tr>
                ))
              ) : articles.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
                        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                      <p className="text-sm font-extrabold text-ink">لم يتم العثور على أي مقالات صحفية</p>
                      <p className="text-xs text-muted max-w-sm">
                        {hasActiveFilters
                          ? "لا توجد نتائج تطابق معايير البحث والفلترة الحالية، جرّب تغيير الفلاتر."
                          : "لم يتم إنشاء أي مقالات حتى الآن في هذا القسم."}
                      </p>
                      {(isSuperAdmin || isEditor) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingArticle(null);
                            setIsEditorModalOpen(true);
                          }}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-4 py-2 text-xs font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <span>إنشاء أول مقال صحفي</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map((art) => {
                  const statusCfg = STATUS_CONFIG[art.status] || {
                    label: art.status,
                    tone: "bg-page text-muted border-line",
                    dot: "bg-muted",
                  };
                  const isAuthor = Boolean(user?.id && art.created_by === user.id);
                  const canEdit = isSuperAdmin || (isAuthor && (art.status === "draft" || art.status === "changes_requested"));
                  const canSubmit = isSuperAdmin || (isAuthor && (art.status === "draft" || art.status === "changes_requested"));
                  const canReview = (isSuperAdmin || isReviewer) && art.status === "pending_review";
                  const canUnpublish = (isSuperAdmin || isReviewer) && art.status === "published";

                  return (
                    <tr key={art.id} className="hover:bg-page/40 transition-colors">
                      {/* Title & Preview Image */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-line bg-page flex items-center justify-center">
                            {art.image_url ? (
                              <Image
                                src={art.image_url}
                                alt={art.image_alt || art.title}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="text-xl">📰</span>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0 max-w-md">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailsArticle(art);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="font-bold text-ink text-xs sm:text-sm hover:text-gold-dark text-right transition-colors line-clamp-1"
                                title={art.title}
                              >
                                {art.title}
                              </button>

                              {art.is_featured && (
                                <span className="inline-flex items-center rounded-md bg-gold-tint border border-gold/40 px-1.5 py-0.2 text-[10px] font-black text-gold-dark shrink-0">
                                  ★ مميز
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-muted">
                              <span className="font-mono truncate" dir="ltr">
                                {art.slug}
                              </span>
                              {art.review_note && art.status === "changes_requested" && (
                                <span className="text-rose-700 font-bold flex items-center gap-1">
                                  <span>•</span>
                                  <span>ملاحظة مراجعة متوفرة</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-4 px-5">
                        <span className="rounded-lg bg-page border border-line px-2.5 py-1 text-[11px] font-bold text-ink inline-block">
                          {art.source_name || art.source?.name_ar || "—"}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-ink text-xs block">
                            {art.created_by_user?.full_name || "—"}
                          </span>
                          {isAuthor && (
                            <span className="text-[10px] font-bold text-gold-dark block">
                              (أنت المؤلف)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${statusCfg.tone}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* Published Date */}
                      <td className="py-4 px-5 text-muted font-mono text-[11px]">
                        {formatDate(art.published_on)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Quick Submit for Review Button */}
                          {canSubmit && (
                            <button
                              type="button"
                              disabled={actionInProgressId === art.id}
                              onClick={() => handleSubmitForReview(art)}
                              className="inline-flex items-center gap-1 rounded-xl bg-gold-gradient px-2.5 py-1.5 text-[11px] font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                              title="إرسال المقال للمراجعة والاعتماد"
                            >
                              {actionInProgressId === art.id ? (
                                <Spinner size="xs" color="ink" />
                              ) : (
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <line x1="22" y1="2" x2="11" y2="13" />
                                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                              )}
                              <span>إرسال للمراجعة</span>
                            </button>
                          )}

                          {/* Quick Review & Publish Button */}
                          {canReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewArticle(art);
                                setIsReviewModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-btn hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all"
                              title="تدقيق واعتماد أو طلب تعديلات"
                            >
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>مراجعة واعتماد</span>
                            </button>
                          )}

                          {/* Quick Unpublish Button */}
                          {canUnpublish && (
                            <button
                              type="button"
                              disabled={actionInProgressId === art.id}
                              onClick={() => handleUnpublish(art)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                              title="سحب المقال وإعادته إلى المسودات"
                            >
                              {actionInProgressId === art.id ? (
                                <Spinner size="xs" color="ink" />
                              ) : (
                                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                              )}
                              <span>سحب من النشر</span>
                            </button>
                          )}

                          {/* Edit Button */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingArticle(art);
                                setIsEditorModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs"
                              title="تعديل المقال"
                            >
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                              </svg>
                              <span>تعديل</span>
                            </button>
                          )}

                          {/* Details Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsArticle(art);
                              setIsDetailsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs"
                            title="عرض تفاصيل المقال"
                          >
                            <span>التفاصيل</span>
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>

                          {/* Permanent Delete Button (super_admin only) */}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetDeleteArticle(art);
                                setIsDeleteModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center size-8 rounded-xl border border-line bg-white text-muted hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:scale-105 active:scale-95 transition-all shadow-2xs"
                              title="حذف المقال نهائياً"
                              aria-label="حذف المقال"
                            >
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Bar */}
        {!loading && pagination.total_pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line bg-page/30 px-6 py-4">
            <span className="text-xs text-muted">
              عرض الصفحة <strong>{toArabicDigits(pagination.page)}</strong> من إجمالي{" "}
              <strong>{toArabicDigits(pagination.total_pages)}</strong> صفحة (إجمالي{" "}
              <strong>{toArabicDigits(pagination.total)}</strong> مقال)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchArticles(pagination.page - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-all shadow-2xs"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>السابق</span>
              </button>

              <span className="px-2 text-xs font-mono font-bold text-ink">
                {toArabicDigits(pagination.page)} / {toArabicDigits(pagination.total_pages)}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchArticles(pagination.page + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-all shadow-2xs"
              >
                <span>التالي</span>
                <svg className="size-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Modals */}
      {/* Article Editor Modal */}
      <ArticleEditorModal
        key={editingArticle?.id || "new-article-modal"}
        isOpen={isEditorModalOpen}
        article={editingArticle}
        sources={sourcesList}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditingArticle(null);
        }}
        onSaved={() => {
          fetchArticles(pagination.page);
        }}
      />

      {/* Article Review Modal */}
      <ArticleReviewModal
        key={reviewArticle?.id || "review-modal"}
        isOpen={isReviewModalOpen}
        article={reviewArticle}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewArticle(null);
        }}
        onUpdated={() => {
          fetchArticles(pagination.page);
        }}
      />

      {/* Article Details Modal */}
      <ArticleDetailsModal
        key={detailsArticle?.id || "details-modal"}
        isOpen={isDetailsModalOpen}
        article={detailsArticle}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsArticle(null);
        }}
      />

      {/* Article Delete Modal */}
      <ArticleDeleteModal
        key={targetDeleteArticle?.id || "delete-modal"}
        isOpen={isDeleteModalOpen}
        article={targetDeleteArticle}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTargetDeleteArticle(null);
        }}
        onDeleted={() => {
          fetchArticles(pagination.page);
        }}
      />
    </div>
  );
}
