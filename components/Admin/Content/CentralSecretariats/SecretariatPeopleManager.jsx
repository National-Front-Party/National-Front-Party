"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Users,
  UserPlus,
  ArrowRight,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";

export default function SecretariatPeopleManager({
  secretariat,
  people = [],
  onBack,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onToggleStatus,
  canManage = true,
  canDelete = true,
  busy = false,
}) {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header with Back Navigation */}
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/50 hover:text-ink hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
            aria-label="العودة لقائمة الأمانات المركزية"
            title="العودة"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">الأمانات المركزية /</span>
              <h3 className="text-base font-extrabold text-slate-900">
                {secretariat.name_ar}
              </h3>
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-darker">
                {people.length} أعضاء
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              أمين الأمانة: <strong className="text-slate-700">{secretariat.head_name || "لم يحدد بعد"}</strong>
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={onAddPerson}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient px-4 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 self-start sm:self-auto disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            <span>إضافة كادر / عضو جديد</span>
          </button>
        )}
      </div>

      {/* People List / Table */}
      {!people.length ? (
        <div className="rounded-3xl border border-dashed border-line bg-page/50 p-8 text-center sm:p-12">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-darker">
            <Users className="size-6" aria-hidden="true" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-800">
            لا يوجد أعضاء أو كوادر مسجلين في هذه الأمانة
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            أضف أعضاء هيئة مكتب الأمانة وكوادرها لعرضهم ضمن بطاقة الأمانة بالصفحة الرئيسية.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onAddPerson}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient px-4 py-2 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              <span>إضافة أول عضو</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="hidden xl:block">
            <table className="w-full table-fixed text-right text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 pr-5 pl-3 w-16 text-center">الترتيب</th>
                  <th className="py-3.5 px-3">العضو / الكادر</th>
                  <th className="py-3.5 px-3">المنصب / الصفة</th>
                  <th className="py-3.5 px-3">التفاصيل</th>
                  <th className="py-3.5 px-3 text-center">حالة النشر</th>
                  <th className="py-3.5 pl-5 pr-3 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {people.map((p) => {
                  const hasValidImage = p.image_url && !imageErrors[p.id];

                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-gold-tint/25">
                      {/* Sort Order */}
                      <td className="py-3 pr-5 pl-3 text-center">
                        <span className="inline-flex size-6 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-600">
                          {p.sort_order ?? "-"}
                        </span>
                      </td>

                      {/* Avatar & Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            {hasValidImage ? (
                              <Image
                                src={p.image_url}
                                alt={p.full_name}
                                fill
                                sizes="36px"
                                className="object-cover"
                                onError={() => handleImageError(p.id)}
                              />
                            ) : (
                              <User className="size-4 text-slate-400" aria-hidden="true" />
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 group-hover:text-gold-darker transition-colors">
                            {p.full_name}
                          </span>
                        </div>
                      </td>

                      {/* Position Title */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">
                          {p.position_title || <span className="text-slate-400 italic">عضو</span>}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-3">
                        <p className="line-clamp-1 max-w-xs text-slate-500">
                          {p.details || <span className="text-slate-400">-</span>}
                        </p>
                      </td>

                      {/* Published Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(p)}
                            disabled={busy}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                              p.is_published
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {p.is_published ? (
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
                              p.is_published
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {p.is_published ? "منشور" : "معطل"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-5 pr-3 text-left">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onEditPerson(p)}
                              disabled={busy}
                              className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-muted transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold-tint/60 hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
                              aria-label={`تعديل ${p.full_name}`}
                              title="تعديل العضو"
                            >
                              <Edit3 className="size-4" aria-hidden="true" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeletePerson(p)}
                              disabled={busy}
                              className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50"
                              aria-label={`حذف ${p.full_name}`}
                              title="حذف العضو"
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
            {people.map((p) => {
              const hasValidImage = p.image_url && !imageErrors[p.id];
              return (
                <article key={p.id} className="rounded-2xl border border-line bg-white p-4 shadow-2xs transition-shadow hover:border-gold/40 hover:shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                      {hasValidImage ? <Image src={p.image_url} alt={p.full_name} fill sizes="44px" className="object-cover" onError={() => handleImageError(p.id)} /> : <User className="size-4 text-slate-400" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-extrabold text-slate-900">{p.full_name}</h3>
                        <span className="inline-flex size-6 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-600">{p.sort_order ?? "-"}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{p.position_title || <span className="text-slate-400 italic">عضو</span>}</p>
                    </div>
                    {canManage ? (
                      <button type="button" onClick={() => onToggleStatus(p)} disabled={busy} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${p.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p.is_published ? "منشور" : "معطل"}</button>
                    ) : <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${p.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{p.is_published ? "منشور" : "معطل"}</span>}
                  </div>
                  {p.details && <p className="mt-3 break-words border-t border-line pt-3 text-xs leading-6 text-slate-500">{p.details}</p>}
                  {(canManage || canDelete) && <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2">
                    {canManage && <button type="button" onClick={() => onEditPerson(p)} disabled={busy} className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-muted transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold-tint/60 hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50" aria-label={`تعديل ${p.full_name}`} title="تعديل العضو"><Edit3 className="size-4" aria-hidden="true" /></button>}
                    {canDelete && <button type="button" onClick={() => onDeletePerson(p)} disabled={busy} className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50" aria-label={`حذف ${p.full_name}`} title="حذف العضو"><Trash2 className="size-4" aria-hidden="true" /></button>}
                  </div>}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
