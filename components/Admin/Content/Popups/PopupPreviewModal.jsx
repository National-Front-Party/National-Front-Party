"use client";

import { useEffect, useRef } from "react";
import {
  X,
  User,
  Target,
  Eye,
  Send,
  MessageCircleQuestion,
} from "lucide-react";

const ICON_MAP = {
  user: User,
  target: Target,
  eye: Eye,
  send: Send,
  message: MessageCircleQuestion,
};

export default function PopupPreviewModal({
  isOpen,
  onClose,
  popup,
}) {
  const modalCardRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const title = popup?.title || "معاينة العنصر";
  const body = popup?.body || "";
  const source = popup?.source_note || "الموقع الرسمي للحزب";
  const iconKey = popup?.icon || "user";
  const isPublished = Boolean(popup?.is_published);

  const IconComponent = ICON_MAP[iconKey] || User;

  const paragraphs = body
    ? body.split(/\r?\n+/).filter((p) => p.trim().length > 0)
    : ["لا يوجد نص مسجل لهذا العنصر حالياً."];

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
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalCardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
        className="relative w-full max-w-[700px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl transition-all"
        dir="rtl"
      >
        {/* Top Gold Gradient Bar */}
        <div className="h-1.5 w-full bg-[linear-gradient(135deg,var(--color-gold,#C9A24A),var(--color-gold-light,#E8D5A3),var(--color-gold,#C9A24A))]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-gold shadow-2xs">
              <IconComponent className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="preview-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  {title}
                </h3>
                {isPublished ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    منشور للجمهور
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    مسودة
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                معاينة نافذة المعلومات (InfoModal) كما تظهر لزوار الصفحة الرئيسية
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body: Mimics InfoModal on homepage */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-6 space-y-4 text-right">
          <div className="space-y-4 text-base sm:text-lg leading-loose text-slate-800">
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 16)}`} className="text-justify">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>المصدر: {source}</span>
            {popup?.sort_order !== undefined && (
              <span>ترتيب العرض: {popup.sort_order}</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            إغلاق المعاينة
          </button>
        </div>
      </div>
    </div>
  );
}
