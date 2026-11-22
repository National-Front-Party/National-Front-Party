"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import DeleteConfirmModal from "@/components/Admin/Content/DeleteConfirmModal";
import SpeechCardList from "./SpeechCardList";
import SpeechPreviewModal from "./SpeechPreviewModal";
import SpeechFormModal, { STANDARD_TEMPLATES } from "./SpeechFormModal";
import { Plus, AlertCircle, RotateCcw, Sparkles } from "lucide-react";

export default function LeadershipSpeechesManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [speeches, setSpeeches] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [previewSpeech, setPreviewSpeech] = useState(null);
  const [formState, setFormState] = useState({
    isOpen: false,
    speech: null,
    defaultSlug: "",
    defaultButtonLabel: "",
    defaultTitle: "",
    defaultPersonRole: "",
  });
  const [deletingSpeech, setDeletingSpeech] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = hasPermission(user?.role, "content:manage");
  const canDelete = hasPermission(user?.role, "records:delete");

  // Fetch speeches
  useEffect(() => {
    let ignore = false;

    adminFetch("/api/admin/content/leadership/contents?page=1&page_size=50")
      .then((res) => {
        if (!ignore) {
          const items = Array.isArray(res?.items) ? res.items : [];
          setSpeeches(items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err?.message || "فشل تحميل بيانات أزرار القيادة.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const existingSlugs = useMemo(() => speeches.map((s) => s.slug), [speeches]);

  const nextSortOrder = useMemo(() => {
    if (!speeches.length) return 10;
    const maxOrder = Math.max(...speeches.map((s) => s.sort_order ?? 0));
    return maxOrder + 10;
  }, [speeches]);

  // Save speech (Create or Update)
  const handleSaveSpeech = async (formData) => {
    setIsSubmitting(true);
    const isEditing = Boolean(formState.speech?.id);

    try {
      if (isEditing) {
        const id = formState.speech.id;
        const res = await adminFetch(`/api/admin/content/leadership/contents/${id}`, {
          method: "PATCH",
          body: {
            button_label: formData.button_label,
            title: formData.title,
            person_name: formData.person_name,
            person_role_title: formData.person_role_title,
            body: formData.body,
            source_note: formData.source_note ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const updated = res?.content || { ...formState.speech, ...formData };
        setSpeeches((prev) =>
          prev
            .map((s) => (s.id === id ? updated : s))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
        showSuccess(`تم تحديث «${formData.button_label}» بنجاح.`);
      } else {
        const res = await adminFetch("/api/admin/content/leadership/contents", {
          method: "POST",
          body: {
            slug: formData.slug,
            button_label: formData.button_label,
            title: formData.title,
            person_name: formData.person_name,
            person_role_title: formData.person_role_title,
            body: formData.body,
            source_note: formData.source_note ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const created = res?.content;
        if (created) {
          setSpeeches((prev) =>
            [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          );
        }
        showSuccess(`تمت إضافة «${formData.button_label}» بنجاح.`);
      }
      setFormState({ isOpen: false, speech: null });
    } catch (err) {
      showError(err?.message || "تعذر حفظ الزر. يرجى المحاولة مرة أخرى.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Published Status
  const handleToggleStatus = async (speech) => {
    const newStatus = !speech.is_published;
    setIsSubmitting(true);

    try {
      await adminFetch(`/api/admin/content/leadership/contents/${speech.id}/status`, {
        method: "PATCH",
        body: { is_published: newStatus },
      });
      setSpeeches((prev) =>
        prev.map((s) => (s.id === speech.id ? { ...s, is_published: newStatus } : s))
      );
      showSuccess(
        newStatus
          ? `تم تفعيل ونشر «${speech.button_label}» بالصفحة الرئيسية.`
          : `تم إيقاف نشر «${speech.button_label}».`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة النشر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move Order (Up / Down)
  const handleMoveOrder = async (speech, index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= speeches.length) return;

    const targetSpeech = speeches[targetIndex];
    const currentOrder = speech.sort_order ?? (index + 1) * 10;
    const targetOrder = targetSpeech.sort_order ?? (targetIndex + 1) * 10;

    const newOrderCurrent = targetOrder;
    const newOrderTarget = currentOrder === targetOrder
      ? (direction === "up" ? targetOrder + 1 : targetOrder - 1)
      : currentOrder;

    setIsSubmitting(true);
    try {
      await Promise.all([
        adminFetch(`/api/admin/content/leadership/contents/${speech.id}`, {
          method: "PATCH",
          body: { sort_order: newOrderCurrent },
        }),
        adminFetch(`/api/admin/content/leadership/contents/${targetSpeech.id}`, {
          method: "PATCH",
          body: { sort_order: newOrderTarget },
        }),
      ]);

      setSpeeches((prev) => {
        const next = prev.map((s) => {
          if (s.id === speech.id) return { ...s, sort_order: newOrderCurrent };
          if (s.id === targetSpeech.id) return { ...s, sort_order: newOrderTarget };
          return s;
        });
        return next.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });

      showSuccess("تم تحديث ترتيب ظهور الأزرار بنجاح.");
    } catch (err) {
      showError(err?.message || "تعذر تحديث ترتيب الأزرار.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Create Template helper
  const handleQuickCreate = (templateKey) => {
    const tmpl = STANDARD_TEMPLATES.find((t) => t.id === templateKey || t.baseSlug === templateKey);
    let generatedSlug = tmpl?.baseSlug || `speech-${speeches.length + 1}`;
    let counter = 2;
    const slugsSet = new Set(existingSlugs);
    while (slugsSet.has(generatedSlug)) {
      generatedSlug = `${tmpl?.baseSlug || "speech"}-${counter}`;
      counter++;
    }

    setFormState({
      isOpen: true,
      speech: null,
      defaultSlug: generatedSlug,
      defaultButtonLabel: tmpl?.buttonLabel || "",
      defaultTitle: tmpl?.title || "",
      defaultPersonRole: tmpl?.personRole || "",
    });
  };

  // Handle Delete Success
  const handleDeleteSuccess = () => {
    if (deletingSpeech) {
      const deletedId = deletingSpeech.id;
      setSpeeches((prev) => prev.filter((s) => s.id !== deletedId));
      setDeletingSpeech(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center" dir="rtl">
        <AlertCircle className="mx-auto size-8 text-red-600 mb-2" aria-hidden="true" />
        <h3 className="text-sm font-bold text-red-900">تعذر تحميل أزرار القيادة</h3>
        <p className="text-xs text-red-700 mt-1">{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-red-200 text-xs font-bold text-red-800 hover:bg-red-50 transition-colors"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900">
              أزرار عمود الأمانات المركزية والكلمات (الصفحة الرئيسية)
            </h3>
            <span className="inline-flex items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-darker">
              {speeches.length} أزرار مسجلة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            التحكم الديناميكي الكامل في أزرار ونوافذ العمود الثاني بالصفحة الرئيسية: يمكنك إضافة وتعديل وترتيب وحذف الأزرار بحرية.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              setFormState({
                isOpen: true,
                speech: null,
                defaultSlug: `speech-${speeches.length + 1}`,
                defaultButtonLabel: "",
                defaultTitle: "",
                defaultPersonRole: "",
              })
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-4 text-xs font-extrabold text-ink shadow-sm hover:brightness-105 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>إضافة زر جديد</span>
          </button>
        )}
      </div>

      {/* Quick Add Bar */}
      {canManage && speeches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-gold-darker" aria-hidden="true" />
            <span>إضافة سريعة:</span>
          </span>
          {STANDARD_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleQuickCreate(tmpl.id)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-gold-tint hover:border-gold/50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <Plus className="size-3 text-gold-darker" aria-hidden="true" />
              <span>{tmpl.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Dynamic Speeches Cards List */}
      <SpeechCardList
        speeches={speeches}
        onPreview={(sp) => setPreviewSpeech(sp)}
        onEdit={(sp) =>
          setFormState({
            isOpen: true,
            speech: sp,
            defaultSlug: sp.slug,
            defaultButtonLabel: sp.button_label,
            defaultTitle: sp.title,
            defaultPersonRole: sp.person_role_title,
          })
        }
        onDelete={(sp) => setDeletingSpeech(sp)}
        onToggleStatus={handleToggleStatus}
        onMoveUp={(sp, idx) => handleMoveOrder(sp, idx, "up")}
        onMoveDown={(sp, idx) => handleMoveOrder(sp, idx, "down")}
        onQuickCreate={handleQuickCreate}
        canManage={canManage}
        canDelete={canDelete}
        busy={isSubmitting}
      />

      {/* Preview Modal */}
      <SpeechPreviewModal
        isOpen={Boolean(previewSpeech)}
        onClose={() => setPreviewSpeech(null)}
        speech={previewSpeech}
      />

      {/* Form Modal (Add / Edit) */}
      <SpeechFormModal
        key={formState.speech?.id || (formState.isOpen ? "new-speech" : "speech-none")}
        isOpen={formState.isOpen}
        onClose={() => setFormState({ isOpen: false, speech: null })}
        speech={formState.speech}
        existingSlugs={existingSlugs}
        nextSortOrder={nextSortOrder}
        defaultSlug={formState.defaultSlug}
        defaultButtonLabel={formState.defaultButtonLabel}
        defaultTitle={formState.defaultTitle}
        defaultPersonRole={formState.defaultPersonRole}
        onSave={handleSaveSpeech}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingSpeech)}
        onClose={() => setDeletingSpeech(null)}
        endpoint={`/api/admin/content/leadership/contents/${deletingSpeech?.id}`}
        recordName={deletingSpeech?.button_label || deletingSpeech?.title}
        recordType="زر / كلمة القيادة"
        title="تأكيد حذف الزر"
        warningNote="سيتم حذف هذا الزر ومحتواه نهائياً من عمود الصفحة الرئيسية وتوثيق العملية في سجل التدقيق."
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
