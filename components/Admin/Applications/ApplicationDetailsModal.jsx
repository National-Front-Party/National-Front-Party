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

function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  try {
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  } catch {
    return null;
  }
}

export default function ApplicationDetailsModal({
  applicationId,
  isOpen,
  onClose,
  onStatusUpdated,
  staffList = [],
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

  // Note form state
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Assignment state
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Active tab in modal: "details" | "notes" | "history"
  const [activeTab, setActiveTab] = useState("details");

  const canUpdate = canAccess(user?.role, "applications:update");

  // Fetch application details
  const fetchDetails = useCallback(async () => {
    if (!applicationId) return;
    try {
      const data = await adminFetch(`/api/admin/applications/${applicationId}`);
      const appData = data?.application ?? data;
      setApplication(appData);
      setSelectedAssignee(appData?.assigned_to || "");
    } catch (err) {
      showError(err.message || "تعذر تحميل بيانات الطلب");
      onClose();
    }
  }, [applicationId, showError, onClose]);

  useEffect(() => {
    if (isOpen && applicationId) {
      let mounted = true;
      adminFetch(`/api/admin/applications/${applicationId}`)
        .then((data) => {
          if (mounted) {
            const appData = data?.application ?? data;
            setApplication(appData);
            setSelectedAssignee(appData?.assigned_to || "");
            setLoading(false);
          }
        })
        .catch((err) => {
          if (mounted) {
            showError(err.message || "تعذر تحميل بيانات الطلب");
            onClose();
          }
        });

      return () => {
        mounted = false;
      };
    }
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
    navigator.clipboard.writeText(text);
    showSuccess(`تم نسخ ${label} بنجاح`);
  };

  // Change status (move to under_review or accept)
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

  // Add internal note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      await adminFetch(`/api/admin/applications/${applicationId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: newNote.trim() }),
      });
      showSuccess("تم إضافة الملاحظة الداخلية بنجاح");
      setNewNote("");
      await fetchDetails();
    } catch (err) {
      showError(err.message || "تعذر إضافة الملاحظة");
    } finally {
      setNoteLoading(false);
    }
  };

  // Assign application
  const handleAssignment = async () => {
    setAssignLoading(true);
    try {
      const payload = {
        assigned_to: selectedAssignee ? selectedAssignee : null,
      };
      await adminFetch(`/api/admin/applications/${applicationId}/assignment`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      showSuccess(
        selectedAssignee
          ? "تم إسناد الطلب للموظف بنجاح"
          : "تم إلغاء إسناد الطلب بنجاح",
      );
      await fetchDetails();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      showError(err.message || "تعذر تعديل إسناد الطلب");
    } finally {
      setAssignLoading(false);
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
        className="relative w-full max-w-3xl overflow-hidden rounded-[26px] border border-line bg-white shadow-card-hover animate-elem-fade-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
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

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="flex size-10 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:bg-gold-tint/40 hover:text-ink transition-all shadow-2xs"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Action Bar (Status Transitions) */}
        {application && canUpdate && (
          <div className="border-b border-line bg-[#FAFBFD] px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted">إجراءات الحالة:</span>

            <div className="flex items-center gap-2 flex-wrap">
              {/* If NEW: Move to under_review */}
              {application.status === "new" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("under_review")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gold bg-gold-tint px-4 py-2 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs disabled:opacity-50"
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-btn disabled:opacity-50"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-2xs disabled:opacity-50"
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
                  <span>تم قبول الطلب (مكتمل)</span>
                </span>
              )}

              {application.status === "rejected" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
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
            <p className="text-xs font-bold text-emerald-950 mb-3">
              هل أنت متأكد من رغبتك في قبول طلب الانضمام لـ «{application?.full_name}»؟
              سيتم إنشاء سجل عضوية رسمي برقم عضوية فريد إذا كان نوع الطلب «عضوية عاملة».
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange("accepted")}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-all shadow-btn disabled:opacity-50"
              >
                {actionLoading ? <Spinner size="sm" color="white" /> : "نعم، تأكيد القبول"}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowAcceptConfirm(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-muted hover:text-ink transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Rejection Form Box */}
        {showRejectForm && (
          <div className="border-b border-rose-200 bg-rose-50/80 p-4 animate-elem-fade-up">
            <label className="block text-xs font-bold text-rose-950 mb-1.5">
              سبب الرفض (إلزامي - سيتم توثيقه في سجل الحالة):
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض بالتفصيل..."
              className="w-full rounded-xl border border-rose-300 bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              maxLength={1000}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted">
                {rejectionReason.length} / 1000 حرف
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading || !rejectionReason.trim()}
                  onClick={() => handleStatusChange("rejected", rejectionReason)}
                  className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800 transition-all shadow-btn disabled:opacity-50"
                >
                  {actionLoading ? <Spinner size="sm" color="white" /> : "تأكيد الرفض"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-muted hover:text-ink transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex shrink-0 border-b border-line bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition-colors ${
              activeTab === "details"
                ? "border-gold text-gold-dark"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span>بيانات المتقدم</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition-colors ${
              activeTab === "notes"
                ? "border-gold text-gold-dark"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span>الملاحظات الداخلية</span>
            {application?.internal_notes && (
              <span className="size-2 rounded-full bg-gold" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition-colors ${
              activeTab === "history"
                ? "border-gold text-gold-dark"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span>سجل الحالات</span>
            <span className="rounded-full bg-line px-1.5 py-0.2 text-[10px] text-muted">
              {application?.application_status_history?.length || 0}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:thin]">
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
            <>
              {/* TAB 1: DETAILS */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  {/* Rejection Alert if Rejected */}
                  {application.status === "rejected" && application.rejection_reason && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-900 mb-1">
                        <svg className="size-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>سبب رفض الطلب:</span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed pr-6">
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
                      <div className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-center">
                        <span className="block text-[10px] text-muted">رقم العضوية</span>
                        <span className="text-xs font-black text-emerald-700">
                          #{application.members.membership_no}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Personal Info Grid */}
                  <div>
                    <h3 className="text-xs font-extrabold text-ink mb-3 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-gold" />
                      <span>البيانات الشخصية للمتقدم</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Full Name */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">الاسم الرباعي</span>
                        <span className="mt-1 block text-xs font-bold text-ink">
                          {application.full_name}
                        </span>
                      </div>

                      {/* National ID */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-muted">الرقم القومي</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(application.national_id, "الرقم القومي")}
                            className="text-[10px] text-gold-dark hover:underline font-bold"
                          >
                            نسخ
                          </button>
                        </div>
                        <span className="mt-1 block font-mono text-xs font-bold text-ink tracking-wider">
                          {application.national_id || "غير متوفر"}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-muted">رقم الهاتف</span>
                          <div className="flex items-center gap-2">
                            {application.phone && (
                              <a
                                href={`https://wa.me/20${application.phone.replace(/^0/, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-600 hover:underline font-bold"
                              >
                                واتساب
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopy(application.phone, "رقم الهاتف")}
                              className="text-[10px] text-gold-dark hover:underline font-bold"
                            >
                              نسخ
                            </button>
                          </div>
                        </div>
                        <span className="mt-1 block font-mono text-xs font-bold text-ink" dir="ltr">
                          {application.phone || "غير متوفر"}
                        </span>
                      </div>

                      {/* Governorate */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">المحافظة</span>
                        <span className="mt-1 block text-xs font-bold text-ink">
                          {application.governorate?.name_ar || "غير محددة"}
                        </span>
                      </div>

                      {/* Birth Date & Age */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">تاريخ الميلاد / السن</span>
                        <span className="mt-1 block text-xs font-bold text-ink">
                          {application.birth_date
                            ? `${application.birth_date.substring(0, 10)} (${calculateAge(application.birth_date)} سنة)`
                            : "—"}
                        </span>
                      </div>

                      {/* Gender */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">النوع</span>
                        <span className="mt-1 block text-xs font-bold text-ink">
                          {application.gender === "male"
                            ? "ذكر"
                            : application.gender === "female"
                            ? "أنثى"
                            : "—"}
                        </span>
                      </div>

                      {/* Membership Type */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">نوع الانضمام المطلوب</span>
                        <span className="mt-1 block text-xs font-extrabold text-gold-dark">
                          {TYPE_LABELS[application.application_type] || application.application_type}
                        </span>
                      </div>

                      {/* Submission Date */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">تاريخ ووقت التقديم</span>
                        <span className="mt-1 block text-xs font-medium text-ink">
                          {formatArabicDate(application.created_at)}
                        </span>
                      </div>

                      {/* Source */}
                      <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                        <span className="block text-[11px] font-bold text-muted">مصدر التقديم</span>
                        <span className="mt-1 block text-xs font-bold text-ink">
                          {application.source === "website" ? "الموقع الإلكتروني الرسمي" : application.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment Section */}
                  {canUpdate && (
                    <div className="rounded-2xl border border-line bg-[#FAFBFD] p-4">
                      <h3 className="text-xs font-extrabold text-ink mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-gold" />
                          <span>إسناد الطلب لموظف مسؤول</span>
                        </div>
                        {application.assigned_staff_user && (
                          <span className="text-[11px] font-bold text-gold-dark">
                            المسؤول الحالي: {application.assigned_staff_user.full_name}
                          </span>
                        )}
                      </h3>

                      {staffList.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <select
                            value={selectedAssignee}
                            onChange={(e) => setSelectedAssignee(e.target.value)}
                            className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-gold focus:outline-none"
                          >
                            <option value="">— غير مسند (بدون مسؤول) —</option>
                            {staffList.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.full_name} ({staff.email})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={assignLoading || selectedAssignee === (application.assigned_to || "")}
                            onClick={handleAssignment}
                            className="rounded-xl bg-gold-tint border border-gold/40 px-4 py-2 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white transition-all shadow-2xs disabled:opacity-50"
                          >
                            {assignLoading ? <Spinner size="sm" color="gold" /> : "تحديث الإسناد"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">
                          {application.assigned_staff_user
                            ? `الطلب مسند للموظف: ${application.assigned_staff_user.full_name}`
                            : "الطلب غير مسند لأي موظف حالياً (تعديل الإسناد متاح لمدير النظام)."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INTERNAL NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-5">
                  {/* Notes List */}
                  <div>
                    <h3 className="text-xs font-extrabold text-ink mb-3 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-gold" />
                      <span>الملاحظات الداخلية المسجلة</span>
                    </h3>

                    {application.internal_notes ? (
                      <div className="rounded-2xl border border-line bg-page/60 p-4 whitespace-pre-wrap text-xs text-ink leading-relaxed font-sans">
                        {application.internal_notes}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-line/60 bg-page/30 p-4 text-center text-xs text-muted">
                        لا توجد ملاحظات داخلية مدونة على هذا الطلب حتى الآن.
                      </p>
                    )}
                  </div>

                  {/* Add Note Form */}
                  {canUpdate && (
                    <form onSubmit={handleAddNote} className="rounded-2xl border border-line bg-[#FAFBFD] p-4">
                      <label className="block text-xs font-extrabold text-ink mb-2">
                        إضافة ملاحظة جديدة (خاصة بالموظفين):
                      </label>
                      <textarea
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="اكتب ملاحظتك الداخلية هنا..."
                        maxLength={1000}
                        className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink placeholder:text-muted/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-muted">
                          {newNote.length} / 1000 حرف
                        </span>
                        <button
                          type="submit"
                          disabled={noteLoading || !newNote.trim()}
                          className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-gold hover:bg-surface-dark transition-all shadow-2xs disabled:opacity-50"
                        >
                          {noteLoading ? <Spinner size="sm" color="gold" /> : "حفظ الملاحظة"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: STATUS HISTORY */}
              {activeTab === "history" && (
                <div>
                  <h3 className="text-xs font-extrabold text-ink mb-4 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-gold" />
                    <span>تتبع مراحل وسجل الحالة للطلب</span>
                  </h3>

                  {(application?.application_status_history || []).length === 0 ? (
                    <p className="text-xs text-muted text-center py-8">
                      لا يوجد سجل حركات سابق لهذا الطلب.
                    </p>
                  ) : (
                    <div className="relative border-r-2 border-line/80 pr-5 space-y-6 mr-3">
                      {(application?.application_status_history || []).map((entry) => {
                        const fromLabel = entry.from_status
                          ? STATUS_CONFIG[entry.from_status]?.label || entry.from_status
                          : "إنشاء الطلب";
                        const toCfg = STATUS_CONFIG[entry.to_status] || STATUS_CONFIG.new;

                        return (
                          <div key={entry.id} className="relative group">
                            {/* Dot on line */}
                            <span className="absolute -right-[27px] top-1 size-3 rounded-full border-2 border-white bg-gold shadow-xs" />

                            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-2xs">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-muted">
                                    {fromLabel}
                                  </span>
                                  <span className="text-xs text-muted">←</span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${toCfg.tone}`}
                                  >
                                    <span className={`size-1.5 rounded-full ${toCfg.dot}`} />
                                    {toCfg.label}
                                  </span>
                                </div>

                                <span className="text-[11px] text-muted">
                                  {formatArabicDate(entry.changed_at)}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[11px] text-muted border-t border-line/50 pt-2">
                                <span>
                                  بواسطة:{" "}
                                  <strong className="text-ink">
                                    {entry.changed_by_staff_user?.full_name || "النظام"}
                                  </strong>
                                </span>
                                {entry.note && (
                                  <span className="text-rose-700 italic">
                                    ملاحظة: {entry.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
