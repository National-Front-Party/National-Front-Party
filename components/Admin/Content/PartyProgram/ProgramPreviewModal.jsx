"use client";

import { useEffect, useRef } from "react";
import { BookOpen, X, Sparkles, ExternalLink } from "lucide-react";

export default function ProgramPreviewModal({
  isOpen,
  onClose,
  title = "برنامج الحزب",
  body = "",
  source_note = "الموقع الرسمي للحزب",
  isDraft = true,
}) {
  const modalCardRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const paragraphs = body
    ? body.split(/\r?\n+/).filter((p) => p.trim().length > 0)
    : ["لا يوجد نص مسودة لعرضه حالياً."];

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 40);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current) {
        const focusableSelectors =
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
          modalCardRef.current.querySelectorAll(focusableSelectors),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm transition-opacity duration-200 sm:p-6"
      dir="rtl"
    >
      <div
        ref={modalCardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card-hover sm:max-h-[90dvh]"
      >
        {/* Header Banner */}
        <div className="flex items-start justify-between gap-3 border-b border-line bg-white px-4 py-4 sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h3 id="preview-modal-title" className="text-sm font-bold text-slate-900">
                معاينة محتوى بطاقة برنامج الحزب
              </h3>
              <p className="text-xs text-slate-500">
                {isDraft ? "معاينة مطابقة تماماً لشكل النافذة المنبثقة بالصفحة الرئيسية" : "النسخة المنشورة حالياً للجمهور"}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="group flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Status Badge */}
        {isDraft && (
          <div className="bg-amber-50 px-6 py-2.5 text-xs font-semibold text-amber-800 border-b border-amber-200/70 flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span>هذه معاينة أولية للمسودة قيد التحرير — لم تُنشر على الموقع بعد</span>
          </div>
        )}

        {/* Modal Body / ModalShell simulation */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-7">
          {/* Card Simulation Header */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-ink px-4 py-7 text-center text-white shadow-card sm:py-9">
            <BookOpen size={48} strokeWidth={1.5} className="text-gold-light" aria-hidden="true" />
            <h2 className="break-words text-xl font-extrabold text-white sm:text-2xl">
              {title || "برنامج الحزب"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <ExternalLink className="size-3.5 text-gold" aria-hidden="true" />
              <span>بطاقة الواجهة التفاعلية (نافذة الاستعراض)</span>
            </div>
          </div>

          {/* Paragraphs */}
          <div className="space-y-4 rounded-2xl border border-line bg-page/70 p-4 text-right text-sm font-medium leading-8 text-ink sm:p-6 sm:text-base">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-justify leading-relaxed sm:leading-loose">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Source Note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>المصدر المعتمد: {source_note || "الموقع الرسمي للحزب"}</span>
            <span className="text-slate-400">حزب الجبهة الوطنية</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-line bg-white px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-border bg-white px-6 text-sm font-bold text-ink transition-all hover:border-gold hover:bg-gold-tint/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
}
