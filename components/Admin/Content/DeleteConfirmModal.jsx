"use client";

import { useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Spinner from "@/components/Admin/ui/Spinner";

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  endpoint,
  onConfirm,
  onSuccess,
  recordName = "",
  recordType = "السجل",
  title = "تأكيد الحذف النهائي",
  warningNote = "",
}) {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const modalCardRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const canDelete = hasPermission(user?.role, "records:delete");

  // Focus management, focus trap, and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Capture the element that had focus prior to opening modal
    previousFocusRef.current = document.activeElement;

    // Initial focus on the safe Cancel button
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 40);

    const handleKeyDown = (e) => {
      // Escape key to close modal safely
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        setErrorMessage("");
        onClose();
        return;
      }

      // Keyboard focus trap within modal dialog
      if (e.key === "Tab" && modalCardRef.current) {
        const focusableSelectors =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
          modalCardRef.current.querySelectorAll(focusableSelectors),
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !modalCardRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !modalCardRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the triggering element on close or unmount
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (submitting) return;
    setErrorMessage("");
    onClose();
  };

  const handleBackdropClick = (e) => {
    // Only close if the backdrop overlay itself was directly clicked
    if (e.target === e.currentTarget && !submitting) {
      handleClose();
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      setErrorMessage("غير مصرح لك بإجراء الحذف. هذه العملية مقتصرة على مدير النظام (Super Admin).");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (endpoint) {
        await adminFetch(endpoint, {
          method: "DELETE",
          body: { confirm: true }, // Approved DELETE payload required by backend
        });
      } else if (onConfirm) {
        await onConfirm();
      }

      showSuccess(`تم حذف «${recordName || recordType}» نهائياً بنجاح`);
      setErrorMessage("");
      onSuccess?.();
      onClose();
    } catch (err) {
      // Specifically handle 409 PANEL_HAS_LEADERS
      if (
        err?.code === "PANEL_HAS_LEADERS" ||
        err?.message?.includes("PANEL_HAS_LEADERS") ||
        (err?.status === 409 && String(err?.message).includes("LEADER"))
      ) {
        setErrorMessage(
          "لا يمكن حذف هذه اللجنة لوجود كوادر قيادية مرتبطة بها حالياً. يرجى نقل أو حذف الكوادر القيادية أولاً قبل حذف اللجنة.",
        );
      } else if (err?.status === 403 || err?.code === "FORBIDDEN") {
        setErrorMessage("غير مصرح لك بإجراء الحذف النهائي. يتطلب هذا الإجراء صلاحية إدارة السجلات.");
      } else if (err?.status === 404 || err?.code === "NOT_FOUND") {
        setErrorMessage("السجل المطلوب حذفه غير موجود أو تم حذفه مسبقاً.");
      } else {
        setErrorMessage(err?.message || "تعذر إتمام عملية الحذف. يرجى المحاولة مرة أخرى.");
      }
      showError(err?.message || "تعذر إتمام عملية الحذف");
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
      aria-labelledby="delete-dialog-title"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalCardRef}
        className="w-full max-w-md rounded-[26px] border border-line bg-white p-6 shadow-card-hover animate-elem-fade-up space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Golden Rotating Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-base font-black text-ink">
                {title}
              </h3>
              <p className="text-xs text-muted">إجراء إداري دائم لا يمكن التراجع عنه</p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
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

        {/* Permission Warning if not authorized */}
        {!canDelete && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 leading-relaxed font-bold flex items-center gap-2">
            <svg className="size-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span>الحذف مقتصر على مدير النظام (Super Admin). ليس لديك صلاحية الحذف.</span>
          </div>
        )}

        {/* Confirmation Content Card */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-xs text-rose-900 leading-relaxed space-y-2">
          <p>
            هل أنت متأكد من رغبتك في حذف {recordType} التالي نهائياً من قاعدة البيانات؟
          </p>
          {recordName && (
            <div className="font-black text-rose-950 text-sm bg-white p-2.5 rounded-xl border border-rose-200 shadow-2xs">
              «{recordName}»
            </div>
          )}
          {warningNote && (
            <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200/80">
              ⚠️ {warningNote}
            </p>
          )}
          <p className="text-[11px] text-rose-700">
            سيتم توثيق هذا الإجراء في سجل تدقيق الموظفين، ولن يمكن استعادة السجل بعد حذفه.
          </p>
        </div>

        {/* Specific Error Display */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 leading-relaxed animate-elem-fade-up font-medium flex items-start gap-2"
          >
            <svg className="size-4 shrink-0 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={submitting || !canDelete}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-rose-600 focus-visible:outline-offset-2"
          >
            {submitting ? (
              <Spinner size="sm" color="white" />
            ) : (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            <span>{submitting ? "جارٍ الحذف..." : "تأكيد الحذف النهائي"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
