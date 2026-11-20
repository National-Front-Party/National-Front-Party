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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
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
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient px-4 text-xs font-extrabold text-ink shadow-sm hover:brightness-105 active:scale-95 transition-all self-start sm:self-auto disabled:opacity-50"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            <span>إضافة كادر / عضو جديد</span>
          </button>
        )}
      </div>

      {/* People List / Table */}
      {!people.length ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
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
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gold-gradient text-xs font-extrabold text-ink shadow-sm hover:brightness-105 transition-all"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              <span>إضافة أول عضو</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
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
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
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
                              className="inline-flex size-8 items-center justify-center rounded-xl text-slate-500 hover:bg-gold/10 hover:text-gold-darker transition-colors disabled:opacity-50"
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
                              className="inline-flex size-8 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
}
