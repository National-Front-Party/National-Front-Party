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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      dir="rtl"
    >
      <div
        ref={modalCardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
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
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
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
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Card Simulation Header */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-ink px-4 py-8 text-center text-white shadow-card">
            <BookOpen size={48} strokeWidth={1.5} className="text-gold-light" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold text-white">
              {title || "برنامج الحزب"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <ExternalLink className="size-3.5 text-gold" aria-hidden="true" />
              <span>بطاقة الواجهة التفاعلية (نافذة الاستعراض)</span>
            </div>
          </div>

          {/* Paragraphs */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 space-y-4 text-right text-base leading-loose text-ink font-medium">
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
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
}
