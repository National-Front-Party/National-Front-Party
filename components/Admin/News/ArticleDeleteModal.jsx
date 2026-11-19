"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";

export default function ArticleDeleteModal({
  isOpen,
  article,
  onClose,
  onDeleted,
}) {
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !article) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await adminFetch(`/api/admin/news/articles/${article.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
      });
      showSuccess(`تم حذف المقال «${article.title}» نهائياً بنجاح`);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      showError(err.message || "تعذر حذف المقال");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-[26px] border border-line bg-white p-6 shadow-card-hover animate-elem-fade-up space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-black text-ink">حذف المقال الصحفي نهائياً</h3>
              <p className="text-xs text-muted">إجراء إداري دائم لا يمكن التراجع عنه</p>
            </div>
          </div>

          {/* Golden Rotating Close Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50"
            title="إغلاق"
          >
            <svg
              className="size-4.5 transition-transform duration-300 group-hover:rotate-90"
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

        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-xs text-rose-900 leading-relaxed">
          هل أنت متأكد من رغبتك في حذف المقال التالي نهائياً من قاعدة البيانات؟
          <div className="mt-2 font-black text-rose-950 text-sm bg-white p-2.5 rounded-xl border border-rose-200">
            «{article.title}»
          </div>
          <p className="mt-2 text-[11px] text-rose-700">
            سيتم توثيق عملية الحذف في سجل تدقيق الموظفين، ولن يتاح استعادة المقال لاحقاً.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
          >
            {submitting ? (
              <Spinner size="xs" color="white" />
            ) : (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            <span>تأكيد الحذف النهائي</span>
          </button>
        </div>
      </div>
    </div>
  );
}
