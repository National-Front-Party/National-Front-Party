"use client";

import { CheckCircle2, Clock, ShieldCheck, FileEdit, BookOpen, AlertCircle } from "lucide-react";

function formatArabicDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function PublishedProgramCard({
  published,
  onStartDraftFromPublished,
  hasDraft = false,
  canManage = true,
}) {
  if (!published) {
    return (
      <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center" dir="rtl">
        <AlertCircle className="mx-auto size-10 text-amber-500 mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-amber-900 mb-1">
          لا يوجد محتوى منشور حالياً لبرنامج الحزب
        </h3>
        <p className="text-xs text-amber-700 max-w-md mx-auto mb-4">
          لم يتم العثور على سجل منشور لبرنامج الحزب. يمكنك إنشاء مسودة جديدة من تبويب المحرر واعتماد نشرها.
        </p>
      </div>
    );
  }

  const paragraphs = Array.isArray(published.paragraphs) && published.paragraphs.length > 0
    ? published.paragraphs
    : (published.body ? published.body.split(/\r?\n+/) : []);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Published Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-950">النسخة المنشورة حالياً على الموقع</span>
              <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                مباشر للجمهور
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              هذا المحتوى ظاهر الآن في بطاقة «برنامج الحزب» بالصفحة الرئيسية للموقع.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-900/80 self-end sm:self-auto">
          <Clock className="size-3.5 text-emerald-700" aria-hidden="true" />
          <span>آخر تحديث: {formatArabicDate(published.updated_at)}</span>
        </div>
      </div>

      {/* Main Content Card (Read-Only) */}
      <div className="relative rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card overflow-hidden">
        {/* Protection Watermark & Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-ink text-gold-light shadow-xs">
              <BookOpen className="size-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">عنوان البطاقة المنشورة</span>
              <h2 className="text-xl font-extrabold text-slate-900">
                {published.title || "برنامج الحزب"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
              <span>محتوى محمي من التعديل المباشر</span>
            </span>
            {!hasDraft && canManage && onStartDraftFromPublished && (
              <button
                type="button"
                onClick={onStartDraftFromPublished}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gold/15 px-3.5 py-1.5 text-xs font-bold text-gold-darker hover:bg-gold/25 transition-colors"
              >
                <FileEdit className="size-3.5" aria-hidden="true" />
                <span>إنشاء مسودة من هذا المحتوى</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Paragraphs */}
        <div className="py-6 space-y-4">
          <span className="text-xs font-bold text-slate-500 block mb-2">
            نص البرنامج ({paragraphs.length.toLocaleString("ar-EG")} فقرة):
          </span>
          <div className="space-y-3.5 rounded-2xl bg-slate-50/70 p-5 sm:p-6 text-sm leading-relaxed sm:leading-loose text-slate-800 border border-slate-100">
            {paragraphs.map((p, idx) => (
              <p key={idx} className="text-justify">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Source Note Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">ملاحظة المصدر: </span>
            <span>{published.source_note || "الموقع الرسمي للحزب"}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            معرف السجل: #{published.id}
          </span>
        </div>
      </div>
    </div>
  );
}
