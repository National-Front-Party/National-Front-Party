"use client";

import { MessageSquareText, Calendar, User, X, Pencil } from "lucide-react";

// Format date in Arabic
function formatDateTime(dateString) {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export default function ReviewNotesModal({
  isOpen,
  article,
  onClose,
  onEdit,
}) {
  if (!isOpen || !article) return null;

  const reviewerName = article.reviewed_by_user?.full_name || "مراجع الأخبار والمحتوى";
  const reviewDate = formatDateTime(article.reviewed_at);
  const note = article.review_note?.trim();

  return (
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
        {/* Header with Title and Rotating Gold Close Button */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 shadow-2xs">
              <MessageSquareText className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-ink">
                التعديلات والملاحظات المطلوبة
              </h3>
              <p className="text-xs text-muted truncate max-w-xs sm:max-w-sm" title={article.title}>
                مقال: «{article.title}»
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="group relative flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Reviewer & Meta Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-page/60 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-ink font-bold">
            <User className="size-4 text-gold-dark" />
            <span>بواسطة المراجع:</span>
            <span className="text-gold-dark">{reviewerName}</span>
          </div>

          {article.reviewed_at && (
            <div className="flex items-center gap-1.5 text-muted">
              <Calendar className="size-3.5" />
              <span>{reviewDate}</span>
            </div>
          )}
        </div>

        {/* Review Note Body with whitespace-pre-wrap */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink">
            نص ملاحظات وتوجيهات المراجع:
          </label>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 sm:p-5 text-ink leading-relaxed whitespace-pre-wrap font-medium text-xs sm:text-sm max-h-60 overflow-y-auto">
            {note || "لا توجد ملاحظات تفصيلية مدونة، يرجى مراجعة الصياغة والتنسيق العام للمقال."}
          </div>
        </div>

        {/* Helpful Guidance Notice */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 leading-relaxed">
          💡 يمكنك فتح نموذج التعديل لتنفيذ التوجيهات المطلوبة، ثم إعادة إرسال المقال للمراجعة والاعتماد.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs cursor-pointer"
          >
            إغلاق
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-ink shadow-btn hover:brightness-110 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Pencil className="size-4" />
              <span>تعديل المقال الآن</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
