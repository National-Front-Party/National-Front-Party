"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function ArticleDetailsModal({
  isOpen,
  article,
  onClose,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !article) return null;

  const paragraphs = (article.body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const statusMap = {
    draft: { label: "مسودة", tone: "bg-slate-100 text-slate-800 border-slate-200" },
    pending_review: { label: "قيد المراجعة", tone: "bg-sky-50 text-sky-800 border-sky-200" },
    changes_requested: { label: "مطلوب تعديلات", tone: "bg-rose-50 text-rose-800 border-rose-200" },
    published: { label: "منشور", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  };

  const statusInfo = statusMap[article.status] || {
    label: article.status,
    tone: "bg-page text-muted border-line",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 transition-opacity sm:items-center sm:p-5 bg-black/60 backdrop-blur-xs"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-0 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-[26px] border border-line bg-white shadow-card-hover animate-elem-fade-up sm:my-auto sm:max-h-[calc(100dvh-2.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-line bg-page/40 px-4 py-4 sm:gap-3.5 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted">تفاصيل المقال الإخباري</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.tone}`}
                >
                  {statusInfo.label}
                </span>
                {article.is_featured && (
                  <span className="rounded-full bg-gold-tint border border-gold/40 px-2.5 py-0.5 text-[11px] font-black text-gold-dark">
                    ★ مميز
                  </span>
                )}
              </div>
              <h2 className="break-words text-base font-black text-ink tracking-tight mt-0.5 sm:text-lg [overflow-wrap:anywhere]">
                {article.title}
              </h2>
            </div>
          </div>

          {/* Golden Rotating Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95"
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

        {/* Modal Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6 lg:p-8">
          {/* Metadata Cards */}
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 rounded-2xl border border-line bg-page/30 p-3 space-y-1 sm:p-3.5">
              <span className="text-[11px] text-muted block font-bold">مصدر الخبر:</span>
              <span className="block whitespace-normal break-words text-xs font-bold text-ink [overflow-wrap:anywhere]">
                📰 {article.source_name || article.source?.name_ar || "—"}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl border border-line bg-page/30 p-3 space-y-1 sm:p-3.5">
              <span className="text-[11px] text-muted block font-bold">الكاتب / المحرر:</span>
              <span className="block whitespace-normal break-words text-xs font-bold text-ink [overflow-wrap:anywhere]">
                ✍️ {article.created_by_user?.full_name || "غير محدد"}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl border border-line bg-page/30 p-3 space-y-1 sm:p-3.5">
              <span className="text-[11px] text-muted block font-bold">تاريخ النشر:</span>
              <span className="text-xs font-mono font-bold text-ink block">
                📅 {article.published_on ? new Date(article.published_on).toISOString().substring(0, 10) : "—"}
              </span>
            </div>

            <div className="min-w-0 rounded-2xl border border-line bg-page/30 p-3 space-y-1 sm:p-3.5">
              <span className="text-[11px] text-muted block font-bold">المعرف اللطيف (Slug):</span>
              <span className="block whitespace-normal break-all text-xs font-mono text-muted [overflow-wrap:anywhere]" dir="ltr">
                {article.slug}
              </span>
            </div>
          </div>

          {/* Audit / Reviewer details if reviewed */}
          {(article.reviewed_by_user || article.review_note) && (
            <div className="min-w-0 rounded-2xl border border-line bg-page/40 p-3 space-y-2 text-xs sm:p-4">
              {article.reviewed_by_user && (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-bold text-muted">تمت المراجعة بواسطة:</span>
                  <span className="min-w-0 break-words font-bold text-ink [overflow-wrap:anywhere]">{article.reviewed_by_user.full_name}</span>
                  {article.reviewed_at && (
                    <span className="break-words text-muted font-mono [overflow-wrap:anywhere]">
                      (في {new Date(article.reviewed_at).toLocaleString("ar-EG")})
                    </span>
                  )}
                </div>
              )}
              {article.review_note && (
                <div className="pt-1">
                  <span className="font-bold text-rose-800 block">ملاحظة المراجعة:</span>
                  <p className="mt-1 whitespace-pre-wrap break-words text-ink bg-white p-3 rounded-xl border border-line font-medium leading-relaxed [overflow-wrap:anywhere]">
                    {article.review_note}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cover Image */}
          {article.image_url && (
            <div className="rounded-2xl border border-line overflow-hidden bg-page/40 max-h-80 flex items-center justify-center relative">
              <Image
                src={article.image_url}
                alt={article.image_alt || article.title}
                width={800}
                height={350}
                className="w-full h-auto max-h-80 object-cover"
                unoptimized
              />
              {article.image_alt && (
                <div className="absolute bottom-0 inset-x-0 break-words bg-black/60 backdrop-blur-xs p-2 text-center text-[11px] text-white [overflow-wrap:anywhere]">
                  {article.image_alt}
                </div>
              )}
            </div>
          )}

          {/* Source URL External Link */}
          {article.source_url && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-page/20 p-3 text-xs sm:p-3.5">
              <span className="font-bold text-muted">رابط المقال على المصدر الخارجي:</span>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sky-700 hover:text-gold-dark font-bold font-mono transition-colors"
              >
                <span>فتح الرابط الأصلي</span>
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}

          {/* Body Paragraphs */}
          <div className="min-w-0 space-y-3">
            <h3 className="text-xs font-bold text-muted">نص المقال:</h3>
            <div className="min-w-0 rounded-2xl border border-line bg-white p-3 space-y-3.5 text-xs text-ink leading-relaxed shadow-xs sm:p-5 sm:text-sm">
              {paragraphs.map((p, idx) => (
                <p key={idx} className="break-words [overflow-wrap:anywhere]">{p}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 justify-end border-t border-line bg-page/30 p-3 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-line bg-white px-5 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs sm:w-auto"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
