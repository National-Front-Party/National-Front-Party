"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
} from "lucide-react";

export default function SecretariatList({
  secretariats = [],
  onSelectSecretariat,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
  canManage = true,
  canDelete = true,
  busy = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = secretariats.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.name_ar?.toLowerCase().includes(q) ||
      sec.head_name?.toLowerCase().includes(q) ||
      sec.source_note?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search and Quick Counter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأمانات المركزية أو أسماء الأمناء..."
            className="w-full h-10 pr-10 pl-4 rounded-2xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-hidden transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500">
            إجمالي: <strong className="text-slate-900">{secretariats.length}</strong> أمانة
          </span>
          {canManage && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient px-4 text-xs font-extrabold text-ink shadow-sm hover:brightness-105 active:scale-95 transition-all"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>إضافة أمانة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Secretariats List / Table */}
      {!filtered.length ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-darker">
            <Building2 className="size-6" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">
            {searchQuery ? "لا توجد أمانات مطابقة للبحث" : "لا توجد أمانات مركزية مسجلة"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery
              ? "جرّب تغيير كلمات البحث."
              : "يمكنك البدء بإضافة التشكيلات والأمانات التخصصية للحزب."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 pr-5 pl-3 w-16 text-center">الترتيب</th>
                  <th className="py-3.5 px-3">اسم الأمانة المركزية</th>
                  <th className="py-3.5 px-3">أمين الأمانة</th>
                  <th className="py-3.5 px-3 text-center">الكوادر والأعضاء</th>
                  <th className="py-3.5 px-3 text-center">حالة النشر</th>
                  <th className="py-3.5 pl-5 pr-3 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((sec) => {
                  const peopleCount = Array.isArray(sec.people) ? sec.people.length : 0;

                  return (
                    <tr
                      key={sec.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Sort Order */}
                      <td className="py-3 pr-5 pl-3 text-center">
                        <span className="inline-flex size-6 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-600">
                          {sec.sort_order ?? "-"}
                        </span>
                      </td>

                      {/* Name Ar */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 group-hover:text-gold-darker transition-colors">
                            {sec.name_ar}
                          </span>
                          {sec.source_note && (
                            <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                              المصدر: {sec.source_note}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Head Name */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">
                          {sec.head_name || <span className="text-slate-400 italic">غير محدد</span>}
                        </span>
                      </td>

                      {/* Members Count & Manage CTA */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectSecretariat(sec)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold-tint/40 hover:bg-gold-tint px-3 py-1 text-xs font-bold text-gold-darker transition-colors shadow-2xs"
                          title="عرض وإدارة أعضاء هذه الأمانة"
                        >
                          <Users className="size-3.5" aria-hidden="true" />
                          <span>{peopleCount} عضو / كادر</span>
                        </button>
                      </td>

                      {/* Published Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(sec)}
                            disabled={busy}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                              sec.is_published
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {sec.is_published ? (
                              <>
                                <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                                <span>منشور</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="size-3 text-slate-400" aria-hidden="true" />
                                <span>معطل</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              sec.is_published
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {sec.is_published ? "منشور" : "معطل"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-5 pr-3 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectSecretariat(sec)}
                            className="inline-flex h-8 items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-2.5 text-[11px] font-bold text-slate-700 transition-colors"
                          >
                            <span>الأعضاء</span>
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onEdit(sec)}
                              disabled={busy}
                              className="inline-flex size-8 items-center justify-center rounded-xl text-slate-500 hover:bg-gold/10 hover:text-gold-darker transition-colors disabled:opacity-50"
                              aria-label={`تعديل ${sec.name_ar}`}
                              title="تعديل الأمانة"
                            >
                              <Edit3 className="size-4" aria-hidden="true" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(sec)}
                              disabled={busy}
                              className="inline-flex size-8 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                              aria-label={`حذف ${sec.name_ar}`}
                              title="حذف الأمانة"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
