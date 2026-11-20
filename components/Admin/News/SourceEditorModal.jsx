"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import { Globe, Hash, CheckCircle2, XCircle } from "lucide-react";

// Helper to normalize input into a valid slug format: lowercase a-z, 0-9, and single hyphens
function normalizeSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function SourceForm({ source, onClose, onSaved }) {
  const { showSuccess, showError } = useToast();
  const isEdit = Boolean(source?.id);

  const [nameAr, setNameAr] = useState(source?.name_ar || "");
  const [slug, setSlug] = useState(source?.slug || "");
  const [sortOrder, setSortOrder] = useState(source?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(source?.is_active ?? true);
  const [manualSlugEdit, setManualSlugEdit] = useState(Boolean(source?.id));
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitting, onClose]);

  // Auto-generate slug when creating a new source unless manually edited
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setNameAr(newName);
    if (!isEdit && !manualSlugEdit) {
      const generated = normalizeSlug(newName);
      if (generated) {
        setSlug(generated);
      }
    }
  };

  const handleSlugChange = (e) => {
    setManualSlugEdit(true);
    setSlug(normalizeSlug(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = nameAr.trim();
    const trimmedSlug = normalizeSlug(slug);
    const parsedSortOrder = Number.isInteger(Number(sortOrder))
      ? Math.max(0, Math.min(32767, Number(sortOrder)))
      : 0;

    if (!trimmedName) {
      showError("اسم المصدر الصحفي باللغة العربية مطلوب");
      return;
    }

    if (!trimmedSlug) {
      showError("المعرف اللطيف (Slug) مطلوب ويجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط");
      return;
    }

    // Validate slug regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(trimmedSlug)) {
      showError(
        "صيغة المعرف اللطيف (Slug) غير صحيحة. يجب أن يتكون من أحرف إنجليزية صغيرة وأرقام مفصولة بشرطة واحدة بدون مسافات أو رموز خاصة",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name_ar: trimmedName,
        slug: trimmedSlug,
        sort_order: parsedSortOrder,
        is_active: Boolean(isActive),
      };

      let result;
      if (isEdit) {
        result = await adminFetch(`/api/admin/news/sources/${source.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        result = await adminFetch("/api/admin/news/sources", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      const savedSource = result?.source || result?.data || result;
      showSuccess(
        isEdit
          ? "تم تحديث بيانات المصدر الإعلامي بنجاح"
          : "تمت إضافة المصدر الإعلامي الجديد بنجاح",
      );
      onSaved?.(savedSource);
      onClose();
    } catch (err) {
      if (err.message && err.message.includes("DUPLICATE_SLUG")) {
        showError("هذا المعرف اللطيف (Slug) مستخدم لمصدر آخر بالفعل؛ يرجى اختيار slug فريد.");
      } else if (err.issues) {
        const firstIssue = Object.values(err.issues)[0]?.[0];
        showError(firstIssue || "يرجى التحقق من صحة البيانات المدخلة");
      } else {
        showError(err.message || "تعذر حفظ بيانات المصدر الإعلامي");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative w-full max-w-lg overflow-hidden rounded-[26px] border border-line bg-white shadow-card-hover animate-elem-fade-up my-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-page/40 px-6 py-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
            <Globe className="size-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted">إدارة مصادر وتغطيات الأخبار</span>
            <h2 className="text-lg font-black text-ink tracking-tight mt-0.5">
              {isEdit ? "تعديل بيانات المصدر الإعلامي" : "إضافة مصدر إخباري جديد"}
            </h2>
          </div>
        </div>

        {/* Golden Rotating Close Button */}
        <button
          type="button"
          disabled={submitting}
          onClick={onClose}
          aria-label="إغلاق النافذة"
          className="group relative flex size-10 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* Modal Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* 1. Source Arabic Name (name_ar) */}
        <div>
          <label className="mb-2 block text-xs sm:text-sm font-bold text-ink">
            اسم المصدر الصحفي بالعربية <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={200}
              value={nameAr}
              onChange={handleNameChange}
              placeholder="مثال: جريدة الأهرام، اليوم السابع، أخبار اليوم..."
              disabled={submitting}
              className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60 disabled:opacity-50"
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted">
            الاسم الرسمي للصحيفة أو الموقع الإخباري كما سيظهر في تقارير الأخبار بالموقع.
          </span>
        </div>

        {/* 2. Slug (Latin lowercase with hyphens) */}
        <div>
          <label className="mb-2 block text-xs sm:text-sm font-bold text-ink">
            المعرف اللطيف (Slug بالإنجليزية) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={120}
              dir="ltr"
              value={slug}
              onChange={handleSlugChange}
              placeholder="e.g. al-ahram, youm7, el-watan"
              disabled={submitting}
              className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-left font-mono text-xs sm:text-sm font-semibold text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60 disabled:opacity-50"
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted">
            معرف إنجليزي فريد يُستخدم في الروابط وفلترة المقالات (أحرف صغيرة، أرقام، وشرطات فقط).
          </span>
        </div>

        {/* 3. Sort Order & Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sort Order */}
          <div>
            <label className="mb-2 block text-xs sm:text-sm font-bold text-ink">
              ترتيب العرض (Sort Order)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="32767"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={submitting}
                className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-right font-mono text-xs sm:text-sm font-bold text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:opacity-50"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <Hash className="size-4" />
              </span>
            </div>
            <span className="mt-1 block text-[10px] text-muted">
              الرقم الأصغر يظهر أولاً في القوائم المنسدلة.
            </span>
          </div>

          {/* Active Status Radio/Toggle */}
          <div>
            <label className="mb-2 block text-xs sm:text-sm font-bold text-ink">
              حالة الاعتماد
            </label>
            <div className="flex h-14 items-center justify-between gap-2 rounded-2xl border border-border bg-page/40 p-1.5">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                disabled={submitting}
                className={`flex flex-1 items-center justify-center gap-1.5 h-full rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted hover:text-ink hover:bg-white"
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>معتمد ونشط</span>
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                disabled={submitting}
                className={`flex flex-1 items-center justify-center gap-1.5 h-full rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isActive
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-muted hover:text-ink hover:bg-white"
                }`}
              >
                <XCircle className="size-3.5" />
                <span>معطل مؤقتاً</span>
              </button>
            </div>
            <span className="mt-1 block text-[10px] text-muted">
              المصادر المعطلة لا تظهر للمحررين عند إضافة مقالات جديدة.
            </span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-line/60 pt-5 mt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-2xl border border-line bg-white px-5 py-3 text-xs sm:text-sm font-bold text-ink transition-all hover:border-gold hover:bg-gold-tint/40 hover:text-gold-dark active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 py-3 text-xs sm:text-sm font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_6px_18px_rgba(201,162,74,0.45)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Spinner size="xs" color="ink" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{isEdit ? "حفظ التعديلات" : "إضافة المصدر"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SourceEditorModal({
  isOpen,
  source,
  onClose,
  onSaved,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <SourceForm
        key={source?.id || "new-source"}
        source={source}
        onClose={onClose}
        onSaved={onSaved}
      />
    </div>
  );
}
