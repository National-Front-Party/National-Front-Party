"use client";

import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Admin/ui/Spinner";
import { X, Mic2, Edit3, AlertCircle, Save, CheckCircle2, Sparkles } from "lucide-react";

const MAX_TITLE = 200;
const MAX_BUTTON_LABEL = 200;
const MAX_PERSON_NAME = 200;
const MAX_ROLE_TITLE = 200;
const MAX_BODY = 10000;
const MAX_SOURCE_NOTE = 500;

export const STANDARD_TEMPLATES = [
  {
    id: "speech-president",
    label: "كلمة رئيس الحزب",
    baseSlug: "speech-president",
    buttonLabel: "كلمة رئيس الحزب",
    title: "كلمة رئيس الحزب",
    personRole: "رئيس الحزب",
    defaultPersonName: "",
    defaultBody: "",
    sourceNote: "الموقع الرسمي للحزب",
  },
  {
    id: "speech-vice-president",
    label: "كلمة النائب الأول",
    baseSlug: "speech-vice-president",
    buttonLabel: "كلمة النائب الأول",
    title: "كلمة النائب الأول لرئيس الحزب",
    personRole: "النائب الأول لرئيس الحزب والأمين العام",
    defaultPersonName: "",
    defaultBody: "",
    sourceNote: "الموقع الرسمي للحزب",
  },
  {
    id: "speech-secretary-general",
    label: "كلمة نائب رئيس الحزب",
    baseSlug: "speech-secretary-general",
    buttonLabel: "كلمة نائب رئيس الحزب",
    title: "كلمة نائب رئيس الحزب",
    personRole: "نائب رئيس الحزب",
    defaultPersonName: "",
    defaultBody: "",
    sourceNote: "الموقع الرسمي للحزب",
  },
  {
    id: "central-secretariats",
    label: "زر الأمانات المركزية",
    baseSlug: "central-secretariats",
    buttonLabel: "الأمانات المركزية",
    title: "الأمانات المركزية",
    personRole: "الأمانات المركزية بالحزب",
    defaultPersonName: "الأمانة العامة",
    defaultBody: "الأمانات المركزية لحزب الجبهة الوطنية وتشكيلاتها القيادية والتنظيمية في خدمة المواطنين والوطن.",
    sourceNote: "الموقع الرسمي للحزب",
  },
];

export default function SpeechFormModal({
  isOpen,
  onClose,
  speech = null,
  existingSlugs = [],
  nextSortOrder = 10,
  defaultSlug = "",
  defaultButtonLabel = "",
  defaultTitle = "",
  defaultPersonRole = "",
  onSave,
  isSubmitting = false,
}) {
  const isEditing = Boolean(speech?.id);

  const [slug, setSlug] = useState(speech?.slug || defaultSlug || "");
  const [buttonLabel, setButtonLabel] = useState(
    speech?.button_label || defaultButtonLabel || ""
  );
  const [title, setTitle] = useState(speech?.title || defaultTitle || "");
  const [personName, setPersonName] = useState(speech?.person_name || "");
  const [personRoleTitle, setPersonRoleTitle] = useState(
    speech?.person_role_title || defaultPersonRole || ""
  );
  const [body, setBody] = useState(speech?.body || "");
  const [sourceNote, setSourceNote] = useState(
    speech?.source_note || "الموقع الرسمي للحزب"
  );
  const [sortOrder, setSortOrder] = useState(
    speech?.sort_order !== undefined && speech?.sort_order !== null
      ? String(speech.sort_order)
      : String(nextSortOrder)
  );
  const [isPublished, setIsPublished] = useState(speech?.is_published ?? true);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const modalCardRef = useRef(null);
  const initialInputRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management on open
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    const timer = setTimeout(() => {
      initialInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  // Escape key & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting && !localSubmitting) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current) {
        const focusable = Array.from(
          modalCardRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, localSubmitting, onClose]);

  if (!isOpen) return null;

  // Generate unique slug helper (silent backend identifier)
  const getUniqueSlug = (base) => {
    let candidate = base;
    let counter = 2;
    const slugsSet = new Set(existingSlugs.filter((s) => s !== speech?.slug));
    while (slugsSet.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter++;
    }
    return candidate;
  };

  // Derive unique clean slug based on keywords or timestamp
  const deriveSilentSlug = () => {
    if (isEditing && speech?.slug) return speech.slug;
    if (slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return getUniqueSlug(slug);
    }
    const trimmed = (buttonLabel || "").trim();
    let base = "speech-btn";
    if (trimmed.includes("رئيس")) base = "speech-president";
    else if (trimmed.includes("أمانات") || trimmed.includes("مركزية")) base = "central-secretariats";
    else if (trimmed.includes("أمين") || trimmed.includes("عام")) base = "speech-secretary-general";
    else if (trimmed.includes("نائب") && trimmed.includes("ثاني")) base = "speech-deputy-2";
    else if (trimmed.includes("نائب") || trimmed.includes("أول")) base = "speech-vice-president";
    else base = `speech-${Date.now().toString(36)}`;

    return getUniqueSlug(base);
  };

  // Apply Quick Template
  const handleApplyTemplate = (template) => {
    const uniqueSlug = getUniqueSlug(template.baseSlug);
    setSlug(uniqueSlug);
    setButtonLabel(template.buttonLabel);
    setTitle(template.title);
    setPersonRoleTitle(template.personRole);
    if (template.defaultPersonName && !personName) {
      setPersonName(template.defaultPersonName);
    }
    if (template.defaultBody && !body) {
      setBody(template.defaultBody);
    }
    setSourceNote(template.sourceNote);
  };

  const handleFieldChange = (field, setter, value) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (serverError) setServerError("");
  };

  const validate = () => {
    const errs = {};

    // 1. Button Label
    const trimmedBtn = buttonLabel.trim();
    if (!trimmedBtn) {
      errs.buttonLabel = "اسم الزر في الصفحة الرئيسية مطلوب.";
    } else if (trimmedBtn.length > MAX_BUTTON_LABEL) {
      errs.buttonLabel = `اسم الزر يتجاوز الحد الأقصى (${MAX_BUTTON_LABEL} حرفاً).`;
    }

    // 2. Title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errs.title = "عنوان النافذة المنبثقة مطلوب.";
    } else if (trimmedTitle.length > MAX_TITLE) {
      errs.title = `عنوان النافذة يتجاوز الحد الأقصى (${MAX_TITLE} حرفاً).`;
    }

    // 3. Person Name
    const trimmedName = personName.trim();
    if (!trimmedName) {
      errs.personName = "اسم المتحدث / الجهة مطلوب.";
    } else if (trimmedName.length > MAX_PERSON_NAME) {
      errs.personName = `اسم المتحدث يتجاوز الحد الأقصى (${MAX_PERSON_NAME} حرفاً).`;
    }

    // 4. Person Role Title
    const trimmedRole = personRoleTitle.trim();
    if (!trimmedRole) {
      errs.personRoleTitle = "الصفة الحزبية للمتحدث مطلوبة.";
    } else if (trimmedRole.length > MAX_ROLE_TITLE) {
      errs.personRoleTitle = `الصفة تتجاوز الحد الأقصى (${MAX_ROLE_TITLE} حرفاً).`;
    }

    // 5. Body
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      errs.body = "نص ومحاور الكلمة مطلوب.";
    } else if (trimmedBody.length > MAX_BODY) {
      errs.body = `نص الكلمة يتجاوز الحد الأقصى (${MAX_BODY} حرفاً).`;
    }

    // 6. Source Note
    const trimmedSource = sourceNote.trim();
    if (trimmedSource.length > MAX_SOURCE_NOTE) {
      errs.sourceNote = `ملاحظة المصدر تتجاوز الحد الأقصى (${MAX_SOURCE_NOTE} حرفاً).`;
    }

    // 7. Sort Order
    if (sortOrder.trim() !== "") {
      const parsed = Number(sortOrder);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 32767) {
        errs.sortOrder = "ترتيب الظهور يجب أن يكون عدداً صحيحاً بين 0 و 32767.";
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      if (clientErrors.buttonLabel) {
        initialInputRef.current?.focus();
      } else if (clientErrors.title) {
        document.getElementById("speech-title")?.focus();
      } else if (clientErrors.personName) {
        document.getElementById("speech-person-name")?.focus();
      } else if (clientErrors.personRoleTitle) {
        document.getElementById("speech-person-role")?.focus();
      } else if (clientErrors.body) {
        document.getElementById("speech-body")?.focus();
      }
      return;
    }

    try {
      setLocalSubmitting(true);
      const targetSlug = deriveSilentSlug();
      await onSave({
        slug: targetSlug,
        button_label: buttonLabel.trim(),
        title: title.trim(),
        person_name: personName.trim(),
        person_role_title: personRoleTitle.trim(),
        body: body.trim(),
        source_note: sourceNote.trim() || "",
        sort_order: sortOrder.trim() === "" ? nextSortOrder : Number(sortOrder),
        is_published: Boolean(isPublished),
      });
    } catch (err) {
      const errMsg = String(err?.message || "");
      if (
        err?.code === "DUPLICATE_SLUG" ||
        err?.code === "DUPLICATE" ||
        errMsg.includes("مكرر") ||
        errMsg.includes("Slug") ||
        errMsg.includes("slug")
      ) {
        setSlug(`speech-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`);
        setServerError("حدث تعارض أثناء حفظ هذا الزر، يرجى المحاولة مرة أخرى.");
      } else {
        setServerError(
          err?.message || "تعذر حفظ بيانات الزر. يرجى التأكد من الحقول والمحاولة مرة أخرى."
        );
      }
    } finally {
      setLocalSubmitting(false);
    }
  };

  const busy = isSubmitting || localSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-full items-start justify-center overflow-y-auto bg-slate-950/60 p-3 py-5 backdrop-blur-xs sm:items-center sm:p-5 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speech-form-modal-title"
    >
      <div
        ref={modalCardRef}
        className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card sm:max-h-[90vh]"
        dir="rtl"
      >
        {/* Modal Header (Pinned at top) */}
        <div className="flex items-center justify-between p-6 sm:px-8 sm:py-5 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-xs">
              {isEditing ? (
                <Edit3 className="size-6" aria-hidden="true" />
              ) : (
                <Mic2 className="size-6" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2
                id="speech-form-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {isEditing ? `تعديل «${speech?.button_label || speech?.title}»` : "إضافة زر جديد بالصفحة الرئيسية"}
              </h2>
              <p className="text-xs text-slate-500">
                إدارة نصوص الزر والنافذة المنبثقة وموقعه في عمود الأمانات المركزية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-105 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
            aria-label="إغلاق النافذة"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="speech-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-7">
          {/* Quick Templates Bar (For New Buttons) */}
          {!isEditing && (
            <div className="rounded-2xl border border-gold/30 bg-gold-tint/40 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-gold-darker">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>قوالب جاهزة سريعة (انقر لتعبئة الحقول ببيانات قياسية):</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {STANDARD_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-gold/40 bg-white hover:bg-gold-tint text-[11px] font-bold text-slate-800 transition-colors shadow-2xs"
                  >
                    <span>+ {tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Immediate Publish Notice */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>
              <strong>تحديث مباشر:</strong> الحفظ يطبّق التعديلات في عمود الصفحة الرئيسية فور اعتماده.
            </span>
          </div>

          {/* Server Error Banner */}
          {serverError && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
              <span className="font-semibold">{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Button Label */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-button-label" className="text-sm font-bold text-ink">
                  اسم الزر في الصفحة الرئيسية <span className="text-red-500">*</span>
                </label>
                <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                  {buttonLabel.trim().length} / {MAX_BUTTON_LABEL}
                </span>
              </div>
              <input
                ref={initialInputRef}
                id="speech-button-label"
                type="text"
                value={buttonLabel}
                onChange={(e) => handleFieldChange("buttonLabel", setButtonLabel, e.target.value)}
                disabled={busy}
                placeholder="مثال: كلمة النائب الثاني"
                className={`w-full h-14 rounded-2xl border px-4 text-xs sm:text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 ${
                  errors.buttonLabel
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-border bg-white text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
              />
              {errors.buttonLabel && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.buttonLabel}</span>
                </p>
              )}
            </div>

            {/* Popup Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-title" className="text-sm font-bold text-ink">
                  عنوان النافذة المنبثقة <span className="text-red-500">*</span>
                </label>
                <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                  {title.trim().length} / {MAX_TITLE}
                </span>
              </div>
              <input
                id="speech-title"
                type="text"
                value={title}
                onChange={(e) => handleFieldChange("title", setTitle, e.target.value)}
                disabled={busy}
                placeholder="مثال: كلمة النائب الثاني لرئيس الحزب"
                className={`w-full h-14 rounded-2xl border px-4 text-xs sm:text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 ${
                  errors.title
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-border bg-white text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
              />
              {errors.title && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.title}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Person Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-person-name" className="text-sm font-bold text-ink">
                  اسم المتحدث / الجهة <span className="text-red-500">*</span>
                </label>
                <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                  {personName.trim().length} / {MAX_PERSON_NAME}
                </span>
              </div>
              <input
                id="speech-person-name"
                type="text"
                value={personName}
                onChange={(e) => handleFieldChange("personName", setPersonName, e.target.value)}
                disabled={busy}
                placeholder="مثال: سيف الدين"
                className={`w-full h-14 rounded-2xl border px-4 text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 ${
                  errors.personName
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-border bg-white text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
              />
              {errors.personName && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.personName}</span>
                </p>
              )}
            </div>

            {/* Person Role Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-person-role" className="text-sm font-bold text-ink">
                  الصفة الحزبية للمتحدث <span className="text-red-500">*</span>
                </label>
                <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                  {personRoleTitle.trim().length} / {MAX_ROLE_TITLE}
                </span>
              </div>
              <input
                id="speech-person-role"
                type="text"
                value={personRoleTitle}
                onChange={(e) => handleFieldChange("personRoleTitle", setPersonRoleTitle, e.target.value)}
                disabled={busy}
                placeholder="مثال: النائب الثاني لرئيس الحزب"
                className={`w-full h-14 rounded-2xl border px-4 text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 ${
                  errors.personRoleTitle
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-border bg-white text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
              />
              {errors.personRoleTitle && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.personRoleTitle}</span>
                </p>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="speech-body" className="text-sm font-bold text-ink">
                نص ومحاور الكلمة <span className="text-red-500">*</span>
              </label>
              <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                {body.length} / {MAX_BODY}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              يمكنك كتابة فقرات متعددة بالضغط على زر الإدخال (Enter)؛ تظهر كل فقرة مفصولة في نافذة العرض.
            </p>
            <textarea
              id="speech-body"
              rows={4}
              value={body}
              onChange={(e) => handleFieldChange("body", setBody, e.target.value)}
              disabled={busy}
              placeholder="اكتب نص الكلمة هنا..."
              className={`w-full min-h-32 resize-y rounded-2xl border p-4 text-xs leading-relaxed shadow-none transition-all duration-300 ease-in-out sm:text-sm ${
                errors.body
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-border bg-white text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
              }`}
            />
            {errors.body && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.body}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Note */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-source-note" className="text-sm font-bold text-ink">
                  ملاحظة المصدر (الهامش)
                </label>
                <span dir="ltr" className="inline-block text-[11px] font-medium text-slate-400">
                  {sourceNote.trim().length} / {MAX_SOURCE_NOTE}
                </span>
              </div>
              <input
                id="speech-source-note"
                type="text"
                value={sourceNote}
                onChange={(e) => handleFieldChange("sourceNote", setSourceNote, e.target.value)}
                disabled={busy}
                placeholder="الموقع الرسمي للحزب"
                className="w-full h-14 rounded-2xl border border-border bg-white px-4 text-xs text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-sort-order" className="text-sm font-bold text-ink">
                  ترتيب الظهور بالعمود
                </label>
              </div>
              <input
                id="speech-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => handleFieldChange("sortOrder", setSortOrder, e.target.value)}
                disabled={busy}
                className="w-full h-14 rounded-2xl border border-border bg-white px-4 text-xs text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] sm:text-sm"
              />
              <p className="text-[11px] text-slate-400">الأصغر يظهر أولاً (مثال: 10، 20، 30...).</p>
            </div>
          </div>

          {/* Published Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={busy}
                className="size-4.5 rounded-lg border-slate-300 accent-gold focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
              />
              <span className="text-sm font-bold text-ink">
                نشر هذا الزر وتفعيله للظهور مباشرة في عمود الصفحة الرئيسية
              </span>
            </label>
          </div>
        </form>

        {/* Modal Footer (Pinned at bottom) */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-line bg-white px-5 text-sm font-bold text-muted transition-all hover:border-gold/50 hover:bg-gold-tint/30 hover:text-ink focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="speech-form"
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 text-sm font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Spinner size="sm" />
                <span>جارٍ الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden="true" />
                <span>{isEditing ? "حفظ التعديلات" : "اعتماد وحفظ الزر"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
