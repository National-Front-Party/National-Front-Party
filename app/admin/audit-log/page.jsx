"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Eye,
  ShieldCheck,
  FileText,
  AlertTriangle,
  UserPlus,
  UserCog,
  UserCheck,
  UserX,
  KeyRound,
  Newspaper,
} from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useToast } from "@/lib/admin/toast-context";
import { hasPermission } from "@/lib/admin/permissions";
import { getOperationDescription } from "@/lib/admin/audit-descriptions";
import PageHeader from "@/components/Admin/ui/PageHeader";
import Skeleton from "@/components/Admin/ui/Skeleton";
import EmptyState from "@/components/Admin/ui/EmptyState";
import CustomSelect from "@/components/Home/ui/CustomSelect";
import { toArabicDigits } from "@/lib/admin/staff-utils";

/* ─────────────────────────── Action meta-data ─────────────────────────── */

const ACTION_META = {
  // Staff actions
  staff_created:          { label: "إنشاء حساب موظف",          color: "emerald", icon: UserPlus   },
  staff_profile_updated:  { label: "تعديل البيانات الشخصية",    color: "blue",    icon: UserCog    },
  staff_role_changed:     { label: "تعديل الدور الوظيفي",       color: "violet",  icon: ShieldCheck },
  staff_activated:        { label: "تفعيل حساب",                color: "emerald", icon: UserCheck  },
  staff_deactivated:      { label: "تعطيل حساب",                color: "rose",    icon: UserX      },
  staff_password_reset:   { label: "إعادة تعيين كلمة المرور",   color: "amber",   icon: KeyRound   },
  // Content actions
  content_created:        { label: "إنشاء محتوى",               color: "blue",    icon: FileText   },
  content_updated:        { label: "تعديل محتوى",               color: "amber",   icon: FileText   },
  content_published:      { label: "نشر محتوى",                  color: "emerald", icon: FileText   },
  content_unpublished:    { label: "إلغاء نشر محتوى",            color: "amber",   icon: FileText   },
  content_deleted:        { label: "حذف محتوى",                  color: "rose",    icon: FileText   },
  // News actions
  news_article_created:   { label: "إنشاء خبر",                 color: "blue",    icon: Newspaper  },
  news_article_updated:   { label: "تعديل خبر",                 color: "amber",   icon: Newspaper  },
  news_article_published: { label: "نشر خبر",                   color: "emerald", icon: Newspaper  },
  news_article_deleted:   { label: "حذف خبر",                   color: "rose",    icon: Newspaper  },
};

const COLOR_MAP = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot:   "bg-emerald-500",
    icon:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  blue: {
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    dot:   "bg-blue-500",
    icon:  "bg-blue-50 text-blue-700 border-blue-200",
  },
  violet: {
    badge: "bg-violet-50 text-violet-800 border-violet-200",
    dot:   "bg-violet-500",
    icon:  "bg-violet-50 text-violet-700 border-violet-200",
  },
  amber: {
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot:   "bg-amber-500",
    icon:  "bg-amber-50 text-amber-700 border-amber-200",
  },
  rose: {
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    dot:   "bg-rose-500",
    icon:  "bg-rose-50 text-rose-700 border-rose-200",
  },
  gold: {
    badge: "bg-gold-tint text-gold-dark border-gold/40",
    dot:   "bg-gold",
    icon:  "bg-gold-tint text-gold-dark border-gold/30",
  },
};

function getActionMeta(actionType) {
  return ACTION_META[actionType] ?? { label: "عملية أخرى", color: "gold", icon: History };
}

/* ─────────────────────────── Formatters ─────────────────────────────── */

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

/* ─────────────────────────── Action badge ───────────────────────────── */

function ActionBadge({ actionType, size = "sm" }) {
  const meta = getActionMeta(actionType);
  const colors = COLOR_MAP[meta.color] ?? COLOR_MAP.gold;
  const Icon = meta.icon;
  const small = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold select-none whitespace-nowrap ${colors.badge} ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <Icon className={small ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
      {meta.label}
    </span>
  );
}

/* ─────────────────────────── Detail Modal ───────────────────────────── */

function DetailModal({ record, onClose }) {
  if (!record) return null;
  const meta = getActionMeta(record.action_type);
  const colors = COLOR_MAP[meta.color] ?? COLOR_MAP.gold;
  const Icon = meta.icon;
  const [date, time] = formatDateTimeLines(record.occurred_at);
  const operationDescription = getOperationDescription(record);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-[26px] bg-white shadow-card-hover border border-line overflow-hidden animate-modal-shell-enter">

        {/* ── Modal Header ── */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-7 py-4 sm:py-5 bg-white">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-2xl border shadow-2xs ${colors.icon}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">تفاصيل العملية</h2>
              <p className="text-[11px] text-muted mt-0.5">{meta.label}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 cursor-pointer"
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

        {/* ── Modal Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-5">

          {/* Action badge + description */}
          <div className={`flex items-center gap-3 rounded-2xl border p-4 ${colors.badge} border-opacity-60`}>
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${colors.icon}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold opacity-70 mb-0.5">نوع العملية</div>
              <div className="font-black text-sm">{meta.label}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">
                {operationDescription}
              </p>
            </div>
          </div>

          {/* Executor card */}
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-line bg-page/50 p-4 space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-gold-tint border border-gold/30 text-gold-dark">
                  <User className="size-3.5" />
                </div>
                <span className="text-[11px] font-black text-muted uppercase tracking-wide">المنفذ</span>
              </div>
              <div className="font-black text-sm text-ink">{record.actor_name || "—"}</div>
              {record.actor_email && (
                <div className="text-[11px] text-muted font-mono dir-ltr">{record.actor_email}</div>
              )}
            </div>

          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-page/50 p-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-ink border border-ink/80 text-gold shrink-0">
              <Clock className="size-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-black text-muted mb-0.5">وقت التنفيذ</div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-ink">{date}</span>
                <span className="font-mono text-xs text-muted">{time}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Modal Footer ── */}
        <div className="flex shrink-0 items-center justify-end px-5 sm:px-7 py-3.5 sm:py-4 border-t border-line bg-page/50">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-2xl border border-line bg-white text-xs font-bold text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────────────── */

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
  const [actionType, setActionType] = useState("all");
  const [operationTypes, setOperationTypes] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const staffOptions = useMemo(() => {
    const base = [{ value: "all", label: "جميع الموظفين" }];
    return base.concat(staffList.map((s) => ({ value: s.id, label: s.full_name })));
  }, [staffList]);

  const operationTypeOptions = useMemo(() => [
    { value: "all", label: "كل العمليات" },
    ...operationTypes,
  ], [operationTypes]);

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
      if (actionType && actionType !== "all") params.set("action_type", actionType);
      const res = await adminFetch(`/api/admin/staff/audit-log?${params.toString()}`);
      setRecords(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total ?? 0);
      setOperationTypes(Array.isArray(res?.operation_types) ? res.operation_types : []);
    } catch (err) {
      showError(err.message || "تعذر تحميل سجل التدقيق");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actorId, actionType, showError]);

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
        <div className="flex size-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs mb-4">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-lg font-black text-ink">غير مصرح لك بالوصول إلى هذا القسم</h2>
        <p className="mt-1 text-xs text-muted">سجل التدقيق مقتصر على مدير النظام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 w-full" dir="rtl">
      {/* ── Header ── */}
      <PageHeader
        title="سجل التدقيق"
        description="متابعة سجل العمليات الأمنية والإدارية في النظام"
        badge={
          <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
            {toArabicDigits(total)} سجل
          </span>
        }
      />

      {/* ── Filters ── */}
      <div className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="w-full space-y-1.5 sm:max-w-xl">
            <label className="text-xs font-bold text-muted block">المنفذ — الموظف الذي نفّذ العملية</label>
            <CustomSelect
              id="audit-actor"
              placeholder="جميع الموظفين"
              options={staffOptions}
              value={actorId}
              onChange={(v) => { setActorId(v); setPage(1); }}
            />
          </div>
          <div className="w-full space-y-1.5">
            <label className="text-xs font-bold text-muted block">نوع العملية</label>
            <CustomSelect
              id="audit-action-type"
              placeholder="كل العمليات"
              options={operationTypeOptions}
              value={actionType}
              onChange={(v) => { setActionType(v); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* ── Records Container ── */}
      <div className="rounded-3xl border border-line bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={() => <History className="size-8" />}
              title="لا توجد سجلات"
              description="لم يتم العثور على سجلات تدقيق مطابقة لمعايير الفلترة."
            />
          </div>
        ) : (
          <>
            {/* ── Desktop Table (lg+) ── */}
            <div className="hidden lg:block">
              <table className="w-full text-right text-xs">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[27%]" />
                  <col className="w-[23%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-3 text-right">العملية</th>
                    <th className="py-4 px-3 text-right">المنفذ</th>
                    <th className="py-4 px-3 text-right">التفاصيل</th>
                    <th className="py-4 pr-3 pl-6 text-right">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {records.map((r) => {
                    const [date, time] = formatDateTimeLines(r.occurred_at);
                    return (
                      <tr key={r.id} className="group transition-colors duration-150 hover:bg-gold-tint/20">
                        {/* Action */}
                        <td className="py-4 pr-6 pl-3">
                          <ActionBadge actionType={r.action_type} />
                        </td>

                        {/* Actor */}
                        <td className="py-4 px-3 max-w-0">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink text-gold text-[10px] font-black shadow-2xs">
                              {r.actor_name ? r.actor_name.trim().charAt(0) : "؟"}
                            </div>
                            <span className="font-bold text-ink text-xs truncate">
                              {r.actor_name || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Details button */}
                        <td className="py-4 px-3">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            className="inline-flex items-center gap-1.5 h-8 rounded-xl bg-gold-gradient px-3 text-[11px] font-bold text-ink shadow-btn transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                            عرض التفاصيل
                          </button>
                        </td>

                        {/* Time */}
                        <td className="py-4 pr-3 pl-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-ink text-[11px]">{date}</span>
                            <span className="font-mono text-muted text-[10px]">{time}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Tablet Table (md–lg) ── */}
            <div className="hidden md:block lg:hidden">
              <table className="w-full text-right text-xs">
                <colgroup>
                  <col className="w-[44%]" />
                  <col className="w-[28%]" />
                  <col className="w-[28%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-3.5 pr-5 pl-3 text-right">العملية / المنفذ</th>
                    <th className="py-3.5 px-3 text-right">التفاصيل</th>
                    <th className="py-3.5 pr-3 pl-5 text-right">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {records.map((r) => {
                    const [date, time] = formatDateTimeLines(r.occurred_at);
                    return (
                      <tr key={r.id} className="group transition-colors duration-150 hover:bg-gold-tint/20">
                        <td className="py-3.5 pr-5 pl-3 max-w-0">
                          <div className="space-y-1.5">
                            <ActionBadge actionType={r.action_type} />
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-ink text-gold text-[9px] font-black">
                                {r.actor_name ? r.actor_name.trim().charAt(0) : "؟"}
                              </div>
                              <span className="text-[11px] font-bold text-muted truncate">{r.actor_name || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            className="inline-flex items-center gap-1 h-7 rounded-xl bg-gold-gradient px-2.5 text-[10px] font-bold text-ink shadow-btn transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer"
                          >
                            <Eye className="size-3" />
                            التفاصيل
                          </button>
                        </td>
                        <td className="py-3.5 pr-3 pl-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-ink text-[10px]">{date}</span>
                            <span className="font-mono text-muted text-[10px]">{time}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards (< md) ── */}
            <div className="block md:hidden divide-y divide-line/60">
              {records.map((r) => {
                const [date, time] = formatDateTimeLines(r.occurred_at);
                return (
                  <div key={r.id} className="p-4 space-y-3 hover:bg-gold-tint/15 transition-colors">
                    {/* Row 1: badge + time */}
                    <div className="flex items-start justify-between gap-2">
                      <ActionBadge actionType={r.action_type} />
                      <div className="text-left shrink-0">
                        <div className="text-[10px] font-bold text-ink">{date}</div>
                        <div className="text-[10px] font-mono text-muted">{time}</div>
                      </div>
                    </div>

                    {/* Executor */}
                    <div className="grid grid-cols-1 gap-2">
                      <div className="rounded-xl border border-line bg-page/50 p-2.5">
                        <div className="text-[10px] font-black text-muted mb-1">المنفذ</div>
                        <div className="text-xs font-bold text-ink truncate">{r.actor_name || "—"}</div>
                      </div>
                    </div>

                    {/* Row 3: details button */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(r)}
                      className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gold-gradient text-[11px] font-bold text-ink shadow-btn transition-all duration-200 hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                      عرض التفاصيل
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
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
                    title="الصفحة السابقة"
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
                    title="الصفحة التالية"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedRecord && (
        <DetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}
