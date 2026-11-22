"use client";

import { useState, useEffect } from "react";
import { History, Shield, User } from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import Spinner from "@/components/Admin/ui/Spinner";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { formatStaffDate } from "@/lib/admin/staff-utils";
import { getRoleLabel } from "@/lib/admin/permissions";

const ACTION_CONFIG = {
  staff_created: {
    label: "إنشاء حساب الموظف",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  staff_profile_updated: {
    label: "تعديل البيانات الشخصية",
    color: "bg-sky-50 text-sky-800 border-sky-200",
  },
  staff_role_changed: {
    label: "تغيير الدور الوظيفي",
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  staff_activated: {
    label: "تفعيل الحساب",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  staff_deactivated: {
    label: "تعطيل الحساب",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  staff_password_reset: {
    label: "إعادة تعيين كلمة المرور",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
};

export default function StaffAuditModal({ isOpen, onClose, staffMember }) {
  if (!isOpen || !staffMember) return null;

  return (
    <StaffAuditLog key={staffMember.id} staffMember={staffMember} onClose={onClose} />
  );
}

function StaffAuditLog({ staffMember, onClose }) {
  const [audit, setAudit] = useState({ loading: true, error: null, events: [] });

  useEffect(() => {
    let active = true;

    adminFetch(`/api/admin/staff/audit-log?target_id=${staffMember.id}&page=1&page_size=50`)
      .then((res) => {
        if (active) {
          setAudit({ loading: false, error: null, events: res?.items || [] });
        }
      })
      .catch((err) => {
        if (active) {
          setAudit({
            loading: false,
            error: err.message || "تعذر جلب سجل تدقيق الموظف",
            events: [],
          });
        }
      });

    return () => {
      active = false;
    };
  }, [staffMember.id]);

  const { loading, error, events } = audit;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      dir="rtl"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs">
              <History className="size-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">
                سجل تدقيق الموظف
              </h2>
              <p className="text-xs text-muted mt-0.5">
                تتبع العمليات الأمنية والإدارية المنفذة على حساب {staffMember.full_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
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

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner size="md" color="gold" />
              <span className="text-xs text-muted">جاري تحميل سجل التدقيق...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 text-center">
              {error}
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={() => <Shield className="size-8 text-muted" />}
              title="لا توجد أحداث تدقيق مسجلة"
              description="لم يتم تسجيل أي عمليات أمنية أو إدارية سابقة على هذا الحساب."
            />
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const config = ACTION_CONFIG[event.action_type] || {
                  label: event.action_type,
                  color: "bg-gray-100 text-gray-800 border-gray-200",
                };

                return (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-line bg-page/40 p-4 text-xs space-y-2 hover:border-gold/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${config.color}`}
                      >
                        {config.label}
                      </span>
                      <span className="text-[11px] text-muted font-mono" style={{ direction: "ltr" }}>
                        {formatStaffDate(event.occurred_at)}
                      </span>
                    </div>

                    {/* Actor information */}
                    <div className="flex items-center gap-1.5 text-muted text-[11px] pt-1 border-t border-line/60">
                      <User className="size-3.5 text-gold-dark" />
                      <span>المنفذ:</span>
                      <span className="font-bold text-ink">{event.actor_name}</span>
                      <span className="font-mono text-muted/80 dir-ltr">({event.actor_email})</span>
                    </div>

                    {/* Details breakdown */}
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="text-[11px] text-muted bg-white/70 rounded-xl p-2.5 border border-line/50 space-y-1">
                        {event.details.previous_role && event.details.new_role && (
                          <div className="flex items-center gap-2">
                            <span>تغيير الدور:</span>
                            <span className="font-bold text-ink">
                              {getRoleLabel(event.details.previous_role)}
                            </span>
                            <span>←</span>
                            <span className="font-bold text-gold-dark">
                              {getRoleLabel(event.details.new_role)}
                            </span>
                          </div>
                        )}

                        {Array.isArray(event.details.changed_fields) && (
                          <div>
                            <span>الحقول المعدلة:</span>{" "}
                            <span className="font-bold text-ink">
                              {event.details.changed_fields
                                .map((f) => (f === "full_name" ? "الاسم" : f === "email" ? "البريد الإلكتروني" : f))
                                .join("، ")}
                            </span>
                          </div>
                        )}

                        {event.details.new_is_active !== undefined && (
                          <div>
                            <span>الحالة المعتمدة:</span>{" "}
                            <span
                              className={`font-bold ${
                                event.details.new_is_active ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {event.details.new_is_active ? "نشط" : "معطل"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end px-5 sm:px-7 py-3.5 sm:py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={onClose}
            className="h-12 px-6 rounded-2xl border border-line bg-page text-xs font-bold text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
