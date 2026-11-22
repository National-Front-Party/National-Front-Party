"use client";

import { useEffect, useState, useMemo } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import EmptyState from "@/components/Admin/ui/EmptyState";
import DeleteConfirmModal from "@/components/Admin/Content/DeleteConfirmModal";
import ParliamentaryItemFormModal from "./ParliamentaryItemFormModal";
import ParliamentaryPreviewModal from "./ParliamentaryPreviewModal";
import {
  Landmark,
  Church,
  House,
  Plus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  User,
  Quote,
} from "lucide-react";

const ICON_MAP = {
  landmark: Landmark,
  church: Church,
  house: House,
};

export default function ParliamentaryUnitManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [formModal, setFormModal] = useState({ isOpen: false, item: null });
  const [previewItem, setPreviewItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = hasPermission(user?.role, "content:manage");
  const canDelete = hasPermission(user?.role, "records:delete");

  // Fetch items
  useEffect(() => {
    let ignore = false;

    adminFetch("/api/admin/content/parliamentary-unit?page=1&page_size=100")
      .then((res) => {
        if (!ignore) {
          const raw = Array.isArray(res?.items) ? res.items : [];
          const sorted = [...raw].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
          );
          setItems(sorted);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err?.message || "فشل تحميل عناصر الوحدة البرلمانية.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Next available sort order
  const nextSortOrder = useMemo(() => {
    if (!items.length) return 1;
    const maxOrder = Math.max(...items.map((it) => it.sort_order ?? 0));
    return maxOrder + 1;
  }, [items]);

  // Quick toggle status
  const handleToggleStatus = async (item) => {
    if (!canManage || busyId === item.id) return;

    setBusyId(item.id);
    const newStatus = !item.is_published;

    try {
      const res = await adminFetch(
        `/api/admin/content/parliamentary-unit/${item.id}/status`,
        {
          method: "PATCH",
          body: { is_published: newStatus },
        }
      );

      const updated = res?.item || { ...item, is_published: newStatus };
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, ...updated } : it))
      );

      showSuccess(
        newStatus
          ? `تم تفعيل ونشر «${item.title}» بالصفحة الرئيسية`
          : `تم تعطيل وإخفاء «${item.title}» من الصفحة الرئيسية`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة نشر العنصر البرلماني.");
    } finally {
      setBusyId(null);
    }
  };

  // Save (Create or Update)
  const handleSave = async (payload, id) => {
    setIsSubmitting(true);
    try {
      if (id) {
        const res = await adminFetch(
          `/api/admin/content/parliamentary-unit/${id}`,
          {
            method: "PATCH",
            body: payload,
          }
        );
        const updated = res?.item || { ...payload, id };
        setItems((prev) => {
          const list = prev.map((it) => (it.id === id ? { ...it, ...updated } : it));
          return list.sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
          );
        });
        showSuccess("تم حفظ تعديلات العنصر البرلماني بنجاح.");
      } else {
        const res = await adminFetch("/api/admin/content/parliamentary-unit", {
          method: "POST",
          body: payload,
        });
        const created = res?.item;
        setItems((prev) => {
          const list = created ? [...prev, created] : prev;
          return list.sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
          );
        });
        showSuccess("تمت إضافة العنصر البرلماني بنجاح.");
      }

      setFormModal({ isOpen: false, item: null });
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete success handler
  const handleDeleteSuccess = () => {
    if (!deletingItem) return;
    setItems((prev) => prev.filter((it) => it.id !== deletingItem.id));
    showSuccess(`تم حذف «${deletingItem.title}» نهائياً بنجاح.`);
    setDeletingItem(null);
  };

  const publishedCount = items.filter((it) => it.is_published).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 text-gold-dark shadow-2xs">
            <Landmark className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-ink">
                عناصر الوحدة البرلمانية (الصفحة الرئيسية)
              </h3>
              <span className="inline-flex items-center rounded-full border border-line bg-page px-2.5 py-0.5 text-xs font-bold text-muted">
                {items.length} عناصر
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              إدارة بطاقات العمود الرابع والنوافذ المنبثقة التابعة لمجالس الشيوخ والنواب والمجالس المحلية ({publishedCount} مفعلة بالموقع)
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setFormModal({ isOpen: true, item: null })}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>إضافة عنصر برلماني جديد</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 md:gap-5">
          {[1, 2, 3].map((idx) => (
            <Skeleton key={idx} className="h-64 rounded-3xl w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-card sm:p-8">
          <AlertCircle className="size-10 text-rose-500" aria-hidden="true" />
          <h4 className="text-sm font-bold text-slate-900">فشل تحميل البيانات</h4>
          <p className="text-xs text-slate-500 max-w-md">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              setRefreshKey((k) => k + 1);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-4 text-xs font-bold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={() => <Landmark className="size-10 text-slate-400" />}
          title="لا توجد عناصر برلمانية مسجلة حالياً"
          description="يمكنك البدء بإضافة الهيئة البرلمانية بمجلس الشيوخ أو النواب أو المجالس المحلية."
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => setFormModal({ isOpen: true, item: null })}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 text-xs font-extrabold text-ink shadow-btn transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_18px_rgba(201,162,74,0.28)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>إضافة أول عنصر</span>
              </button>
            ) : null
          }
        />
      )}

      {/* Items Grid */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 md:gap-5">
          {items.map((item, index) => {
            const IconComponent = ICON_MAP[item.icon] ?? Landmark;
            const isBusy = busyId === item.id;

            return (
              <div
                key={`parl-card-${item.id}`}
                className="group relative flex min-w-0 flex-col justify-between rounded-3xl border border-line bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-card-hover sm:p-5"
              >
                <div className="space-y-4">
                  {/* Top Bar: Order & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-gold-light">
                        {index + 1}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">
                        الترتيب #{item.sort_order ?? index + 1}
                      </span>
                    </div>

                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={isBusy}
                        className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 ${
                          item.is_published
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                        title={item.is_published ? "انقر لإخفاء العنصر من الموقع" : "انقر لتفعيل ونشر العنصر"}
                      >
                        {item.is_published ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                            <span>منشور ومفعل</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="size-3 text-slate-400" aria-hidden="true" />
                            <span>معطل ومخفي</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.is_published
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {item.is_published ? "منشور" : "معطل"}
                      </span>
                    )}
                  </div>

                  {/* Item Presentation */}
                  <div className="flex items-start gap-3.5 pt-1">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-white text-gold-dark shadow-2xs group-hover:border-gold group-hover:bg-gold-gradient group-hover:text-white transition-all">
                      <IconComponent className="size-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="break-words text-base font-black text-ink transition-colors group-hover:text-gold-dark">
                        {item.title}
                      </h4>
                      <p className="mt-0.5 break-words text-xs font-medium text-muted">
                        {item.subtitle || "الهيئة البرلمانية"}
                      </p>
                    </div>
                  </div>

                  {/* Popup Data Summary Preview Box */}
                  <div className="space-y-2 rounded-2xl border border-line bg-page/50 p-3.5 text-xs">
                    <div className="flex min-w-0 flex-wrap items-start gap-1.5 font-bold text-slate-700">
                      <User className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="break-words">
                        {item.head_name || "لم يُحدد مسؤول بعد"}
                      </span>
                      {item.head_role && (
                        <span className="break-words text-[11px] font-normal text-slate-400">
                          ({item.head_role})
                        </span>
                      )}
                    </div>

                    {item.body ? (
                      <div className="flex items-start gap-1.5 text-slate-600 text-[11px] leading-relaxed">
                        <Quote className="size-3 text-gold-dark/60 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="min-w-0 break-words line-clamp-3">
                          {item.body.replace(/\r?\n+/g, " ")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        لا يوجد نص مدخل للنافذة المنبثقة
                      </p>
                    )}

                    {item.source_note && (
                      <div className="break-words border-t border-line pt-1.5 text-[10px] text-muted">
                        المصدر: {item.source_note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold-tint/35 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 sm:w-auto"
                    title="معاينة النافذة المنبثقة كما تظهر للزائر"
                  >
                    <Eye className="size-3.5 text-slate-500" aria-hidden="true" />
                    <span>معاينة النافذة</span>
                  </button>

                  <div className="flex w-full items-center gap-1.5 sm:w-auto">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setFormModal({ isOpen: true, item })}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-gold hover:bg-gold-tint/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 sm:flex-none"
                      >
                        <Edit3 className="size-3.5 text-slate-500" aria-hidden="true" />
                        <span>تعديل</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition-all hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-rose-500 focus-visible:outline-offset-2"
                        title="حذف هذا العنصر"
                        aria-label={`حذف ${item.title}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal (Add/Edit) */}
      {formModal.isOpen && (
        <ParliamentaryItemFormModal
          key={
            formModal.item?.id
              ? `edit-${formModal.item.id}`
              : `new-item-${nextSortOrder}`
          }
          isOpen={formModal.isOpen}
          onClose={() => setFormModal({ isOpen: false, item: null })}
          item={formModal.item}
          nextSortOrder={nextSortOrder}
          onSave={handleSave}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Preview Modal from Card */}
      {previewItem && (
        <ParliamentaryPreviewModal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          item={previewItem}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingItem)}
          onClose={() => setDeletingItem(null)}
          endpoint={`/api/admin/content/parliamentary-unit/${deletingItem.id}`}
          recordName={deletingItem.title}
          recordType="العنصر البرلماني"
          title="تأكيد حذف العنصر البرلماني"
          warningNote="سيتم حذف هذا العنصر والنافذة المنبثقة التابعة له نهائياً من الموقع العام وسجل البيانات."
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
