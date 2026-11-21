"use client";

import { useEffect, useRef } from "react";
import { X, Mic2, FileText, User } from "lucide-react";

export default function SpeechPreviewModal({
  isOpen,
  onClose,
  speech,
}) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !speech) return null;

  const paragraphs = speech.body
    ? speech.body.split(/\r?\n+/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-xs sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speech-preview-title"
    >
      <div
        className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[800px] flex-col overflow-hidden rounded-3xl border border-line bg-white p-4 shadow-card sm:max-h-[90vh] sm:p-7"
        dir="rtl"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 inline-flex size-11 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-105 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 sm:left-5 sm:top-5"
          aria-label="إغلاق المعاينة"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        {/* Modal Badge & Title */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 pl-12 sm:pl-14">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-xs">
            <Mic2 className="size-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gold-darker bg-gold/10 px-2.5 py-0.5 rounded-full">
              معاينة مطابقة للموقع العام
            </span>
            <h2
              id="speech-preview-title"
              className="text-xl font-bold text-slate-900 mt-1"
            >
              {speech.title || "كلمة القيادة"}
            </h2>
          </div>
        </div>

        {/* Speaker Info Banner (Mirroring SpeechModal) */}
        <div className="mt-5 flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2">
            <User className="size-5 text-gold-darker" aria-hidden="true" />
            <h3 className="text-lg font-extrabold text-slate-900">
              {speech.person_name || "اسم المتحدث"}
            </h3>
          </div>
          <p className="text-sm font-semibold text-slate-500 sm:text-left">
            {speech.person_role_title || "الصفة الحزبية"}
          </p>
        </div>

        {/* Body Paragraphs */}
        <div className="max-h-[55dvh] space-y-4 overflow-y-auto px-1 py-5 text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere] sm:max-h-[60vh] sm:py-6 sm:text-lg sm:leading-loose">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, idx) => (
              <p key={idx} className="text-justify font-normal">
                {p}
              </p>
            ))
          ) : (
            <p className="text-slate-400 italic text-center py-8">
              لا يوجد نص مسجل لهذه الكلمة بعد.
            </p>
          )}
        </div>

        {/* Source Note Footer */}
        {speech.source_note && (
          <div className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 [overflow-wrap:anywhere]">
            <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{`المصدر: ${speech.source_note}`}</span>
          </div>
        )}

        {/* Close CTA */}
        <div className="mt-6 flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-line bg-page px-5 text-sm font-bold text-muted transition-all hover:border-gold/50 hover:bg-gold-tint/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
}
