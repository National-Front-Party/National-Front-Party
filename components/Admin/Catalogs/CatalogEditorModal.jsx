"use client";

import { useState, useEffect, useRef } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import { Building2, Layers, Hash, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/**
 * Normalizes input string into a valid slug / code:
 * lowercase a-z, 0-9, single hyphens only.
 */
function normalizeIdentifier(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function CatalogForm({ item, type, onClose, onSaved }) {
  const { showSuccess, showError } = useToast();
  const isEdit = Boolean(item?.id);
  const isMinistry = type === "ministries";

  const entityTitle = isMinistry ? "الوزارة الحكومية" : "القطاع الخدمي";
  const endpointBase = isMinistry ? "/api/admin/ministries" : "/api/admin/request-sectors";

  const initialKey = isMinistry ? item?.slug || "" : item?.code || "";

  const [nameAr, setNameAr] = useState(item?.name_ar || "");
  const [identifier, setIdentifier] = useState(initialKey);
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [manualKeyEdit, setManualKeyEdit] = useState(Boolean(item?.id));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const nameInputRef = useRef(null);
  const keyInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitting, onClose]);

  // Auto-generate identifier (slug/code) when creating unless manually edited
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setNameAr(newName);
    if (errors.nameAr) {
      setErrors((prev) => ({ ...prev, nameAr: undefined }));
    }
    if (!isEdit && !manualKeyEdit) {
      const generated = normalizeIdentifier(newName);
      if (generated) {
        setIdentifier(generated);
        if (errors.identifier) {
          setErrors((prev) => ({ ...prev, identifier: undefined }));
        }
      }
    }
  };

  const handleIdentifierChange = (e) => {
    setManualKeyEdit(true);
    setIdentifier(normalizeIdentifier(e.target.value));
    if (errors.identifier) {
      setErrors((prev) => ({ ...prev, identifier: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = nameAr.trim();
    const trimmedKey = normalizeIdentifier(identifier);
    const parsedSort = Number(sortOrder);
    const validSortOrder = Number.isInteger(parsedSort)
      ? Math.max(-32768, Math.min(32767, parsedSort))
      : 0;

    const newErrors = {};

    if (!trimmedName) {
      newErrors.nameAr = `اسم ${entityTitle} بالعربية مطلوب ولا يمكن تركه فارغاً`;
    } else if (trimmedName.length < 2) {
      newErrors.nameAr = `اسم ${entityTitle} يجب ألا يقل عن حرفين`;
    }

    if (!trimmedKey) {
      newErrors.identifier = isMinistry
        ? "المعرف اللطيف (Slug) مطلوب ويجب ألا يكون فارغاً"
        : "كود القطاع (Code) مطلوب ويجب ألا يكون فارغاً";
    } else {
      const keyRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!keyRegex.test(trimmedKey)) {
        newErrors.identifier = isMinistry
          ? "يجب أن يتكون المعرف من أحرف إنجليزية صغيرة وأرقام مفصولة بشرطة (مثل health-ministry)"
          : "يجب أن يتكون كود القطاع من أحرف إنجليزية صغيرة وأرقام مفصولة بشرطة (مثل public-housing)";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showError("يرجى ملء الحقول المطلوبة ومراجعة التنبيهات الموضحة");
      if (newErrors.nameAr) {
        nameInputRef.current?.focus();
      } else if (newErrors.identifier) {
        keyInputRef.current?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name_ar: trimmedName,
        sort_order: validSortOrder,
      };

      if (isMinistry) {
        payload.slug = trimmedKey;
      } else {
        payload.code = trimmedKey;
      }

      let result;
      if (isEdit) {
        result = await adminFetch(`${endpointBase}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        // Update status if changed
        if (Boolean(isActive) !== Boolean(item.is_active)) {
          const statusResult = await adminFetch(`${endpointBase}/${item.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: Boolean(isActive) }),
          });
          result = statusResult;
        }
      } else {
        result = await adminFetch(endpointBase, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        // Set status to inactive if user toggled inactive on creation
        const createdId = result?.ministry?.id || result?.request_sector?.id;
        if (createdId && !isActive) {
          const statusResult = await adminFetch(`${endpointBase}/${createdId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: false }),
          });
          result = statusResult;
        }
      }

      const savedRecord = isMinistry ? result?.ministry : result?.request_sector;

      showSuccess(
        isEdit
          ? `تم تحديث بيانات ${entityTitle} بنجاح`
          : `تمت إضافة ${entityTitle} بنجاح إلى الكتالوج`,
      );

      if (onSaved) {
        onSaved(savedRecord || payload, isEdit);
      }
      onClose();
    } catch (err) {
      if (err.code === "DUPLICATE_SLUG") {
        setErrors((prev) => ({
          ...prev,
          identifier: "المعرّف اللطيف مستخدم بالفعل، برجاء اختيار معرّف آخر.",
        }));
        keyInputRef.current?.focus();
        showError("المعرّف المختصر مستخدم بالفعل، برجاء اختيار معرّف آخر.");
      } else if (err.code === "DUPLICATE_CODE") {
        setErrors((prev) => ({
          ...prev,
          identifier: "كود القطاع مستخدم بالفعل، برجاء إدخال كود مختلف.",
        }));
        keyInputRef.current?.focus();
        showError("كود القطاع مستخدم بالفعل، برجاء إدخال كود مختلف.");
      } else if (err.code === "VALIDATION") {
        showError("يرجى التأكد من صحة البيانات المدخلة ومطابقتها للشروط.");
      } else {
        showError(err.message || `حدث خطأ أثناء حفظ ${entityTitle}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-modal-overlay-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
      dir="rtl"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-card-hover border border-line animate-modal-shell-enter">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs">
              {isMinistry ? (
                <Building2 className="size-5" />
              ) : (
                <Layers className="size-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink">
                {isEdit ? `تعديل ${entityTitle}` : `إضافة ${entityTitle} جديدة`}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {isMinistry
                  ? "إدارة الوزارات والجهات الحكومية المعتمدة لطلبات الخدمات"
                  : "إدارة القطاعات والملفات الخدمية المعتمدة لطلبات المواطنين"}
              </p>
            </div>
          </div>
          {/* Golden Rotating Close Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50 cursor-pointer"
            title="إغلاق"
          >
            <svg
              className="size-5 transition-transform duration-300 group-hover:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {/* 1. Arabic Name */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-ink mb-2">
              اسم {entityTitle} بالعربية <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                value={nameAr}
                onChange={handleNameChange}
                placeholder={
                  isMinistry
                    ? "مثال: وزارة الصحة والسكان، وزارة الإسكان والمرافق..."
                    : "مثال: العلاج على نفقة الدولة، طلبات الإسكان، التضامن..."
                }
                disabled={submitting}
                className={`h-14 w-full rounded-2xl border px-4 text-right text-xs sm:text-sm font-medium text-ink shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-50 ${
                  errors.nameAr
                    ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(244,63,94,0.35)]"
                    : "border-border bg-white hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
                maxLength={200}
              />
            </div>
            {errors.nameAr && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-elem-fade-up">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errors.nameAr}</span>
              </p>
            )}
          </div>

          {/* 2. Identifier: Slug (Ministry) or Code (Sector) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-ink">
                {isMinistry ? "المعرف اللطيف (Slug)" : "كود القطاع (Code)"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted">
                أحرف إنجليزية وأرقام وشرطة فقط
              </span>
            </div>
            <div className="relative">
              <input
                ref={keyInputRef}
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder={isMinistry ? "health, housing, education" : "treatment, housing, solidarity"}
                disabled={submitting}
                className={`h-14 w-full rounded-2xl border px-4 pl-10 text-left font-mono text-xs sm:text-sm font-semibold text-ink shadow-none transition-all duration-300 ease-in-out placeholder:text-muted/60 disabled:opacity-50 ${
                  errors.identifier
                    ? "border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(244,63,94,0.35)]"
                    : "border-border bg-white hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
                }`}
                style={{ direction: "ltr", textAlign: "left" }}
                maxLength={100}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
                <Hash className="size-4" />
              </span>
            </div>
            {errors.identifier ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-elem-fade-up">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{errors.identifier}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted/80 mt-1.5 mr-1">
                يُستخدم في الروابط والفرز المرجعي للطلبات ({isMinistry ? "Slug" : "Code"}).
              </p>
            )}
          </div>

          {/* 3. Display Order (sort_order) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-ink">
                ترتيب العرض (Sort Order)
              </label>
              <span className="text-[11px] text-muted">الرقم الأصغر يظهر أولاً</span>
            </div>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={submitting}
              className="h-14 w-full rounded-2xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-ink shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60 disabled:opacity-50"
              min={-32768}
              max={32767}
            />
          </div>

          {/* 4. Active Status Toggle */}
          <div className="pt-2">
            <label className="block text-xs sm:text-sm font-bold text-ink mb-2">
              حالة الاعتماد في النظام
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl p-3.5 border text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-95 ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-2xs font-black"
                    : "border-border bg-white text-muted hover:border-gold/40 hover:text-ink hover:bg-gold-tint/20"
                }`}
              >
                <CheckCircle2
                  className={`size-4 ${isActive ? "text-emerald-600" : "text-muted"}`}
                />
                <span>معتمد ونشط</span>
              </button>

              <button
                type="button"
                onClick={() => setIsActive(false)}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl p-3.5 border text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-95 ${
                  !isActive
                    ? "border-rose-400 bg-rose-50/70 text-rose-800 shadow-2xs font-black"
                    : "border-border bg-white text-muted hover:border-gold/40 hover:text-ink hover:bg-gold-tint/20"
                }`}
              >
                <XCircle
                  className={`size-4 ${!isActive ? "text-rose-600" : "text-muted"}`}
                />
                <span>معطل مؤقتاً</span>
              </button>
            </div>
            <p className="text-[11px] text-muted/70 mt-1.5 mr-1">
              العناصر المعطلة لن تظهر للمواطنين في نماذج التقديم العامة.
            </p>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-12 px-6 rounded-2xl border border-line bg-page text-xs font-bold text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gold-gradient px-7 text-xs font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Spinner size="sm" color="ink" />}
              <span>{isEdit ? "حفظ التعديلات" : `إضافة ${entityTitle}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CatalogEditorModal({ isOpen, onClose, item, type, onSaved }) {
  if (!isOpen) return null;

  return (
    <CatalogForm
      item={item}
      type={type}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
