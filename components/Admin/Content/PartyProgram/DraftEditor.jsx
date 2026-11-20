"use client";

import { useState, useMemo } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import {
  Save,
  Send,
  Trash2,
  Eye,
  AlertCircle,
  Copy,
  Sparkles,
} from "lucide-react";

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 50_000;
const MAX_SOURCE_NOTE_LENGTH = 500;

export default function DraftEditor({
  draft,
  published,
  onSaveDraft,
  onOpenPublishModal,
  onOpenDiscardModal,
  onOpenPreview,
  isSaving = false,
  isPublishing = false,
  isDiscarding = false,
  canManage = true,
}) {
  const [title, setTitle] = useState(draft?.title ?? published?.title ?? "برنامج الحزب");
  const [body, setBody] = useState(draft?.body ?? published?.body ?? "");
  const [sourceNote, setSourceNote] = useState(draft?.source_note ?? published?.source_note ?? "الموقع الرسمي للحزب");
  const [errors, setErrors] = useState({});

  // Determine if there are unsaved modifications compared to the server draft
  const hasUnsavedChanges = useMemo(() => {
    const baseTitle = draft?.title ?? published?.title ?? "برنامج الحزب";
    const baseBody = draft?.body ?? (draft ? "" : published?.body ?? "");
    const baseSource = draft?.source_note ?? published?.source_note ?? "الموقع الرسمي للحزب";

    return (
      title.trim() !== (baseTitle || "").trim() ||
      body !== (baseBody || "") ||
      (sourceNote || "").trim() !== (baseSource || "").trim()
    );
  }, [title, body, sourceNote, draft, published]);

  // Client validation
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = "عنوان برنامج الحزب مطلوب.";
    } else if (title.trim().length > MAX_TITLE_LENGTH) {
      newErrors.title = `يجب ألا يتجاوز العنوان ${MAX_TITLE_LENGTH} حرفاً.`;
    }

    if (!body.trim()) {
      newErrors.body = "نص محتوى برنامج الحزب مطلوب.";
    } else if (body.length > MAX_BODY_LENGTH) {
      newErrors.body = `تجاوز النص الحد الأقصى المسموح به (${MAX_BODY_LENGTH.toLocaleString("ar-EG")} حرف).`;
    }

    if (sourceNote && sourceNote.trim().length > MAX_SOURCE_NOTE_LENGTH) {
      newErrors.source_note = `يجب ألا تتجاوز ملاحظة المصدر ${MAX_SOURCE_NOTE_LENGTH} حرفاً.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validateForm() || isSaving || !canManage) return;

    await onSaveDraft({
      title: title.trim(),
      body: body,
      source_note: sourceNote.trim() || null,
    });
  };

  const handleCopyFromPublished = () => {
    if (!published) return;
    setTitle(published.title || "برنامج الحزب");
    setBody(published.body || "");
    setSourceNote(published.source_note ?? "الموقع الرسمي للحزب");
    setErrors({});
  };

  const paragraphsCount = useMemo(() => {
    return body ? body.split(/\r?\n+/).filter((p) => p.trim().length > 0).length : 0;
  }, [body]);

  const isBusy = isSaving || isPublishing || isDiscarding;
  const canPublish = Boolean(draft) && !hasUnsavedChanges && !isBusy && canManage;

  return (
    <form onSubmit={handleSave} className="space-y-6" dir="rtl">
      {/* Draft Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-3 rounded-full ${
              hasUnsavedChanges
                ? "bg-amber-500 animate-pulse"
                : draft
                ? "bg-blue-600"
                : "bg-slate-400"
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {hasUnsavedChanges
                  ? "تعديلات غير محفوظة في المحرر"
                  : draft
                  ? "مسودة عمل محفوظة في النظام"
                  : "محرر مسودة جديدة (مستند فارغ)"}
              </span>
              {hasUnsavedChanges && (
                <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  تغييرات معلقة
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {draft
                ? "الحفظ يحدّث المسودة دون التأثير على الصفحة الرئيسية، والنشر يعتمد المسودة مباشرة."
                : "يمكنك كتابة نص جديد أو نسخ محتوى النسخة المنشورة والبدء في تعديلها."}
            </p>
          </div>
        </div>

        {/* Quick Helper action */}
        {published && (
          <button
            type="button"
            onClick={handleCopyFromPublished}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors self-end sm:self-auto disabled:opacity-50"
            title="استيراد النص المنشور حالياً إلى المحرر"
          >
            <Copy className="size-3.5 text-gold-darker" aria-hidden="true" />
            <span>نسخ النص المنشور للمحرر</span>
          </button>
        )}
      </div>

      {/* Editor Fields Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card space-y-6">
        {/* Title Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="party-program-title" className="text-xs font-bold text-slate-800">
              عنوان بطاقة البرنامج <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-[11px] font-medium ${
                title.length > MAX_TITLE_LENGTH ? "text-red-600 font-bold" : "text-slate-400"
              }`}
            >
              {title.length} / {MAX_TITLE_LENGTH} حرف
            </span>
          </div>
          <input
            id="party-program-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isBusy || !canManage}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="مثال: برنامج الحزب"
            className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-gold/20 transition-all disabled:opacity-60"
          />
          {errors.title && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              <span>{errors.title}</span>
            </p>
          )}
        </div>

        {/* Body Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label htmlFor="party-program-body" className="text-xs font-bold text-slate-800">
              نص ومحاور برنامج الحزب <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span>{paragraphsCount.toLocaleString("ar-EG")} فقرة</span>
              <span>•</span>
              <span
                className={`${
                  body.length > MAX_BODY_LENGTH ? "text-red-600 font-bold" : "text-slate-400"
                }`}
              >
                {body.length.toLocaleString("ar-EG")} / {MAX_BODY_LENGTH.toLocaleString("ar-EG")} حرف
              </span>
            </div>
          </div>
          <div className="relative">
            <textarea
              id="party-program-body"
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isBusy || !canManage}
              placeholder="اكتب نص برنامج الحزب هنا... يتم حفظ الفواصل والفقرات بدقة كما تُكتب."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm leading-relaxed sm:leading-loose text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-gold/20 transition-all resize-y disabled:opacity-60"
            />
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="size-3 text-gold-darker" aria-hidden="true" />
            <span>يتم تحويل الأسطر والفواصل تلقائياً إلى فقرات منسقة في النافذة المنبثقة للجمهور.</span>
          </p>
          {errors.body && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              <span>{errors.body}</span>
            </p>
          )}
        </div>

        {/* Source Note Field */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label htmlFor="party-program-source" className="text-xs font-bold text-slate-800">
              ملاحظة المصدر
            </label>
            <span
              className={`text-[11px] font-medium ${
                sourceNote.length > MAX_SOURCE_NOTE_LENGTH ? "text-red-600 font-bold" : "text-slate-400"
              }`}
            >
              {sourceNote.length} / {MAX_SOURCE_NOTE_LENGTH} حرف
            </span>
          </div>
          <input
            id="party-program-source"
            type="text"
            value={sourceNote}
            onChange={(e) => setSourceNote(e.target.value)}
            disabled={isBusy || !canManage}
            maxLength={MAX_SOURCE_NOTE_LENGTH}
            placeholder="مثال: الموقع الرسمي للحزب"
            className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-gold/20 transition-all disabled:opacity-60"
          />
          {errors.source_note && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              <span>{errors.source_note}</span>
            </p>
          )}
        </div>

        {/* Unsaved changes notice for Publish Button */}
        {hasUnsavedChanges && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              لديك تعديلات غير محفوظة. لحماية البيانات، يجب النقر على <strong>«حفظ المسودة»</strong> أولاً لتفعيل زر النشر.
            </span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {/* Left Actions (Discard) */}
          <div>
            {draft && canManage && (
              <button
                type="button"
                onClick={onOpenDiscardModal}
                disabled={isBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 hover:bg-red-50 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span>إهمال المسودة</span>
              </button>
            )}
          </div>

          {/* Right Actions (Preview, Save, Publish) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Preview Button */}
            <button
              type="button"
              onClick={() => onOpenPreview({ title, body, source_note: sourceNote })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
            >
              <Eye className="size-4 text-slate-500" aria-hidden="true" />
              <span>معاينة البطاقة</span>
            </button>

            {/* Save Draft Button */}
            <button
              type="submit"
              disabled={isBusy || !canManage}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-bold shadow-xs transition-all active:scale-[0.99] ${
                hasUnsavedChanges
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" aria-hidden="true" />
                  <span>{hasUnsavedChanges ? "حفظ التعديلات كمسودة" : "المسودة محفوظة"}</span>
                </>
              )}
            </button>

            {/* Publish Button */}
            {canManage && (
              <button
                type="button"
                onClick={onOpenPublishModal}
                disabled={!canPublish}
                title={
                  !draft
                    ? "لا توجد مسودة محفوظة لنشرها"
                    : hasUnsavedChanges
                    ? "احفظ التعديلات كمسودة أولاً قبل النشر"
                    : "اعتماد ونشر المسودة على الصفحة الرئيسية"
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPublishing ? (
                  <>
                    <Spinner size="sm" color="ink" />
                    <span>جاري النشر...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden="true" />
                    <span>نشر المسودة الآن</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
