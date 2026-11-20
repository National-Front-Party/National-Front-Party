"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, History, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useToast } from "@/lib/admin/toast-context";
import { hasPermission, ROLE_LABELS } from "@/lib/admin/permissions";
import PageHeader from "@/components/Admin/ui/PageHeader";
import Skeleton from "@/components/Admin/ui/Skeleton";
import EmptyState from "@/components/Admin/ui/EmptyState";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import { toArabicDigits } from "@/lib/admin/staff-utils";

const ACTION_LABELS = {
  staff_created: "إنشاء حساب موظف",
  staff_profile_updated: "تعديل البيانات الشخصية",
  staff_role_changed: "تعديل الدور الوظيفي",
  staff_activated: "تفعيل حساب",
  staff_deactivated: "تعطيل حساب",
  staff_password_reset: "إعادة تعيين كلمة المرور",
};

const ROLE_LABELS_MAP = ROLE_LABELS;

function formatRole(value) {
  return ROLE_LABELS_MAP[value] || value;
}

function formatActive(value) {
  if (value === true) return "نشط";
  if (value === false) return "معطل";
  return String(value);
}

function formatValue(key, value) {
  if (key.includes("role")) return formatRole(value);
  if (key.includes("is_active")) return formatActive(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (value === null || value === undefined) return "—";
  return String(value);
}

function translateKey(key) {
  const map = {
    previous_role: "الدور السابق",
    new_role: "الدور الجديد",
    previous_is_active: "الحالة السابقة",
    new_is_active: "الحالة الجديدة",
    changed_fields: "الحقول المعدلة",
    new_role: "الدور الجديد",
    new_is_active: "الحالة الجديدة",
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, " ");
}

function describeAction(actionType) {
  const map = {
    staff_created: "تم إنشاء حساب موظف جديد",
    staff_profile_updated: "تم تعديل البيانات الشخصية",
    staff_role_changed: "تم تعديل الدور الوظيفي",
    staff_activated: "تم تفعيل حساب",
    staff_deactivated: "تم تعطيل حساب",
    staff_password_reset: "تم إعادة تعيين كلمة المرور",
  };
  return map[actionType] || actionType;
}

function formatDateTimeLines(value) {
  if (!value) return ["—", ""];
  try {
    const d = new Date(value);
    const date = d.toLocaleDateString("ar-IQ");
    const time = d.toLocaleTimeString("ar-IQ", { hour12: false });
    return [date, time];
  } catch {
    return [String(value), ""];
  }
}

function renderDetails(details) {
  if (!details || typeof details !== "object") return "—";
  const entries = Object.entries(details);
  if (entries.length === 0) return "—";
  return entries
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("، ");
}

export default function AuditLogPage() {
  const { user, status } = useAdminAuth();
  const { showError } = useToast();
  const isSuperAdmin = user?.role === "super_admin" || hasPermission(user?.role, "staff:manage");

  const [staffList, setStaffList] = useState([]);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [actorId, setActorId] = useState("all");
  const [targetId, setTargetId] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const staffOptions = useMemo(() => {
    const base = [{ value: "all", label: "جميع الموظفين" }];
    return base.concat(
      staffList.map((s) => ({ value: s.id, label: s.full_name })),
    );
  }, [staffList]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/staff?page=1&page_size=100");
      if (Array.isArray(res?.items)) setStaffList(res.items);
    } catch (err) {
      showError(err.message || "تعذر تحميل قائمة الموظفين");
    }
  }, [showError]);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (actorId && actorId !== "all") params.set("actor_id", actorId);
      if (targetId && targetId !== "all") params.set("target_id", targetId);
      const res = await adminFetch(`/api/admin/staff/audit-log?${params.toString()}`);
      setRecords(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total ?? 0);
    } catch (err) {
      showError(err.message || "تعذر تحميل سجل التدقيق");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actorId, targetId, showError]);

  useEffect(() => {
    if (status !== "loading" && isSuperAdmin) fetchStaff();
  }, [status, isSuperAdmin, fetchStaff]);

  useEffect(() => {
    if (status !== "loading" && isSuperAdmin) fetchAudit();
  }, [status, isSuperAdmin, fetchAudit]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (status !== "loading" && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <h2 className="text-lg font-black text-ink">غير مصرح لك بالوصول إلى هذا القسم</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 w-full" dir="rtl">
      <PageHeader
        title="سجل التدقيق"
        description="متابعة سجل العمليات الأمنية والإدارية في النظام"
        badge={
          <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
            {toArabicDigits(total)} سجل
          </span>
        }
      />

      <div className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted">المنفذ (الموظف الذي نفّذ العملية)</label>
            <div className="min-w-0 w-full sm:min-w-[200px] sm:w-auto">
              <CustomSelect
                id="audit-actor"
                placeholder="جميع الموظفين"
                options={staffOptions}
                value={actorId}
                onChange={(v) => {
                  setActorId(v);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted">المتأثر (الموظف المتأثر بالعملية)</label>
            <div className="min-w-0 w-full sm:min-w-[200px] sm:w-auto">
              <CustomSelect
                id="audit-target"
                placeholder="جميع الموظفين"
                options={staffOptions}
                value={targetId}
                onChange={(v) => {
                  setTargetId(v);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={() => <History className="size-8" />}
              title="لا توجد سجلات"
              description="لم يتم العثور على سجلات تدقيق مطابقة."
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block w-full">
              <table className="w-full text-right text-xs table-fixed">
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-4 w-[14%]">العملية</th>
                    <th className="py-4 px-4 w-[16%]">المنفذ</th>
                    <th className="py-4 px-4 w-[28%]">المتأثر</th>
                    <th className="py-4 px-4 w-[22%]">التفاصيل</th>
                    <th className="py-4 pr-4 pl-6 w-[20%]">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {records.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-gold-tint/25">
                      <td className="py-4 pr-6 pl-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border select-none bg-gold-tint text-gold-dark border-gold/40 break-words">
                          {ACTION_LABELS[r.action_type] || r.action_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-ink break-words" style={{ overflowWrap: "anywhere" }}>{r.actor_name || "—"}</div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-ink break-words" style={{ overflowWrap: "anywhere" }}>{r.target_name || "—"}</div>
                      </td>
                      <td className="py-4 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(r)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-ink shadow-btn transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer"
                          style={{ background: "linear-gradient(90deg, #be953a, #e6cc85, #be953a)" }}
                        >
                          عرض التفاصيل
                        </button>
                      </td>
                      <td className="py-4 pr-4 pl-6 text-muted text-[11px] whitespace-nowrap align-top">
                        {(() => {
                          const [date, time] = formatDateTimeLines(r.occurred_at);
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-ink">{date}</span>
                              <span className="font-mono">{time}</span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden divide-y divide-line/60">
              {records.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border select-none whitespace-nowrap bg-gold-tint text-gold-dark border-gold/40">
                      {ACTION_LABELS[r.action_type] || r.action_type}
                    </span>
                    <span className="text-[11px] text-muted">{formatDateTimeLines(r.occurred_at).join(" ")}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink">المنفذ: </span>
                    <span className="text-muted">{r.actor_name || "—"}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink">المتأثر: </span>
                    <span className="text-muted">{r.target_name || "—"}</span>
                  </div>
                  <div className="text-[11px] text-muted">{renderDetails ? null : null}{/* details */}</div>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(r)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-ink shadow-btn transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer"
                    style={{ background: "linear-gradient(90deg, #be953a, #e6cc85, #be953a)" }}
                  >
                    عرض التفاصيل
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5 border-t border-line bg-page/30 text-xs">
                <span className="text-muted">
                  عرض {toArabicDigits(records.length)} من أصل {toArabicDigits(total)} سجل
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex size-8 items-center justify-center rounded-xl border border-line bg-white text-muted transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <span className="font-mono font-bold text-ink px-2">
                    {toArabicDigits(page)} / {toArabicDigits(totalPages)}
                  </span>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex size-8 items-center justify-center rounded-xl border border-line bg-white text-muted transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter" dir="rtl">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
              <h2 className="text-base sm:text-lg font-black text-ink">تفاصيل العملية</h2>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                aria-label="إغلاق النافذة"
                className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
              >
                <svg className="size-5 transition-transform duration-300 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 text-xs space-y-4">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-muted">العملية</div>
                <div className="font-bold text-ink">{describeAction(selectedRecord.action_type)}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-page/40 p-3">
                  <div className="text-[11px] font-bold text-muted mb-1">المنفذ</div>
                  <div className="font-bold text-ink">{selectedRecord.actor_name || "—"}</div>
                  {selectedRecord.actor_email && <div className="text-[11px] text-muted dir-ltr">{selectedRecord.actor_email}</div>}
                </div>
                <div className="rounded-xl border border-line bg-page/40 p-3">
                  <div className="text-[11px] font-bold text-muted mb-1">المتأثر</div>
                  <div className="font-bold text-ink">{selectedRecord.target_name || "—"}</div>
                  {selectedRecord.target_email && <div className="text-[11px] text-muted dir-ltr">{selectedRecord.target_email}</div>}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-muted">الوقت</div>
                <div className="font-bold text-ink">{formatDateTimeLines(selectedRecord.occurred_at).join(" ")}</div>
              </div>
              {selectedRecord.details && typeof selectedRecord.details === "object" && Object.keys(selectedRecord.details).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-muted">التغييرات</div>
                  <ul className="space-y-1.5">
                    {Object.entries(selectedRecord.details).map(([k, v]) => (
                      <li key={k} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-page/40 px-3 py-2">
                        <span className="font-bold text-ink">{translateKey(k)}</span>
                        <span className="text-muted text-left" style={{ direction: "ltr" }}>
                          {Array.isArray(v)
                            ? v.map((x) => formatValue(k, x)).join("، ")
                            : formatValue(k, v)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-muted">لا توجد تفاصيل إضافية.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
