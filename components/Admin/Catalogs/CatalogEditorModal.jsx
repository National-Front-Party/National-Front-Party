"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import Spinner from "@/components/Admin/ui/Spinner";
import { Building2, Layers, Hash, CheckCircle2, XCircle } from "lucide-react";

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
    if (!isEdit && !manualKeyEdit) {
      const generated = normalizeIdentifier(newName);
      if (generated) {
        setIdentifier(generated);
      }
    }
  };

  const handleIdentifierChange = (e) => {
    setManualKeyEdit(true);
    setIdentifier(normalizeIdentifier(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = nameAr.trim();
    const trimmedKey = normalizeIdentifier(identifier);
    const parsedSort = Number(sortOrder);
    const validSortOrder = Number.isInteger(parsedSort)
      ? Math.max(-32768, Math.min(32767, parsedSort))
      : 0;

    if (!trimmedName) {
      showError(`اسم ${entityTitle} باللغة العربية مطلوب`);
      return;
    }

    if (!trimmedKey) {
      showError(
        isMinistry
          ? "المعرف اللطيف (Slug) مطلوب ويجب أن يتكون من أحرف إنجليزية وأرقام"
          : "كود القطاع (Code) مطلوب ويجب أن يتكون من أحرف إنجليزية وأرقام",
      );
      return;
    }

    const keyRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!keyRegex.test(trimmedKey)) {
      showError(
        isMinistry
          ? "صيغة المعرف اللطيف (Slug) غير صحيحة. يجب أن يتكون من أحرف إنجليزية صغيرة وأرقام وشرطة واحدة بين الكلمات"
          : "صيغة كود القطاع (Code) غير صحيحة. يجب أن يتكون من أحرف إنجليزية صغيرة وأرقام وشرطة واحدة بين الكلمات",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name_ar: trimmedName,
        sort_order: validSortOrder,
        is_active: Boolean(isActive),
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
      } else {
        result = await adminFetch(endpointBase, {
          method: "POST",
          body: JSON.stringify(payload),
        });
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
        showError("المعرّف المختصر مستخدم بالفعل، برجاء اختيار معرّف آخر.");
      } else if (err.code === "DUPLICATE_CODE") {
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
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex size-9 items-center justify-center rounded-xl border border-line bg-page/60 text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/40 transition-colors disabled:opacity-50 cursor-pointer"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* 1. Arabic Name */}
          <div>
            <label className="block text-xs font-bold text-ink mb-2">
              اسم {entityTitle} بالعربية <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nameAr}
                onChange={handleNameChange}
                placeholder={
                  isMinistry
                    ? "مثال: وزارة الصحة والسكان، وزارة الإسكان والمرافق..."
                    : "مثال: العلاج على نفقة الدولة، طلبات الإسكان، التضامن..."
                }
                disabled={submitting}
                className="w-full h-14 rounded-2xl border border-line bg-page/40 px-4 text-sm font-bold text-ink placeholder:text-muted/60 transition-all focus:border-gold focus:bg-white focus:outline-none focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:opacity-60"
                maxLength={200}
                required
              />
            </div>
          </div>

          {/* 2. Identifier: Slug (Ministry) or Code (Sector) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink">
                {isMinistry ? "المعرف اللطيف (Slug)" : "كود القطاع (Code)"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted">
                أحرف إنجليزية وأرقام وشرطة فقط
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder={isMinistry ? "health, housing, education" : "treatment, housing, solidarity"}
                disabled={submitting}
                className="w-full h-14 rounded-2xl border border-line bg-page/40 px-4 pl-10 text-sm font-mono font-bold text-ink placeholder:text-muted/60 transition-all focus:border-gold focus:bg-white focus:outline-none focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:opacity-60 ltr"
                style={{ direction: "ltr", textAlign: "left" }}
                maxLength={100}
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
                <Hash className="size-4" />
              </span>
            </div>
            <p className="text-[11px] text-muted/80 mt-1.5 mr-1">
              يُستخدم في الروابط والفرز المرجعي للطلبات ({isMinistry ? "Slug" : "Code"}).
            </p>
          </div>

          {/* 3. Display Order (sort_order) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink">
                ترتيب العرض (Sort Order)
              </label>
              <span className="text-[11px] text-muted">الرقم الأصغر يظهر أولاً</span>
            </div>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={submitting}
              className="w-full h-14 rounded-2xl border border-line bg-page/40 px-4 text-sm font-bold text-ink placeholder:text-muted/60 transition-all focus:border-gold focus:bg-white focus:outline-none focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:opacity-60"
              min={-32768}
              max={32767}
            />
          </div>

          {/* 4. Active Status Toggle */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-ink mb-2">
              حالة الاعتماد في النظام
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-2xs font-black"
                    : "border-line bg-page/50 text-muted hover:border-emerald-200"
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
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl p-3 border text-xs font-bold transition-all cursor-pointer ${
                  !isActive
                    ? "border-rose-400 bg-rose-50/70 text-rose-800 shadow-2xs font-black"
                    : "border-line bg-page/50 text-muted hover:border-rose-200"
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
              className="rounded-2xl border border-line bg-white px-5 py-3 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-colors disabled:opacity-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-6 py-3 text-xs font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
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
