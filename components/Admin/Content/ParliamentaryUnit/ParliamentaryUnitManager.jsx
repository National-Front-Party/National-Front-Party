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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark border border-gold/30 shadow-2xs">
            <Landmark className="size-6" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                عناصر الوحدة البرلمانية (الصفحة الرئيسية)
              </h3>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {items.length} عناصر
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة بطاقات العمود الرابع والنوافذ المنبثقة التابعة لمجالس الشيوخ والنواب والمجالس المحلية ({publishedCount} مفعلة بالموقع)
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setFormModal({ isOpen: true, item: null })}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gold hover:bg-gold-dark text-ink text-xs font-black transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>إضافة عنصر برلماني جديد</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((idx) => (
            <Skeleton key={idx} className="h-64 rounded-3xl w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-white border border-rose-200 text-center shadow-xs">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gold hover:bg-gold-dark text-ink text-xs font-black transition-all shadow-xs cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, index) => {
            const IconComponent = ICON_MAP[item.icon] ?? Landmark;
            const isBusy = busyId === item.id;

            return (
              <div
                key={`parl-card-${item.id}`}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-gold/60 hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Top Bar: Order & Status */}
                  <div className="flex items-center justify-between gap-2">
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
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
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
                      <h4 className="text-base font-black text-slate-900 group-hover:text-gold-dark transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {item.subtitle || "الهيئة البرلمانية"}
                      </p>
                    </div>
                  </div>

                  {/* Popup Data Summary Preview Box */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <User className="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {item.head_name || "لم يُحدد مسؤول بعد"}
                      </span>
                      {item.head_role && (
                        <span className="text-[11px] text-slate-400 font-normal truncate">
                          ({item.head_role})
                        </span>
                      )}
                    </div>

                    {item.body ? (
                      <div className="flex items-start gap-1.5 text-slate-600 text-[11px] leading-relaxed">
                        <Quote className="size-3 text-gold-dark/60 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="line-clamp-2">
                          {item.body.replace(/\r?\n+/g, " ")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        لا يوجد نص مدخل للنافذة المنبثقة
                      </p>
                    )}

                    {item.source_note && (
                      <div className="text-[10px] text-slate-400 border-t border-slate-200/50 pt-1.5 truncate">
                        المصدر: {item.source_note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-gold-tint hover:border-gold/40 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    title="معاينة النافذة المنبثقة كما تظهر للزائر"
                  >
                    <Eye className="size-3.5 text-slate-500" aria-hidden="true" />
                    <span>معاينة النافذة</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setFormModal({ isOpen: true, item })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit3 className="size-3.5 text-slate-500" aria-hidden="true" />
                        <span>تعديل</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="flex size-8 items-center justify-center rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                        title="حذف هذا العنصر"
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
