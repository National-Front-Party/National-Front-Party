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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speech-preview-title"
    >
      <div
        className="relative my-8 w-full max-w-[800px] rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl transition-all"
        dir="rtl"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 inline-flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="إغلاق المعاينة"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        {/* Modal Badge & Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
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
        <div className="space-y-4 py-6 text-base sm:text-lg leading-relaxed sm:leading-loose text-slate-800 max-h-[60vh] overflow-y-auto px-1">
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
          <div className="border-t border-slate-200 pt-4 flex items-center gap-2 text-xs text-slate-500">
            <FileText className="size-4 text-slate-400" aria-hidden="true" />
            <span>المصدر: {speech.source_note}</span>
          </div>
        )}

        {/* Close CTA */}
        <div className="mt-6 flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
}
