"use client";

import { Eye, Edit3, Trash2, CheckCircle2, XCircle, ArrowLeft, ArrowUp, ArrowDown, Layers, Sparkles } from "lucide-react";

export default function SpeechCardList({
  speeches = [],
  onPreview,
  onEdit,
  onDelete,
  onToggleStatus,
  onMoveUp,
  onMoveDown,
  onQuickCreate,
  canManage = true,
  canDelete = true,
  busy = false,
}) {
  if (!speeches.length) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-page/50 p-7 text-center sm:p-10" dir="rtl">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-xs">
          <Layers className="size-7" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-base font-extrabold text-slate-800">
          لا توجد أزرار مسجلة حالياً لعمود الصفحة الرئيسية
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          يمكنك إضافة وتفعيل أي عدد من الأزرار لعمود الأمانات المركزية بالصفحة الرئيسية والتحكم في نصوصها وترتيبها بحرية تامة.
        </p>

        {canManage && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onQuickCreate?.("speech-president")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gold/40 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs transition-all hover:-translate-y-0.5 hover:border-gold/70 hover:bg-gold-tint/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
            >
              <Sparkles className="size-3.5 text-gold-darker" aria-hidden="true" />
              <span>+ كلمة رئيس الحزب</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickCreate?.("speech-vice-president")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gold/40 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs transition-all hover:-translate-y-0.5 hover:border-gold/70 hover:bg-gold-tint/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
            >
              <Sparkles className="size-3.5 text-gold-darker" aria-hidden="true" />
              <span>+ كلمة النائب الأول</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickCreate?.("speech-secretary-general")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gold/40 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs transition-all hover:-translate-y-0.5 hover:border-gold/70 hover:bg-gold-tint/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
            >
              <Sparkles className="size-3.5 text-gold-darker" aria-hidden="true" />
              <span>+ كلمة نائب رئيس الحزب</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickCreate?.("central-secretariats")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gold/40 bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-2xs transition-all hover:-translate-y-0.5 hover:border-gold/70 hover:bg-gold-tint/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
            >
              <Sparkles className="size-3.5 text-gold-darker" aria-hidden="true" />
              <span>+ زر الأمانات المركزية</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {speeches.map((sp, index) => {
          const isSecretariat =
            sp.slug === "central-secretariats" ||
            sp.slug === "secretariats" ||
            sp.button_label?.includes("الأمانات المركزية");

          const isEven = index % 2 === 0;
          const buttonPreviewStyle = isEven ? "bg-slate-900 text-gold-light" : "bg-gold text-ink";
          const paragraphs = sp.body
            ? sp.body.split(/\r?\n+/).filter((p) => p.trim().length > 0)
            : [];

          return (
            <div
              key={`${sp.id ?? "sp"}-${index}`}
              className="group relative flex min-w-0 flex-col justify-between rounded-3xl border border-line bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_12px_28px_rgba(30,41,59,0.1)] sm:p-5"
            >
              <div className="space-y-3">
                {/* Header: Order Badge & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-gold-light">
                      {index + 1}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      الزر #{index + 1} بالعمود
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      (ترتيب: {sp.sort_order ?? 10})
                    </span>
                  </div>

                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => onToggleStatus(sp)}
                      disabled={busy}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                        sp.is_published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                      }`}
                      title={sp.is_published ? "انقر لإيقاف النشر" : "انقر لتفعيل النشر"}
                    >
                      {sp.is_published ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                          <span>منشور ومفعل</span>
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
                        sp.is_published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {sp.is_published ? "منشور" : "معطل"}
                    </span>
                  )}
                </div>

                {/* Button Visual Preview */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-[11px] font-medium text-slate-500 mb-1">
                    النص المعروض على الزر بالموقع:
                  </div>
                  <div
                    className={`flex h-11 items-center justify-between rounded-xl px-4 text-xs font-extrabold shadow-xs ${buttonPreviewStyle}`}
                  >
                    <span>{sp.button_label || "زر الكلمة"}</span>
                    <ArrowLeft className="size-4 shrink-0 opacity-80" aria-hidden="true" />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {isSecretariat ? "نافذة الأمانات المركزية" : "نافذة كلمة القيادة"}
                    </span>
                    <span className="min-w-0 text-xs font-bold text-slate-900 line-clamp-2 [overflow-wrap:anywhere]">
                      {sp.title || "بدون عنوان"}
                    </span>
                  </div>

                  {!isSecretariat && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 [overflow-wrap:anywhere]">
                      <span className="font-bold text-gold-darker">{sp.person_name || "المتحدث"}</span>
                      {sp.person_role_title && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">{sp.person_role_title}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Snippet */}
                <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                  <p className="line-clamp-2 text-slate-600 leading-relaxed font-normal">
                    {paragraphs[0] || sp.body || "لا يوجد نص متاح."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-1.5 font-sans text-[11px] text-slate-400">
                    <span className="min-w-0 max-w-full truncate">{sp.source_note || "الموقع الرسمي للحزب"}</span>
                    <span>{paragraphs.length} فقرة</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => onPreview(sp)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-page px-3 py-1.5 text-xs font-bold text-muted transition-all hover:border-gold/50 hover:bg-gold-tint/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
                >
                  <Eye className="size-3.5" aria-hidden="true" />
                  <span>معاينة النافذة</span>
                </button>

                <div className="flex flex-wrap items-center gap-1">
                  {/* Reorder Buttons */}
                  {canManage && (
                    <div className="flex items-center gap-0.5 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => onMoveUp(sp, index)}
                        disabled={busy || index === 0}
                        className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition-all hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-30"
                        title="تحريك لأعلى"
                        aria-label="تحريك الزر لأعلى"
                      >
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveDown(sp, index)}
                        disabled={busy || index === speeches.length - 1}
                        className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition-all hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-30"
                        title="تحريك لأسفل"
                        aria-label="تحريك الزر لأسفل"
                      >
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onEdit(sp)}
                      disabled={busy}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gold/10 px-3 text-xs font-bold text-gold-darker transition-all hover:bg-gold/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
                      title="تعديل بيانات الزر"
                    >
                      <Edit3 className="size-3.5" aria-hidden="true" />
                      <span>تعديل</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(sp)}
                      disabled={busy}
                      className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition-all hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2 disabled:opacity-50"
                      title="حذف هذا الزر"
                      aria-label={`حذف ${sp.button_label}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
