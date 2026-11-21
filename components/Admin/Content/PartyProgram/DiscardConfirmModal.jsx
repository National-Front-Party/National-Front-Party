"use client";

import { useEffect, useRef } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import { Trash2, AlertCircle } from "lucide-react";

export default function DiscardConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  submitting = false,
  draftTitle = "مسودة برنامج الحزب",
}) {
  const modalCardRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;

    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 40);

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current) {
        const focusableSelectors =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
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
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-modal-title"
      aria-describedby="discard-modal-desc"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      dir="rtl"
    >
      <div
        ref={modalCardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl transition-all duration-200 sm:p-7"
      >
        {/* Header Icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <Trash2 className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="discard-modal-title" className="text-lg font-bold text-slate-900">
              إهمال وحذف المسودة
            </h3>
            <p className="text-xs text-slate-500">
              حذف مسودة العمل غير المنشورة نهائياً
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div
          id="discard-modal-desc"
          className="mb-5 rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-xs leading-relaxed text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold mb-1">تأكيد الإلغاء:</p>
              <p>
                هل أنت متأكد من رغبتك في إهمال وحذف مسودة العمل:
                <strong className="block mt-1 text-slate-900">«{draftTitle}»</strong>
              </p>
              <p className="mt-2 text-slate-600">
                لن تتأثر النسخة المنشورة حالياً على الموقع بهذا الإجراء نهائياً.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400 disabled:opacity-50"
          >
            تراجع
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-red-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Spinner size="sm" color="white" />
                <span>جاري الحذف...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden="true" />
                <span>نعم، إهمال المسودة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
