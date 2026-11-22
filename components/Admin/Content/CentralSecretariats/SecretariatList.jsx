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
    <div className="space-y-5" dir="rtl">
      {/* Search and Quick Counter Bar */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-3xl border border-line bg-page/45 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأمانات المركزية أو أسماء الأمناء..."
            className="h-14 w-full rounded-2xl border border-border bg-white py-3 pl-4 pr-10 text-xs font-medium text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm"
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
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient px-4 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
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
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="hidden xl:block">
            <table className="w-full table-fixed text-right text-sm">
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
                      className="group transition-colors hover:bg-gold-tint/25"
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold-tint/50 px-3 py-1.5 text-xs font-bold text-gold-dark shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold-tint hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
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
                            className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink shadow-2xs transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
                          >
                            <span>الأعضاء</span>
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onEdit(sec)}
                              disabled={busy}
                              className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-muted transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold-tint/60 hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
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
                              className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50"
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
          <div className="grid gap-3 p-3 xl:hidden">
            {filtered.map((sec) => {
              const peopleCount = Array.isArray(sec.people) ? sec.people.length : 0;
              return (
                <article key={sec.id} className="rounded-2xl border border-line bg-white p-4 shadow-2xs transition-shadow hover:border-gold/40 hover:shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-600">{sec.sort_order ?? "-"}</span>
                        <h3 className="break-words text-sm font-extrabold text-slate-900">{sec.name_ar}</h3>
                      </div>
                      <p className="text-xs text-slate-600">أمين الأمانة: {sec.head_name || <span className="text-slate-400 italic">غير محدد</span>}</p>
                      {sec.source_note && <p className="mt-1 break-words text-xs text-slate-400">المصدر: {sec.source_note}</p>}
                    </div>
                    {canManage ? (
                      <button type="button" onClick={() => onToggleStatus(sec)} disabled={busy} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${sec.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {sec.is_published ? "منشور" : "معطل"}
                      </button>
                    ) : <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${sec.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{sec.is_published ? "منشور" : "معطل"}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <button type="button" onClick={() => onSelectSecretariat(sec)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-gold/30 bg-gold-tint/50 px-3 text-xs font-bold text-gold-dark transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold-tint hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"><Users className="size-3.5" aria-hidden="true" />{peopleCount} عضو / كادر</button>
                    <div className="flex items-center gap-1">
                      {canManage && <button type="button" onClick={() => onEdit(sec)} disabled={busy} className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-muted transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold-tint/60 hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50" aria-label={`تعديل ${sec.name_ar}`} title="تعديل الأمانة"><Edit3 className="size-4" aria-hidden="true" /></button>}
                      {canDelete && <button type="button" onClick={() => onDelete(sec)} disabled={busy} className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50" aria-label={`حذف ${sec.name_ar}`} title="حذف الأمانة"><Trash2 className="size-4" aria-hidden="true" /></button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
