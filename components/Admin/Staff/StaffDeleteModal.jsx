"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";

export default function StaffDeleteModal({
  isOpen,
  onClose,
  staffMember,
  onSuccess,
  onNotFound,
}) {
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submittingRef = useRef(false);

  if (!isOpen || !staffMember) return null;

  const handleClose = () => {
    if (submittingRef.current) return;
    setErrorMessage("");
    onClose();
  };

  const handleDelete = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage("");

    try {
      await adminFetch(`/api/admin/staff/${staffMember.id}`, {
        method: "DELETE",
        body: { confirm: true },
      });
    } catch (error) {
      let message;
      if (error?.code === "ACTIVE_STAFF") {
        message = "أصبح حساب الموظف نشطًا. يجب تعطيله أولًا قبل حذفه.";
      } else if (error?.code === "NOT_FOUND") {
        message = "لم يعد حساب الموظف موجودًا. تم تحديث قائمة الموظفين.";
        onNotFound?.();
      } else if (error?.status === 403 || error?.code === "FORBIDDEN" || error?.code === "SELF_DELETE_FORBIDDEN") {
        message = "لا يمكن تنفيذ هذا الحذف. قد لا تملك الصلاحية أو لا يمكن حذف حسابك الحالي.";
      } else {
        message = error?.message || "تعذر حذف حساب الموظف. حاول مرة أخرى.";
      }

      setErrorMessage(message);
      showError(message);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    submittingRef.current = false;
    setSubmitting(false);
    showSuccess(`تم حذف حساب الموظف «${staffMember.full_name}» بنجاح`);
    onSuccess?.(staffMember);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-delete-title"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs">
              <Trash2 className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 id="staff-delete-title" className="text-base sm:text-lg font-black text-ink">
                حذف حساب الموظف
              </h2>
              <p className="text-xs text-muted mt-0.5">
                تأكيد حذف حساب غير نشط
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
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

        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-4 text-sm">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 leading-relaxed">
            <div className="flex items-center gap-2 font-black text-rose-950">
              <AlertTriangle className="size-5 shrink-0 text-rose-600" />
              <span>هل أنت متأكد من حذف حساب الموظف التالي نهائيًا؟</span>
            </div>
            <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3 break-words">
              <p className="font-black text-ink">{staffMember.full_name}</p>
              <p className="mt-1 text-xs font-mono text-muted break-all" dir="ltr">
                {staffMember.email}
              </p>
            </div>
            <p className="mt-3 text-xs">
              سيتم حذف الحساب نهائيًا ولا يمكن التراجع عن ذلك. ستبقى السجلات التاريخية والطلبات والمقالات المرتبطة محفوظة، لكن قد يصبح مرجع الموظف فيها غير متاح.
            </p>
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-800 break-words">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 px-5 sm:px-7 py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="h-11 rounded-2xl border border-line bg-white px-5 text-xs font-bold text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-bold text-white shadow-btn hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Spinner size="sm" color="white" /> : <Trash2 className="size-4" />}
            <span>{submitting ? "جارٍ الحذف..." : "تأكيد الحذف النهائي"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
