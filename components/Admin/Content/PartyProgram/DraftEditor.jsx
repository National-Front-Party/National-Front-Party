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
    <form onSubmit={handleSave} className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6" dir="rtl">
      {/* Draft Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-4 shadow-sm sm:px-5">
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
          <div className="min-w-0">
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
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
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
            className="inline-flex min-h-10 items-center justify-center gap-2 self-stretch rounded-xl border border-border bg-white px-4 py-2 text-xs font-bold text-ink shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/40 hover:shadow-md active:translate-y-0 sm:self-auto disabled:opacity-50"
            title="استيراد النص المنشور حالياً إلى المحرر"
          >
            <Copy className="size-3.5 text-gold-darker" aria-hidden="true" />
            <span>نسخ النص المنشور للمحرر</span>
          </button>
        )}
      </div>

      {/* Editor Fields Card */}
      <div className="space-y-6 rounded-3xl border border-line bg-white p-4 shadow-card sm:p-6 lg:p-8">
        <div className="border-b border-line pb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gold-dark">برنامج الحزب</p>
          <p className="mt-1 text-sm text-muted">حرّر العنوان والنص، ثم احفظ التغييرات كمسودة قبل النشر.</p>
        </div>
        {/* Title Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="party-program-title" className="block text-xs font-bold text-ink">
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
            className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
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
            <label htmlFor="party-program-body" className="block text-xs font-bold text-ink">
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
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isBusy || !canManage}
              placeholder="اكتب نص برنامج الحزب هنا... يتم حفظ الفواصل والفقرات بدقة كما تُكتب."
              className="min-h-[160px] max-h-[65vh] w-full resize-y rounded-2xl border border-border bg-white p-4 text-xs font-medium leading-relaxed text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="space-y-2 border-t border-line pt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="party-program-source" className="block text-xs font-bold text-ink">
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
            className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs font-medium text-ink transition-all duration-300 ease-in-out placeholder:text-muted/60 hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
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
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Left Actions (Discard) */}
          <div>
            {draft && canManage && (
              <button
                type="button"
                onClick={onOpenDiscardModal}
                disabled={isBusy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span>إهمال المسودة</span>
              </button>
            )}
          </div>

          {/* Right Actions (Preview, Save, Publish) */}
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2.5">
            {/* Preview Button */}
            <button
              type="button"
              onClick={() => onOpenPreview({ title, body, source_note: sourceNote })}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-bold text-ink transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/40 hover:shadow-md active:translate-y-0 sm:w-auto"
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
                  ? "bg-gold-gradient text-ink shadow-btn hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(201,162,74,0.3)]"
                  : "border border-border bg-white text-muted hover:border-gold hover:bg-gold-tint/40"
              }`}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" color="ink" />
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
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 text-sm font-bold text-ink shadow-btn transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_24px_rgba(201,162,74,0.3)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
