"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";

// Status configuration
const STATUS_CONFIG = {
  new: {
    label: "جديد",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-600",
  },
  in_progress: {
    label: "قيد المراجعة",
    tone: "bg-gold-tint text-gold-dark border-gold/40",
    dot: "bg-gold",
  },
  completed: {
    label: "مقبول",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  rejected: {
    label: "مرفوض",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
  },
  closed: {
    label: "مرفوض",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
  },
};

// Arabic date formatter
function formatArabicDateTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export default function ServiceRequestDetailsModal({
  requestId,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const { showSuccess, showError } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  // Load details
  useEffect(() => {
    if (!isOpen || !requestId) return;

    let mounted = true;
    adminFetch(`/api/admin/service-requests/${requestId}`)
      .then((data) => {
        if (mounted) {
          const reqData = data?.service_request ?? data;
          setRequest(reqData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          showError(err.message || "تعذر تحميل تفاصيل طلب الخدمة");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, requestId, showError]);

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

  // Change status handler
  const handleStatusChange = async (newStatus, note) => {
    setActionLoading(true);
    try {
      await adminFetch(`/api/admin/service-requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          ...(note ? { note } : {}),
        }),
      });
      showSuccess(
        newStatus === "completed"
          ? "تم قبول وإنجاز طلب الخدمة بنجاح"
          : newStatus === "rejected"
          ? "تم رفض طلب الخدمة"
          : "تم نقل الطلب إلى قيد المتابعة",
      );
      const updated = await adminFetch(`/api/admin/service-requests/${requestId}`);
      setRequest(updated?.service_request ?? updated);
      setShowRejectInput(false);
      setRejectNote("");
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      showError(err.message || "تعذر تحديث حالة الطلب");
    } finally {
      setActionLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard
      .writeText(String(text))
      .then(() => showSuccess(`تم نسخ ${label} إلى الحافظة بنجاح`))
      .catch(() => showError("تعذر النسخ"));
  };

  const statusCfg = STATUS_CONFIG[request?.status] || STATUS_CONFIG.new;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs transition-opacity"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-request-headline"
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted">
                  طلب خدمة رقم #{request?.request_no || "..."}
                </span>
                {request && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusCfg.tone}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <h2
                id="modal-request-headline"
                className="text-lg sm:text-xl font-black text-ink tracking-tight mt-0.5"
              >
                {loading ? "جاري تحميل تفاصيل الطلب..." : request?.full_name}
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

        {/* Status Actions Bar */}
        {request && (
          <div className="border-b border-line bg-[#FAFBFD] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted">إجراءات المتابعة:</span>

            <div className="flex items-center gap-2 flex-wrap">
              {request.status === "new" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange("in_progress")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gold bg-gold-tint px-3.5 py-1.5 text-xs font-bold text-gold-dark hover:bg-gold hover:text-white hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                >
                  {actionLoading ? <Spinner size="xs" color="gold" /> : (
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                  <span>بدء المراجعة</span>
                </button>
              )}

              {request.status === "in_progress" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange("completed")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
                  >
                    {actionLoading ? <Spinner size="xs" color="white" /> : (
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>قبول وإنجاز الطلب</span>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowRejectInput(!showRejectInput)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                  >
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>رفض الطلب</span>
                  </button>
                </>
              )}

              {request.status === "completed" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>تم قبول وإنجاز الطلب</span>
                </span>
              )}

              {(request.status === "rejected" || request.status === "closed") && (
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

        {/* Rejection input box if triggered in modal */}
        {showRejectInput && (
          <div className="border-b border-rose-200 bg-rose-50/90 p-4 animate-elem-fade-up space-y-2">
            <span className="text-xs font-bold text-rose-800 block">سبب رفض طلب الخدمة:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="اكتب سبب الرفض هنا..."
                className="flex-1 rounded-2xl border border-border bg-white px-3.5 py-2 text-xs font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              />
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange("rejected", rejectNote.trim())}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all shadow-btn disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectNote("");
                }}
                className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted hover:text-ink hover:scale-105 active:scale-95 transition-all shadow-2xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" color="gold" />
              <p className="text-xs font-bold text-muted">جاري تحميل بيانات الطلب...</p>
            </div>
          ) : !request ? (
            <div className="text-center py-12 text-muted text-xs">
              لم يتم العثور على بيانات هذا الطلب
            </div>
          ) : (
            <div className="space-y-6">
              {/* Rejection Alert if Rejected */}
              {(request.status === "rejected" || request.status === "closed") && request.internal_notes && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 animate-elem-fade-up">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900 mb-1">
                    <svg className="size-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>سبب رفض الطلب:</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed pr-6 font-medium">
                    {request.internal_notes}
                  </p>
                </div>
              )}

              {/* 1. Citizen Profile */}
              <div>
                <h3 className="text-xs font-extrabold text-ink mb-3 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-gold" />
                  <span>بيانات المواطن مقدم الطلب</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                    <span className="block text-[11px] font-bold text-muted">اسم المواطن</span>
                    <span className="mt-1 block text-xs font-bold text-ink">
                      {request.full_name}
                    </span>
                  </div>

                  {/* Phone with WhatsApp and Copy */}
                  <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted">رقم الهاتف</span>
                      <div className="flex items-center gap-2">
                        {request.phone && (
                          <a
                            href={`https://wa.me/20${request.phone.replace(/^0/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-emerald-600 hover:underline font-bold"
                            title="محادثة واتساب مباشرة"
                          >
                            واتساب
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(request.phone, "رقم الهاتف")}
                          className="text-[10px] text-gold-dark hover:underline font-bold"
                        >
                          نسخ
                        </button>
                      </div>
                    </div>
                    <span className="mt-1 block font-mono text-xs font-bold text-ink tracking-wider" dir="ltr">
                      {request.phone || "غير متوفر"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Government Service Routing */}
              <div>
                <h3 className="text-xs font-extrabold text-ink mb-3 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-gold" />
                  <span>التوجيه والجهة الحكومية المعنية</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ministry */}
                  <div className="rounded-2xl border border-gold/30 bg-gold-tint/30 p-4">
                    <span className="block text-[11px] font-bold text-gold-dark">الوزارة المعنية</span>
                    <div className="mt-1 flex items-center gap-2">
                      <svg className="size-4 text-gold-dark shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l10 8H2l10-8z" />
                      </svg>
                      <span className="text-xs font-black text-ink">
                        {request.ministry?.name_ar || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Sector */}
                  <div className="rounded-2xl border border-line bg-page/50 p-4">
                    <span className="block text-[11px] font-bold text-muted">القطاع الخدمي</span>
                    <div className="mt-1 flex items-center gap-2">
                      <svg className="size-4 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      <span className="text-xs font-bold text-ink">
                        {request.request_sector?.name_ar || request.sector?.name_ar || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Submission & Tracking Metadata */}
              <div>
                <h3 className="text-xs font-extrabold text-ink mb-3 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-gold" />
                  <span>بيانات التقديم والمتابعة الإدارية</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Created At */}
                  <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                    <span className="block text-[11px] font-bold text-muted">تاريخ ووقت التقديم</span>
                    <span className="mt-1 block text-xs font-medium text-ink">
                      {formatArabicDateTime(request.created_at)}
                    </span>
                  </div>

                  {/* Source */}
                  <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                    <span className="block text-[11px] font-bold text-muted">مصدر الطلب</span>
                    <span className="mt-1 block text-xs font-bold text-ink">
                      {request.source === "website" ? "بوابة الموقع الإلكتروني" : request.source || "الموقع"}
                    </span>
                  </div>

                  {/* Assigned Staff */}
                  <div className="rounded-2xl border border-line bg-page/50 p-3.5">
                    <span className="block text-[11px] font-bold text-muted">المسؤول عن المتابعة</span>
                    <span className="mt-1 block text-xs font-bold text-ink">
                      {request.assigned_staff_user?.full_name ? (
                        <span className="text-gold-dark font-extrabold">
                          {request.assigned_staff_user.full_name}
                        </span>
                      ) : (
                        <span className="text-muted/70">غير مسند حالياً</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Internal Notes if present */}
              {request.internal_notes && (
                <div className="rounded-2xl border border-gold/40 bg-gold-tint/20 p-4">
                  <h4 className="text-xs font-extrabold text-gold-dark mb-1 flex items-center gap-2">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>ملاحظات داخلية مسجلة</span>
                  </h4>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    {request.internal_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-page/40 px-6 py-4">
          <span className="text-[11px] font-medium text-muted">
            حزب الجبهة الوطنية • منظومة إدارة خدمات المواطنين
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-5 py-2 text-xs font-bold text-ink hover:border-gold hover:bg-gold-tint hover:text-gold-dark transition-all shadow-2xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
