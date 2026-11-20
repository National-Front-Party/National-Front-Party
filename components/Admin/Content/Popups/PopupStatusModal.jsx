"use client";

import { useEffect, useRef } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import { Globe, EyeOff, AlertTriangle, X } from "lucide-react";

export default function PopupStatusModal({
  isOpen,
  onClose,
  onConfirm,
  popup,
  submitting = false,
}) {
  const modalCardRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const isPublishing = !popup?.is_published;
  const title = popup?.title || "";

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
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={modalCardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        aria-describedby="status-modal-desc"
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card transition-all"
        dir="rtl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                isPublishing
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isPublishing ? (
                <Globe className="size-6" />
              ) : (
                <EyeOff className="size-6" />
              )}
            </div>
            <div>
              <h3
                id="status-modal-title"
                className="text-base font-black text-slate-900"
              >
                {isPublishing
                  ? "تأكيد نشر العنصر على الصفحة الرئيسية"
                  : "تأكيد إيقاف نشر العنصر"}
              </h3>
              <p className="text-xs text-slate-500">
                تغيير حالة النشر المباشر للجمهور
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="إغلاق النافذة"
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <p id="status-modal-desc" className="text-sm leading-relaxed text-slate-700">
            {isPublishing ? (
              <>
                أنت على وشك نشر العنصر{" "}
                <span className="font-bold text-slate-900">«{title}»</span> ليصبح ظاهراً
                ومباشراً لجميع زوار الصفحة الرئيسية ضمن العمود الأول.
              </>
            ) : (
              <>
                أنت على وشك إيقاف نشر العنصر{" "}
                <span className="font-bold text-slate-900">«{title}»</span>. سيختفي هذا
                العنصر فوراً من قائمة الصفحة الرئيسية ولن يظهر للزوار حتى تتم إعادة نشره.
              </>
            )}
          </p>

          <div
            className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs ${
              isPublishing
                ? "bg-emerald-50/70 border border-emerald-200 text-emerald-800"
                : "bg-amber-50/70 border border-amber-200 text-amber-800"
            }`}
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p>
              {isPublishing
                ? "تأكد من مراجعة المحتوى والفقرات وصياغة النص قبل تأكيد النشر للجمهور."
                : "يمكنك إعادة نشر العنصر في أي وقت لاحقاً بعد مراجعته وتعديله."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white transition-all shadow-sm ${
              isPublishing
                ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                : "bg-amber-600 hover:bg-amber-700 active:scale-95"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting && <Spinner size="sm" />}
            <span>
              {submitting
                ? "جاري التحديث..."
                : isPublishing
                ? "تأكيد النشر للجمهور"
                : "تأكيد إيقاف النشر"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
