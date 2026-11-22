"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import EmptyState from "@/components/Admin/ui/EmptyState";
import DeleteConfirmModal from "@/components/Admin/Content/DeleteConfirmModal";
import PopupCardList from "./PopupCardList";
import PopupFormModal from "./PopupFormModal";
import PopupPreviewModal from "./PopupPreviewModal";
import PopupStatusModal from "./PopupStatusModal";
import {
  Layers,
  Plus,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

export default function HomepagePopupsManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [formModalState, setFormModalState] = useState({
    isOpen: false,
    popup: null, // null for create, object for edit
  });

  const [previewPopup, setPreviewPopup] = useState(null);
  const [statusModalPopup, setStatusModalPopup] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const canManage = hasPermission(user?.role, "content:manage");
  const canDelete = hasPermission(user?.role, "records:delete");

  // Fetch popups list (GET /api/admin/content/popups)
  useEffect(() => {
    let mounted = true;

    adminFetch("/api/admin/content/popups?page=1&page_size=100")
      .then((res) => {
        if (mounted) {
          setItems(res?.items || []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message || "فشل تحميل محتوى الصفحة الرئيسية من الخادم.");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  // Next available sort order
  const nextSortOrder = useMemo(() => {
    if (!items.length) return 1;
    const maxOrder = Math.max(...items.map((it) => it.sort_order ?? 0));
    return maxOrder + 1;
  }, [items]);

  // Counts
  const publishedCount = useMemo(
    () => items.filter((it) => it.is_published).length,
    [items],
  );

  // Handle Form Submit: Create or Update
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    const isEditing = Boolean(formModalState.popup);

    try {
      if (isEditing) {
        // PATCH /api/admin/content/popups/[id]
        const id = formModalState.popup.id;
        await adminFetch(`/api/admin/content/popups/${id}`, {
          method: "PATCH",
          body: formData,
        });
        showSuccess(`تم تحديث بيانات «${formData.title}» بنجاح.`);
      } else {
        // POST /api/admin/content/popups
        await adminFetch("/api/admin/content/popups", {
          method: "POST",
          body: formData,
        });
        showSuccess(`تمت إضافة العنصر الجديد «${formData.title}» بنجاح.`);
      }

      setFormModalState({ isOpen: false, popup: null });
      reload();
      return true;
    } catch (err) {
      if (err?.code === "CONFLICT" || err?.status === 409 || err?.message?.includes("Unique constraint")) {
        showError("المعرف المختصر (Slug) مستخدم بالفعل، يرجى كتابة معرف مختلف.");
      } else {
        showError(err?.message || "تعذر حفظ بيانات العنصر، يرجى المحاولة مرة أخرى.");
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Unpublish For Edit Action
  const handleUnpublishForEdit = async (popup) => {
    if (!popup || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/content/popups/${popup.id}/status`, {
        method: "PATCH",
        body: { is_published: false },
      });
      showSuccess(`تم إيقاف نشر «${popup.title}». يمكنك الآن تعديل محتواه بأمان.`);
      // Update form popup state to the updated unpublished record
      setFormModalState({
        isOpen: true,
        popup: res?.popup || { ...popup, is_published: false },
      });
      reload();
    } catch (err) {
      showError(err?.message || "فشل إيقاف نشر العنصر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Status Toggle Confirm (Publish / Unpublish)
  const handleStatusConfirm = async () => {
    if (!statusModalPopup || isSubmitting) return;
    const targetStatus = !statusModalPopup.is_published;
    setIsSubmitting(true);

    try {
      await adminFetch(`/api/admin/content/popups/${statusModalPopup.id}/status`, {
        method: "PATCH",
        body: { is_published: targetStatus },
      });

      showSuccess(
        targetStatus
          ? `تم نشر «${statusModalPopup.title}» على الصفحة الرئيسية للجمهور بنجاح!`
          : `تم إيقاف نشر «${statusModalPopup.title}» بنجاح.`,
      );

      setStatusModalPopup(null);
      reload();
    } catch (err) {
      showError(err?.message || "فشل تحديث حالة نشر العنصر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Order Move (Up or Down)
  const handleMoveOrder = async (item, direction) => {
    if (!item || isSubmitting || !canManage) return;

    const currentIndex = items.findIndex((it) => it.id === item.id);
    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const adjacentItem = items[targetIndex];
    const currentOrder = item.sort_order ?? currentIndex + 1;
    const adjacentOrder = adjacentItem.sort_order ?? targetIndex + 1;

    // Swap sort orders
    const newOrder = adjacentOrder === currentOrder
      ? currentOrder + direction
      : adjacentOrder;

    setIsSubmitting(true);
    try {
      await adminFetch(`/api/admin/content/popups/${item.id}`, {
        method: "PATCH",
        body: { sort_order: newOrder },
      });
      reload();
    } catch (err) {
      showError(err?.message || "فشل تحديث ترتيب العنصر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Clean, Professional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-ink text-gold shadow-2xs">
              <Layers className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                محتوى الصفحة الرئيسية
              </h3>
              <p className="text-xs text-muted">
                إدارة بطاقات ونوافذ العمود الأول (من نحن، هدفنا، رؤيتنا، رسالتنا، لماذا نحن)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Counters */}
        <div className="flex items-center gap-2.5">
          {/* Quick Counter */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
            <span className="size-2 rounded-full bg-emerald-500" />
            {publishedCount} منشورة من {items.length}
          </span>

          <button
            type="button"
            onClick={reload}
            disabled={loading || isSubmitting}
            title="تحديث البيانات"
            aria-label="تحديث البيانات"
            className="flex size-9 items-center justify-center rounded-xl border border-line bg-white text-muted hover:border-gold hover:text-ink hover:bg-gold-tint/40 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setFormModalState({ isOpen: true, popup: null })}
              disabled={loading || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="size-4" />
              إضافة عنصر
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50/70 p-8 text-center space-y-4">
          <div className="flex justify-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="size-6" />
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-red-900">تعذر تحميل المحتوى</h4>
            <p className="text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={() => <Layers className="size-10 text-slate-400" />}
          title="لا توجد عناصر مسجلة حالياً"
          description="لم يتم العثور على أي عناصر مسجلة لمحتوى الصفحة الرئيسية. يمكنك البدء بإضافة أول عنصر."
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => setFormModalState({ isOpen: true, popup: null })}
                className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-4 py-2.5 text-xs font-bold text-ink shadow-btn hover:brightness-105 active:scale-95 transition-all"
              >
                <Plus className="size-4" />
                إضافة أول عنصر
              </button>
            ) : null
          }
        />
      )}

      {/* Popups Cards List */}
      {!loading && !error && items.length > 0 && (
        <PopupCardList
          items={items}
          onPreview={(item) => setPreviewPopup(item)}
          onEdit={(item) => setFormModalState({ isOpen: true, popup: item })}
          onToggleStatus={(item) => setStatusModalPopup(item)}
          onDelete={(item) => setDeletingItem(item)}
          onMoveOrder={handleMoveOrder}
          canManage={canManage}
          canDelete={canDelete}
          isBusy={isSubmitting}
        />
      )}

      {/* Create / Edit Form Modal */}
      {formModalState.isOpen && (
        <PopupFormModal
          key={
            formModalState.popup?.id
              ? `edit-${formModalState.popup.id}-${formModalState.popup.is_published}`
              : "create"
          }
          isOpen={formModalState.isOpen}
          popup={formModalState.popup}
          onClose={() => setFormModalState({ isOpen: false, popup: null })}
          onSubmit={handleFormSubmit}
          onUnpublishForEdit={handleUnpublishForEdit}
          onOpenPreview={(previewData) => setPreviewPopup(previewData)}
          isSubmitting={isSubmitting}
          canManage={canManage}
          nextSortOrder={nextSortOrder}
        />
      )}

      {/* Preview Modal (Mimics Homepage InfoModal) */}
      <PopupPreviewModal
        isOpen={Boolean(previewPopup)}
        onClose={() => setPreviewPopup(null)}
        popup={previewPopup}
      />

      {/* Publish / Unpublish Status Modal */}
      <PopupStatusModal
        isOpen={Boolean(statusModalPopup)}
        onClose={() => setStatusModalPopup(null)}
        onConfirm={handleStatusConfirm}
        popup={statusModalPopup}
        submitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        endpoint={`/api/admin/content/popups/${deletingItem?.id}`}
        recordName={deletingItem?.title}
        recordType="عنصر الصفحة الرئيسية"
        title="تأكيد حذف العنصر نهائياً"
        warningNote="سيتم حذف هذا العنصر نهائياً من قاعدة البيانات. إذا كان هذا العنصر منشوراً، فسيختفي فوراً من الصفحة الرئيسية."
        onSuccess={() => {
          reload();
          setDeletingItem(null);
        }}
      />
    </div>
  );
}
