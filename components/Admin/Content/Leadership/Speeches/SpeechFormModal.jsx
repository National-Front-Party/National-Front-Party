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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center py-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="speech-form-modal-title"
    >
      <div
        ref={modalCardRef}
        className="relative my-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all overflow-hidden"
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
            className="inline-flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
            aria-label="إغلاق النافذة"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="speech-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-4">
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
                <label htmlFor="speech-button-label" className="text-xs font-bold text-slate-800">
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
                className={`w-full h-11 rounded-2xl border px-4 text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 ${
                  errors.buttonLabel
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
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
                <label htmlFor="speech-title" className="text-xs font-bold text-slate-800">
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
                className={`w-full h-11 rounded-2xl border px-4 text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 ${
                  errors.title
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
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
                <label htmlFor="speech-person-name" className="text-xs font-bold text-slate-800">
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
                className={`w-full h-11 rounded-2xl border px-4 text-sm transition-all focus:outline-hidden focus:ring-2 ${
                  errors.personName
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
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
                <label htmlFor="speech-person-role" className="text-xs font-bold text-slate-800">
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
                className={`w-full h-11 rounded-2xl border px-4 text-sm transition-all focus:outline-hidden focus:ring-2 ${
                  errors.personRoleTitle
                    ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
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
              <label htmlFor="speech-body" className="text-xs font-bold text-slate-800">
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
              className={`w-full rounded-2xl border p-4 text-sm leading-relaxed transition-all focus:outline-hidden focus:ring-2 ${
                errors.body
                  ? "border-red-400 bg-red-50/20 text-slate-900 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-gold/20"
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
                <label htmlFor="speech-source-note" className="text-xs font-bold text-slate-800">
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
                className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20 focus:outline-hidden"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="speech-sort-order" className="text-xs font-bold text-slate-800">
                  ترتيب الظهور بالعمود
                </label>
              </div>
              <input
                id="speech-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => handleFieldChange("sortOrder", setSortOrder, e.target.value)}
                disabled={busy}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20 focus:outline-hidden"
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
                className="size-4.5 rounded-lg border-slate-300 text-gold-darker focus:ring-gold"
              />
              <span className="text-xs font-bold text-slate-800">
                نشر هذا الزر وتفعيله للظهور مباشرة في عمود الصفحة الرئيسية
              </span>
            </label>
          </div>
        </form>

        {/* Modal Footer (Pinned at bottom) */}
        <div className="flex items-center justify-end gap-3 p-4 sm:px-8 border-t border-slate-100 shrink-0 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 px-5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="speech-form"
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gold-gradient px-6 text-sm font-bold text-ink shadow-md hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
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
