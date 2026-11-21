"use client";

import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  EyeOff,
  Users,
} from "lucide-react";

export default function LeaderCardList({
  leaders = [],
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
  onMoveUp,
  onMoveDown,
  canManage = true,
  canDelete = true,
  isBusy = false,
}) {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Users className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                قائمة قيادات الحزب
              </h3>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                {leaders.length}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              القيادات المعروضة بالاسم والصفة والشارة أسفل رئيس الحزب بالصفحة الرئيسية
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={onAddNew}
            disabled={isBusy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-4.5 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-[0.99] transition-all self-start sm:self-auto disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>إضافة قيادي جديد</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {leaders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Users className="size-6" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            لا توجد قيادات مسجلة حالياً
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            أضف القيادات ونواب الرئيس ليتم عرضهم في قائمة قيادات الحزب بالموقع.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onAddNew}
              disabled={isBusy}
              className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>إضافة أول قيادي</span>
            </button>
          )}
        </div>
      ) : (
        /* Clean, Uncluttered Professional Table/List Container */
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-right text-xs" dir="rtl">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-bold">
                  <th scope="col" className="py-3 px-4 w-16 text-center">الترتيب</th>
                  <th scope="col" className="py-3 px-4">اسم القيادي</th>
                  <th scope="col" className="py-3 px-4">الصفة الحزبية</th>
                  <th scope="col" className="py-3 px-4 w-28 text-center">حالة العرض</th>
                  {canManage && (
                    <th scope="col" className="py-3 px-4 w-44 text-center">الإجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaders.map((leader, index) => {
                  const isFirst = index === 0;
                  const isLast = index === leaders.length - 1;

                  return (
                    <tr
                      key={leader.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Sort Order */}
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">
                        <span className="inline-flex size-6.5 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                          {leader.sort_order ?? index + 1}
                        </span>
                      </td>

                      {/* Name & Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {leader.full_name}
                          </span>
                          {leader.badge_label && (
                            <span className="inline-flex items-center rounded-md bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-bold text-gold-darker">
                              {leader.badge_label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role Title */}
                      <td className="py-3 px-4 text-slate-600">
                        {leader.role_title || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(leader)}
                          disabled={!canManage || isBusy}
                          title={leader.is_published ? "انقر لإيقاف العرض" : "انقر للنشر"}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-colors disabled:opacity-50 ${
                            leader.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {leader.is_published ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                              <span>منشور</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="size-3 text-slate-400" aria-hidden="true" />
                              <span>متوقف</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Reorder Up */}
                            <button
                              type="button"
                              onClick={() => onMoveUp(leader, index)}
                              disabled={isFirst || isBusy}
                              title="تحريك لأعلى"
                              className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`تحريك ${leader.full_name} لأعلى`}
                            >
                              <ArrowUp className="size-3.5" aria-hidden="true" />
                            </button>

                            {/* Reorder Down */}
                            <button
                              type="button"
                              onClick={() => onMoveDown(leader, index)}
                              disabled={isLast || isBusy}
                              title="تحريك لأسفل"
                              className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`تحريك ${leader.full_name} لأسفل`}
                            >
                              <ArrowDown className="size-3.5" aria-hidden="true" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => onEdit(leader)}
                              disabled={isBusy}
                              title="تعديل بيانات القيادي"
                              className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
                              aria-label={`تعديل ${leader.full_name}`}
                            >
                              <Edit3 className="size-3.5" aria-hidden="true" />
                            </button>

                            {/* Delete */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => onDelete(leader)}
                                disabled={isBusy}
                                title="حذف القيادي"
                                className="inline-flex size-7 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                                aria-label={`حذف ${leader.full_name}`}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Row View */}
          <div className="sm:hidden divide-y divide-slate-100">
            {leaders.map((leader, index) => {
              const isFirst = index === 0;
              const isLast = index === leaders.length - 1;

              return (
                <div key={leader.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {leader.full_name}
                        </span>
                        {leader.badge_label && (
                          <span className="inline-flex items-center rounded-md bg-gold/15 border border-gold/30 px-1.5 py-0.5 text-[10px] font-bold text-gold-darker">
                            {leader.badge_label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {leader.role_title || "عضو قيادي"}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(leader)}
                      disabled={!canManage || isBusy}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        leader.is_published
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {leader.is_published ? "منشور" : "متوقف"}
                    </button>
                  </div>

                  {/* Mobile Actions Bar */}
                  {canManage && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-xs">
                      <span className="text-[10px] text-slate-400 font-medium">
                        الترتيب: {leader.sort_order ?? index + 1}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onMoveUp(leader, index)}
                          disabled={isFirst || isBusy}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-30"
                          aria-label={`تحريك ${leader.full_name} لأعلى`}
                        >
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveDown(leader, index)}
                          disabled={isLast || isBusy}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-30"
                          aria-label={`تحريك ${leader.full_name} لأسفل`}
                        >
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(leader)}
                          disabled={isBusy}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                          aria-label={`تعديل ${leader.full_name}`}
                        >
                          <Edit3 className="size-3.5" aria-hidden="true" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(leader)}
                            disabled={isBusy}
                            className="inline-flex size-7 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600"
                            aria-label={`حذف ${leader.full_name}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
