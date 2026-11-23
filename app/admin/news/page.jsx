"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Trash2,
  Clock,
  Calendar,
  User,
  Search,
  Plus,
  RotateCcw,
  Send,
  Pencil,
  MessageSquareText,
  Newspaper,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { canAccess } from "@/lib/admin/permissions";
import { canEditNewsArticle, canReviewNewsArticle, canSubmitNewsArticle, isNewsArticleAuthor } from "@/lib/news/ui-permissions.js";
import Spinner from "@/components/Admin/ui/Spinner";
import Skeleton from "@/components/Admin/ui/Skeleton";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import ActionDropdown from "@/components/Admin/ui/ActionDropdown";
import ArticleEditorModal from "@/components/Admin/News/ArticleEditorModal";
import ArticleReviewModal from "@/components/Admin/News/ArticleReviewModal";
import ArticleDeleteModal from "@/components/Admin/News/ArticleDeleteModal";
import ArticleDetailsModal from "@/components/Admin/News/ArticleDetailsModal";
import ReviewNotesModal from "@/components/Admin/News/ReviewNotesModal";

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
  const [sourcesList, setSourcesList] = useState([]);
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

  const [reviewNotesArticle, setReviewNotesArticle] = useState(null);
  const [isReviewNotesModalOpen, setIsReviewNotesModalOpen] = useState(false);

  const [actionInProgressId, setActionInProgressId] = useState(null);

  // Load News Sources from DB (strictly active sources only)
  useEffect(() => {
    let mounted = true;
    adminFetch("/api/admin/news/article-sources")
      .then((data) => {
        if (mounted && Array.isArray(data?.sources)) {
          setSourcesList(data.sources.filter((s) => s && s.is_active === true));
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Load Staff List (for author filter in super_admin view)
  useEffect(() => {
    let mounted = true;
    if (isSuperAdmin) {
      adminFetch("/api/admin/staff")
        .then((data) => {
          if (mounted && Array.isArray(data?.staff)) {
            setStaffList(
              data.staff.filter(
                (s) =>
                  s.is_active &&
                  (s.role === "news_editor" ||
                    s.role === "super_admin" ||
                    s.role === "news_reviewer"),
              ),
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

  // Action: Submit for review with intelligent repeated-click handling
  const handleSubmitForReview = useCallback(
    async (article) => {
      // 1. If already pending review, display friendly informational notice and do NOT send duplicate request
      if (article.status === "pending_review") {
        showSuccess("تم بالفعل إرسال هذا المقال للمراجعة مسبقاً وهو قيد التدقيق والاعتماد.");
        return;
      }

      // 2. Prevent accidental repeated clicks while request is processing
      if (actionInProgressId === article.id) return;

      setActionInProgressId(article.id);
      try {
        await adminFetch(`/api/admin/news/articles/${article.id}/submit`, {
          method: "POST",
        });

        showSuccess(`تم إرسال المقال «${article.title}» للمراجعة والاعتماد بنجاح`);

        // Immediately update UI to pending_review
        setArticles((prev) =>
          prev.map((a) => (a.id === article.id ? { ...a, status: "pending_review" } : a)),
        );
      } catch (err) {
        // If backend indicates already submitted or invalid transition, handle gracefully
        if (
          err.message === "INVALID_STATUS_TRANSITION" ||
          err.error === "INVALID_STATUS_TRANSITION"
        ) {
          showSuccess("هذا المقال مرسل بالفعل للمراجعة أو تمت مراجعته مسبقاً.");
          setArticles((prev) =>
            prev.map((a) => (a.id === article.id ? { ...a, status: "pending_review" } : a)),
          );
        } else {
          showError(err.message || "تعذر إرسال المقال للمراجعة");
        }
      } finally {
        setActionInProgressId(null);
      }
    },
    [actionInProgressId, showSuccess, showError],
  );

  // Action: Unpublish article
  const handleUnpublish = useCallback(
    async (article) => {
      if (actionInProgressId === article.id) return;
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
    },
    [actionInProgressId, showSuccess, showError],
  );

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

  // Build Row Actions Menu Items
  const getRowMenuItems = useCallback(
    (art) => {
      const items = [];
      const isAuthor = isNewsArticleAuthor(art, user);
      const canEdit = canEditNewsArticle(role, isAuthor, art.status);
      const canSubmit = canSubmitNewsArticle(role, isAuthor, art.status);
      const canReview = canReviewNewsArticle(role, isAuthor, art.status);
      const canUnpublish =
        isSuperAdmin && art.status === "published";

      // 1. Details
      items.push({
        id: "details",
        label: "عرض تفاصيل المقال",
        icon: <Eye className="size-4 text-ink" />,
        onClick: () => {
          setDetailsArticle(art);
          setIsDetailsModalOpen(true);
        },
      });

      // 2. View Review Notes (if changes_requested)
      if (art.status === "changes_requested") {
        items.push({
          id: "review-notes",
          label: "عرض التعديلات المطلوبة",
          icon: <MessageSquareText className="size-4 text-amber-700" />,
          tone: "accent",
          onClick: () => {
            setReviewNotesArticle(art);
            setIsReviewNotesModalOpen(true);
          },
        });
      }

      // 3. Edit (if permitted)
      if (canEdit) {
        items.push({
          id: "edit",
          label: "تعديل محتوى المقال",
          icon: <Pencil className="size-4 text-gold-dark" />,
          onClick: () => {
            setEditingArticle(art);
            setIsEditorModalOpen(true);
          },
        });
      }

      // 4. Submit for review (if permitted and status is draft or changes_requested)
      if (canSubmit && (art.status === "draft" || art.status === "changes_requested")) {
        items.push({
          id: "submit-review",
          label: "إرسال للمراجعة والاعتماد",
          icon: <Send className="size-4 text-sky-700" />,
          onClick: () => handleSubmitForReview(art),
        });
      }

      // 5. Review & Publish (for reviewer/super_admin when pending_review)
      if (canReview) {
        items.push({
          id: "review",
          label: "تدقيق واعتماد النشر",
          icon: <CheckCircle2 className="size-4 text-emerald-700" />,
          tone: "success",
          onClick: () => {
            setReviewArticle(art);
            setIsReviewModalOpen(true);
          },
        });
      }

      // 6. Unpublish (when published)
      if (canUnpublish) {
        items.push({
          id: "unpublish",
          label: "سحب المقال من النشر",
          icon: <RotateCcw className="size-4 text-amber-700" />,
          onClick: () => handleUnpublish(art),
        });
      }

      // 7. Delete (super_admin only)
      if (isSuperAdmin) {
        items.push({ divider: true });
        items.push({
          id: "delete",
          label: "حذف المقال نهائياً",
          icon: <Trash2 className="size-4 text-rose-600" />,
          tone: "danger",
          onClick: () => {
            setTargetDeleteArticle(art);
            setIsDeleteModalOpen(true);
          },
        });
      }

      return items;
    },
    [user, role, isSuperAdmin, handleSubmitForReview, handleUnpublish],
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
          قسم تحرير ومراجعة الأخبار متاح فقط للمحررين والمراجعين ومديري النظام.
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
              className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3 text-xs font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>مقال صحفي جديد</span>
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

      {/* 3. Status Segmented Tabs - Zero scroll responsive control */}
      <div className="flex w-full sm:w-auto sm:inline-flex items-center gap-0.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-page/70 border border-line shadow-2xs overflow-hidden animate-elem-fade-up">
        {[
          { id: "", label: "جميع الحالات", shortLabel: "الكل" },
          { id: "draft", label: "مسودة", shortLabel: "مسودة" },
          { id: "pending_review", label: "قيد المراجعة", shortLabel: "مراجعة" },
          { id: "changes_requested", label: "مطلوب تعديلات", shortLabel: "تعديلات" },
          { id: "published", label: "منشور", shortLabel: "منشور" },
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

      {/* 4. Search and Filters Card styled identically to the website form */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-card animate-elem-fade-up">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div
            className={`grid min-w-0 grid-cols-1 items-center gap-3 sm:grid-cols-2 2xl:gap-3.5 ${
              isSuperAdmin || isReviewer ? "2xl:grid-cols-5" : "2xl:grid-cols-4"
            }`}
          >
            {/* Search Input: h-14, rounded-2xl, border-border, gold focus shadow */}
            <div className="relative min-w-0">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث في عنوان أو نص المقال..."
                className="h-14 w-full min-w-0 rounded-2xl border border-border bg-white pr-3 pl-10 text-right text-[11px] 2xl:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <Search className="size-5" />
              </span>
            </div>

            {/* Author Filter: Visible only for super_admin and news_reviewer */}
            {(isSuperAdmin || isReviewer) && (
              <div className="min-w-0">
                <CustomSelect
                  id="filter-author"
                  fitContent
                  fixedHeight
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
            <div className="min-w-0">
              <CustomSelect
                id="filter-source"
                fitContent
                fixedHeight
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
            <div className="min-w-0">
              <CustomSelect
                id="filter-featured"
                fitContent
                fixedHeight
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

      {/* 5. Articles Data Presentation (Responsive - No Table Scrolling) */}
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
                  <Skeleton width="48px" height="48px" rounded="rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton width="220px" height="18px" rounded="rounded-md" />
                    <Skeleton width="120px" height="14px" rounded="rounded-md" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <Skeleton width="90px" height="16px" rounded="rounded-md" />
                  <Skeleton width="80px" height="20px" rounded="rounded-full" />
                </div>
                <Skeleton width="120px" height="32px" rounded="rounded-xl" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          // Empty state
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
                <Newspaper className="size-7" />
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
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-4 py-2 text-xs font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>إنشاء أول مقال صحفي</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Wide Desktop Table View; use cards while the dashboard content column is constrained */}
            <div className="hidden min-[1728px]:block w-full">
              <table className="w-full text-right text-xs table-fixed">
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-3 w-[36%]">المقال الصحفي</th>
                    <th className="py-4 px-3 w-[15%]">المصدر</th>
                    <th className="py-4 px-3 w-[14%]">الكاتب / المحرر</th>
                    <th className="py-4 px-3 w-[12%]">الحالة</th>
                    <th className="py-4 px-3 w-[10%]">تاريخ النشر</th>
                    <th className="py-4 pr-3 pl-6 sm:pl-8 w-[13%] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {articles.map((art) => {
                    const statusCfg = STATUS_CONFIG[art.status] || {
                      label: art.status,
                      tone: "bg-page text-muted border-line",
                      dot: "bg-muted",
                    };
                    const isAuthor = isNewsArticleAuthor(art, user);
                    const canEdit = canEditNewsArticle(role, isAuthor, art.status);
                    const canSubmit = canSubmitNewsArticle(role, isAuthor, art.status);
                    const canReview = canReviewNewsArticle(role, isAuthor, art.status);
                    const menuItems = getRowMenuItems(art);

                    return (
                      <tr key={art.id} className="hover:bg-gold-tint/25 transition-colors group">
                        {/* Title & Preview Image */}
                        <td className="py-4 pr-6 pl-3">
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
                                <Newspaper className="size-5 text-muted/60" />
                              )}
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailsArticle(art);
                                    setIsDetailsModalOpen(true);
                                  }}
                                  className="font-bold text-ink text-xs sm:text-sm hover:text-gold-dark text-right transition-colors line-clamp-1 cursor-pointer"
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

                                {/* Review Notes Quick Badge/Button */}
                                {art.status === "changes_requested" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReviewNotesArticle(art);
                                      setIsReviewNotesModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs"
                                    title="عرض ملاحظات وتوجيهات المراجع"
                                  >
                                    <MessageSquareText className="size-3 text-amber-700" />
                                    <span>ملاحظات المراجع</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Source */}
                        <td className="py-4 px-3">
                          <span className="rounded-lg bg-page border border-line px-2.5 py-1 text-[11px] font-bold text-ink inline-block truncate max-w-[140px]" title={art.source_name || art.source?.name_ar || "—"}>
                            {art.source_name || art.source?.name_ar || "—"}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="py-4 px-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-ink text-xs block truncate" title={art.created_by_user?.full_name || "—"}>
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
                        <td className="py-4 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${statusCfg.tone}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                            <span>{statusCfg.label}</span>
                          </span>
                        </td>

                        {/* Published Date */}
                        <td className="py-4 px-3 text-muted font-mono text-[11px] truncate">
                          {formatDate(art.published_on || art.created_at)}
                        </td>

                        {/* Actions: Primary Action Button + Three-dot Menu */}
                        <td className="py-4 pr-3 pl-6 sm:pl-8">
                          <div className="flex items-center justify-center gap-2">
                            {/* Primary Action Button based on status & role */}
                            {art.status === "changes_requested" && !canReview ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewNotesArticle(art);
                                  setIsReviewNotesModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="عرض التعديلات المطلوبة"
                              >
                                <MessageSquareText className="size-3.5 text-amber-700" />
                                <span>عرض التعديلات</span>
                              </button>
                            ) : canReview ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewArticle(art);
                                  setIsReviewModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="تدقيق واعتماد النشر"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span>مراجعة</span>
                              </button>
                            ) : canSubmit && (art.status === "draft" || art.status === "changes_requested") ? (
                              <button
                                type="button"
                                disabled={actionInProgressId === art.id}
                                onClick={() => handleSubmitForReview(art)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-3 py-1.5 text-xs font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                title="إرسال المقال للمراجعة والاعتماد"
                              >
                                {actionInProgressId === art.id ? (
                                  <Spinner size="xs" color="ink" />
                                ) : (
                                  <Send className="size-3.5" />
                                )}
                                <span>إرسال للمراجعة</span>
                              </button>
                            ) : art.status === "pending_review" ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 shadow-2xs"
                                role="status"
                              >
                                <Clock className="size-3.5 text-sky-600" />
                                <span>قيد المراجعة</span>
                              </span>
                            ) : canEdit ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingArticle(art);
                                  setIsEditorModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="تعديل المقال"
                              >
                                <Pencil className="size-3.5" />
                                <span>تعديل</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailsArticle(art);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="عرض تفاصيل المقال"
                              >
                                <Eye className="size-3.5" />
                                <span>التفاصيل</span>
                              </button>
                            )}

                            {/* Secondary Actions Dropdown */}
                            <ActionDropdown items={menuItems} label={`إجراءات المقال ${art.title}`} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Responsive Card Layout for mobile, tablet, and laptop content widths */}
            <div className="block min-[1728px]:hidden min-w-0 p-3 sm:p-4 lg:p-5 bg-page/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.map((art) => {
                  const statusCfg = STATUS_CONFIG[art.status] || {
                    label: art.status,
                    tone: "bg-page text-muted border-line",
                    dot: "bg-muted",
                  };
                  const isAuthor = isNewsArticleAuthor(art, user);
                  const canEdit = canEditNewsArticle(role, isAuthor, art.status);
                  const canSubmit = canSubmitNewsArticle(role, isAuthor, art.status);
                  const canReview = canReviewNewsArticle(role, isAuthor, art.status);
                  const menuItems = getRowMenuItems(art);

                  return (
                    <div
                      key={art.id}
                      className="group relative flex min-w-0 flex-col justify-between rounded-2xl border border-line bg-white p-3 sm:p-4 shadow-2xs hover:shadow-card hover:border-gold/50 transition-all duration-300"
                    >
                      {/* Card Top: Badges & Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusCfg.tone}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                          {art.is_featured && (
                            <span className="inline-flex items-center rounded-md bg-gold-tint border border-gold/40 px-1.5 py-0.2 text-[10px] font-black text-gold-dark">
                              ★ مميز
                            </span>
                          )}
                        </div>

                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted font-mono">
                          <Calendar className="size-3" />
                          <span>{formatDate(art.published_on || art.created_at)}</span>
                        </span>
                      </div>

                      {/* Card Body: Thumbnail, Title, Source, Author */}
                      <div className="my-3 min-w-0 space-y-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-line bg-page flex items-center justify-center">
                            {art.image_url ? (
                              <Image
                                src={art.image_url}
                                alt={art.image_alt || art.title}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <Newspaper className="size-6 text-muted/60" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsArticle(art);
                                setIsDetailsModalOpen(true);
                              }}
                              className="w-full min-w-0 whitespace-normal break-words text-right font-black text-sm text-ink group-hover:text-gold-dark transition-colors [overflow-wrap:anywhere] cursor-pointer"
                            >
                              {art.title}
                            </button>
                            <span className="block whitespace-normal break-all text-[11px] font-mono text-muted" dir="ltr">
                              {art.slug}
                            </span>
                          </div>
                        </div>

                        {/* Source and Author tags */}
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-1 border-t border-line/40">
                          <span className="inline-block min-w-0 max-w-full whitespace-normal break-words rounded-md bg-page border border-line px-2 py-0.5 font-bold text-ink [overflow-wrap:anywhere]">
                            {art.source_name || art.source?.name_ar || "—"}
                          </span>

                          <span className="flex min-w-0 max-w-full items-start gap-1">
                            <User className="size-3 text-gold-dark" />
                            <span className="min-w-0 whitespace-normal break-words font-bold text-ink [overflow-wrap:anywhere]">
                              {art.created_by_user?.full_name || "—"}
                            </span>
                          </span>
                        </div>

                        {/* Prominent Review Notes Card Banner (for changes_requested) */}
                        {art.status === "changes_requested" && (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewNotesArticle(art);
                              setIsReviewNotesModalOpen(true);
                            }}
                            className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:scale-[1.02] active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <MessageSquareText className="size-4 text-amber-700" />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">ملاحظات وتعديلات المراجع</span>
                            </span>
                            <span className="text-[10px] whitespace-normal break-words bg-white border border-amber-300 rounded-md px-2 py-0.5 font-black">
                              عرض التعديلات ←
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Card Footer: Primary Action & Dropdown */}
                      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-line/60 pt-3 mt-1">
                        {/* Primary Action Button based on status & role */}
                        {art.status === "changes_requested" && !canReview ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewNotesArticle(art);
                              setIsReviewNotesModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <MessageSquareText className="size-3.5 text-amber-700" />
                            <span>عرض التعديلات</span>
                          </button>
                        ) : canReview ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewArticle(art);
                              setIsReviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>مراجعة</span>
                          </button>
                        ) : canSubmit && (art.status === "draft" || art.status === "changes_requested") ? (
                          <button
                            type="button"
                            disabled={actionInProgressId === art.id}
                            onClick={() => handleSubmitForReview(art)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-3 py-1.5 text-xs font-bold text-ink shadow-btn hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {actionInProgressId === art.id ? (
                              <Spinner size="xs" color="ink" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                            <span>إرسال للمراجعة</span>
                          </button>
                        ) : art.status === "pending_review" ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 shadow-2xs"
                            role="status"
                          >
                            <Clock className="size-3.5 text-sky-600" />
                            <span>قيد المراجعة</span>
                          </span>
                        ) : canEdit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArticle(art);
                              setIsEditorModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                            <span>تعديل</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsArticle(art);
                              setIsDetailsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint/50 hover:text-gold-dark active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                            <span>التفاصيل</span>
                          </button>
                        )}

                        {/* Secondary Actions Dropdown */}
                        <ActionDropdown items={menuItems} label={`إجراءات المقال ${art.title}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 6. Pagination Bar */}
        {!loading && pagination.total_pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line bg-page/30 px-6 py-4 text-xs font-bold text-muted">
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
              <span> مقال</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchArticles(pagination.page - 1)}
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
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchArticles(pagination.page + 1)}
                className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:text-ink disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Modals */}
      {/* Review Notes Modal (for changes_requested) */}
      <ReviewNotesModal
        isOpen={isReviewNotesModalOpen}
        article={reviewNotesArticle}
        onClose={() => {
          setIsReviewNotesModalOpen(false);
          setReviewNotesArticle(null);
        }}
        onEdit={() => {
          setEditingArticle(reviewNotesArticle);
          setIsEditorModalOpen(true);
        }}
      />

      {/* Article Editor Modal */}
      <ArticleEditorModal
        key={editingArticle?.id || "new-article-modal"}
        isOpen={isEditorModalOpen}
        article={editingArticle}
        sources={sourcesList.filter((source) => source?.is_active === true)}
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
