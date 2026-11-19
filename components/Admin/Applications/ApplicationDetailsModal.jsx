"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { canAccess } from "@/lib/admin/permissions";
import { useAdminAuth } from "@/lib/admin/auth-context";
import Spinner from "@/components/Admin/ui/Spinner";

// Type labels
const TYPE_LABELS = {
  member: "عضوية عاملة",
  volunteer: "متطوع",
  follower: "مؤازر",
};

// Status labels and badge styling
const STATUS_CONFIG = {
  new: {
    label: "جديد",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-600",
  },
  under_review: {
    label: "قيد المراجعة",
    tone: "bg-gold-tint text-gold-dark border-gold/40",
    dot: "bg-gold",
  },
  accepted: {
    label: "مقبول",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  rejected: {
    label: "مرفوض",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
  },
};

function formatArabicDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function ApplicationDetailsModal({
  applicationId,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection dialog state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Accept confirmation state
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  const canUpdate = canAccess(user?.role, "applications:update");

  // Fetch application details
  const fetchDetails = useCallback(async () => {
    if (!applicationId) return;
    try {
      const data = await adminFetch(`/api/admin/applications/${applicationId}`);
      const appData = data?.application ?? data;
      setApplication(appData);
    } catch (err) {
      showError(err.message || "تعذر تحميل بيانات الطلب");
      onClose();
    }
  }, [applicationId, showError, onClose]);

  useEffect(() => {
    if (!isOpen || !applicationId) {
      return;
    }
    let mounted = true;
    adminFetch(`/api/admin/applications/${applicationId}`)
      .then((data) => {
        if (mounted) {
          const appData = data?.application ?? data;
          setApplication(appData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          showError(err.message || "تعذر تحميل بيانات الطلب");
          setLoading(false);
          onClose();
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, applicationId, showError, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Copy to clipboard helper
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => showSuccess(`تم نسخ ${label} بنجاح`))
      .catch(() => showError("تعذر النسخ"));
  };

  // Change status (move to under_review or accept/reject)
  const handleStatusChange = async (newStatus, reason = null) => {
    setActionLoading(true);
    try {
      const payload = { status: newStatus };
      if (newStatus === "rejected") {
        if (!reason || !reason.trim()) {
          showError("سبب الرفض إلزامي");
          setActionLoading(false);
          return;
        }
        payload.rejection_reason = reason.trim();
      }

      await adminFetch(`/api/admin/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      showSuccess(
        newStatus === "accepted"
          ? "تم قبول الطلب بنجاح وتوليد العضوية"
          : newStatus === "rejected"
          ? "تم رفض الطلب وتسجيل سبب الرفض"
          : "تم نقل الطلب إلى قيد المراجعة",
      );

      setShowRejectForm(false);
      setShowAcceptConfirm(false);
      setRejectionReason("");
      await fetchDetails();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      showError(err.message || "فشل تحديث حالة الطلب");
    } finally {
      setActionLoading(false);
    }
  };

  const statusCfg = STATUS_CONFIG[application?.status] || STATUS_CONFIG.new;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs transition-opacity"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-line bg-white shadow-card-hover animate-elem-fade-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-page/40 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint text-gold-dark shadow-2xs">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted">
                  طلب رقم #{application?.application_no || "..."}
                </span>
                {application && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusCfg.tone}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <h2
                id="modal-headline"
                className="text-lg sm:text-xl font-black text-ink tracking-tight mt-0.5"
              >
                {loading ? "جاري التحميل..." : application?.full_name}
              </h2>
            </div>
          </div>

          {/* Golden Rotating Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95"
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

        {/* Modal Action Bar (Status Transitions) */}
        {application && canUpdate && (
          <div className="border-b border-line bg-[#FAFBFD] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted">إجراءات الطلب:</span>

            <div className="flex items-center gap-2 flex-wrap">
              {/* If NEW: Move to under_review */}
              {application.status === "new" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("under_review")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gold bg-gold-tint px-4 py-2 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                >
                  {actionLoading ? <Spinner size="sm" color="gold" /> : (
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                  <span>بدء المراجعة</span>
                </button>
              )}

              {/* If UNDER_REVIEW: Accept or Reject */}
              {application.status === "under_review" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowAcceptConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>قبول الطلب</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowRejectForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>رفض الطلب</span>
                  </button>
                </>
              )}

              {/* Status info if already final */}
              {application.status === "accepted" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>تم قبول الطلب رسمياً</span>
                </span>
              )}

              {application.status === "rejected" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>الطلب مرفوض</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Accept Confirmation Box */}
        {showAcceptConfirm && (
          <div className="border-b border-emerald-200 bg-emerald-50/90 p-4 animate-elem-fade-up">
            <h4 className="text-xs font-bold text-emerald-900 mb-1">تأكيد قبول طلب الانضمام</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              هل أنت متأكد من قبول طلب «{application.full_name}»؟
              {application.application_type === "member" && (
                <span className="block mt-1 font-bold">
                  سيتم إنشاء رقم عضوية رسمي للمواطن وتحديث سجل العضويات فوراً.
                </span>
              )}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange("accepted")}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
              >
                {actionLoading ? <Spinner size="sm" color="white" /> : "نعم، تأكيد القبول"}
              </button>
              <button
                type="button"
                onClick={() => setShowAcceptConfirm(false)}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:text-ink transition-all shadow-2xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Rejection Form Box */}
        {showRejectForm && (
          <div className="border-b border-rose-200 bg-rose-50/90 p-4 animate-elem-fade-up">
            <h4 className="text-xs font-bold text-rose-900 mb-1">رفض طلب الانضمام</h4>
            <p className="text-xs text-rose-800 mb-2">
              يرجى كتابة سبب رفض طلب «{application.full_name}» (إلزامي للتوثيق):
            </p>
            <textarea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              className="w-full rounded-xl border border-rose-300 bg-white p-3 text-xs text-ink focus:border-rose-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={() => handleStatusChange("rejected", rejectionReason)}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
              >
                {actionLoading ? <Spinner size="sm" color="white" /> : "تأكيد الرفض"}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:text-ink transition-all shadow-2xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Clean, Focused Dossier Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 [scrollbar-width:thin]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" color="gold" />
              <p className="text-xs font-bold text-muted">جاري تحميل بيانات الطلب...</p>
            </div>
          ) : !application ? (
            <div className="py-12 text-center text-muted text-xs">
              لم يتم العثور على بيانات هذا الطلب.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Rejection Alert if Rejected */}
              {application.status === "rejected" && application.rejection_reason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900 mb-1">
                    <svg className="size-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>سبب رفض الطلب:</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed pr-6 font-medium">
                    {application.rejection_reason}
                  </p>
                </div>
              )}

              {/* Member Badge if Accepted */}
              {application.members && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xs">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-emerald-950">
                        عضو رسمي بحزب الجبهة الوطنية
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        تاريخ الانضمام: {formatArabicDate(application.members.joined_at)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-center shadow-2xs">
                    <span className="block text-[10px] text-muted">رقم العضوية</span>
                    <span className="text-xs font-black text-emerald-700">
                      #{application.members.membership_no}
                    </span>
                  </div>
                </div>
              )}

              {/* Essential Dossier Grid (Clean & Non-Crowded) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="rounded-2xl border border-line bg-page/50 p-4 hover:border-gold/40 transition-colors">
                  <span className="block text-[11px] font-bold text-muted">الاسم الرباعي</span>
                  <span className="mt-1 block text-sm font-extrabold text-ink">
                    {application.full_name}
                  </span>
                </div>

                {/* National ID with Copy Button */}
                <div className="rounded-2xl border border-line bg-page/50 p-4 hover:border-gold/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted">الرقم القومي</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(application.national_id, "الرقم القومي")}
                      className="text-[11px] text-gold-dark hover:underline font-bold transition-transform active:scale-95"
                    >
                      نسخ
                    </button>
                  </div>
                  <span className="mt-1 block font-mono text-sm font-bold text-ink tracking-wider">
                    {application.national_id || "غير متوفر"}
                  </span>
                </div>

                {/* Phone with WhatsApp and Copy */}
                <div className="rounded-2xl border border-line bg-page/50 p-4 hover:border-gold/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted">رقم الهاتف</span>
                    <div className="flex items-center gap-2.5">
                      {application.phone && (
                        <a
                          href={`https://wa.me/20${application.phone.replace(/^0/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-600 hover:underline font-bold transition-transform active:scale-95"
                        >
                          واتساب
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy(application.phone, "رقم الهاتف")}
                        className="text-[11px] text-gold-dark hover:underline font-bold transition-transform active:scale-95"
                      >
                        نسخ
                      </button>
                    </div>
                  </div>
                  <span className="mt-1 block font-mono text-sm font-bold text-ink" dir="ltr">
                    {application.phone || "غير متوفر"}
                  </span>
                </div>

                {/* Governorate */}
                <div className="rounded-2xl border border-line bg-page/50 p-4 hover:border-gold/40 transition-colors">
                  <span className="block text-[11px] font-bold text-muted">المحافظة</span>
                  <span className="mt-1 block text-sm font-bold text-ink">
                    {application.governorate?.name_ar || "غير محددة"}
                  </span>
                </div>

                {/* Membership Type */}
                <div className="rounded-2xl border border-gold/30 bg-gold-tint/30 p-4 hover:border-gold/60 transition-colors">
                  <span className="block text-[11px] font-bold text-gold-dark">نوع الانضمام المطلوب</span>
                  <span className="mt-1 block text-sm font-black text-ink">
                    {TYPE_LABELS[application.application_type] || application.application_type}
                  </span>
                </div>

                {/* Submission Date */}
                <div className="rounded-2xl border border-line bg-page/50 p-4 hover:border-gold/40 transition-colors">
                  <span className="block text-[11px] font-bold text-muted">تاريخ ووقت التقديم</span>
                  <span className="mt-1 block text-xs font-medium text-ink">
                    {formatArabicDate(application.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-page/40 px-6 py-4">
          <span className="text-[11px] font-medium text-muted">
            حزب الجبهة الوطنية • أمانة شؤون العضوية
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint hover:text-gold-dark hover:scale-105 active:scale-95 transition-all shadow-2xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
