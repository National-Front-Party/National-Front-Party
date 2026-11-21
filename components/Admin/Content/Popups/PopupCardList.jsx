"use client";

import {
  User,
  Target,
  Eye,
  Send,
  MessageCircleQuestion,
  Pencil,
  Trash2,
  Globe,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Lock,
} from "lucide-react";

const ICON_MAP = {
  user: User,
  target: Target,
  eye: Eye,
  send: Send,
  message: MessageCircleQuestion,
};

export default function PopupCardList({
  items = [],
  onPreview,
  onEdit,
  onToggleStatus,
  onDelete,
  onMoveOrder,
  canManage = true,
  canDelete = false,
  isBusy = false,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-right border-collapse" dir="rtl">
          <thead>
            <tr className="border-b border-line bg-page/60 text-[11px] font-bold text-muted uppercase tracking-wider">
              <th className="py-3 px-4 w-20 text-center">الترتيب</th>
              <th className="py-3 px-4 min-w-[220px]">العنصر</th>
              <th className="py-3 px-4">مقتطف المحتوى</th>
              <th className="py-3 px-4 w-32 text-center">الحالة</th>
              <th className="py-3 px-4 w-28 text-center">آخر تحديث</th>
              <th className="py-3 px-4 w-48 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-xs">
            {items.map((item, index) => {
              const IconComponent = ICON_MAP[item.icon] || User;
              const isPublished = Boolean(item.is_published);
              const paragraphsCount = item.body
                ? item.body.split(/\r?\n+/).filter((p) => p.trim().length > 0).length
                : 0;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gold-tint/15 transition-colors duration-150"
                >
                  {/* 1. Sort Order & Quick Reorder */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1">
                      <span className="font-mono text-xs font-bold text-slate-700 w-5">
                        {item.sort_order ?? index + 1}
                      </span>
                      {canManage && (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => onMoveOrder?.(item, -1)}
                            disabled={isBusy || index === 0}
                            title="تقديم التترتيب لأعلى"
                            className="text-slate-400 hover:text-ink disabled:opacity-20 transition-colors p-0.5"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveOrder?.(item, 1)}
                            disabled={isBusy || index === items.length - 1}
                            title="تأخير الترتيب لأسفل"
                            className="text-slate-400 hover:text-ink disabled:opacity-20 transition-colors p-0.5"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 2. Item Icon, Title & Slug */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                          isPublished
                            ? "bg-ink text-gold"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <IconComponent className="size-4.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm line-clamp-1">
                          {item.title}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {item.slug}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 3. Content Snippet & Paragraphs */}
                  <td className="py-3.5 px-4">
                    <div className="max-w-xs space-y-0.5">
                      <p className="text-slate-600 line-clamp-1 text-xs">
                        {item.body || "لا يوجد نص محتوى."}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {paragraphsCount} {paragraphsCount === 1 ? "فقرة" : "فقرات"} • المصدر: {item.source_note || "الموقع الرسمي"}
                      </span>
                    </div>
                  </td>

                  {/* 4. Publication Status */}
                  <td className="py-3.5 px-4 text-center">
                    {isPublished ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <span className="size-1.5 rounded-full bg-emerald-600" />
                        منشور
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                        <span className="size-1.5 rounded-full bg-slate-400" />
                        مسودة
                      </span>
                    )}
                  </td>

                  {/* 5. Last Updated Date */}
                  <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                    {formatDate(item.updated_at)}
                  </td>

                  {/* 6. Action Buttons */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => onPreview?.(item)}
                        title="معاينة نافذة العرض"
                        className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-gold hover:text-ink hover:bg-gold-tint/40 transition-colors shadow-2xs"
                      >
                        <Eye className="size-4 text-slate-600" />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => onEdit?.(item)}
                        disabled={isBusy || !canManage}
                        title={isPublished ? "تعديل (مقيد لحماية المنشور)" : "تعديل العنصر"}
                        className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors shadow-2xs ${
                          isPublished
                            ? "border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100/70"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        } disabled:opacity-40`}
                      >
                        {isPublished ? (
                          <Lock className="size-3.5 text-amber-700" />
                        ) : (
                          <Pencil className="size-3.5 text-slate-600" />
                        )}
                      </button>

                      {/* Toggle Publish Status */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onToggleStatus?.(item)}
                          disabled={isBusy}
                          title={isPublished ? "إيقاف نشر العنصر" : "نشر العنصر للجمهور"}
                          className={`inline-flex items-center justify-center size-8 rounded-lg border transition-colors shadow-2xs ${
                            isPublished
                              ? "border-slate-200 bg-white text-slate-500 hover:text-amber-800 hover:border-amber-300 hover:bg-amber-50"
                              : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          } disabled:opacity-40`}
                        >
                          {isPublished ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Globe className="size-3.5" />
                          )}
                        </button>
                      )}

                      {/* Delete Button */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete?.(item)}
                          disabled={isBusy}
                          title="حذف العنصر نهائياً"
                          className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Cards View */}
      <div className="lg:hidden divide-y divide-line">
        {items.map((item, index) => {
          const IconComponent = ICON_MAP[item.icon] || User;
          const isPublished = Boolean(item.is_published);

          return (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      isPublished ? "bg-ink text-gold" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <IconComponent className="size-4.5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <span className="font-mono text-[10px] text-slate-400">{item.slug}</span>
                  </div>
                </div>

                {isPublished ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    منشور
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    مسودة
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">
                {item.body || "لا يوجد نص محتوى."}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-line/60">
                <span className="text-[11px] text-slate-400">
                  الترتيب: <span className="font-bold text-slate-700">{item.sort_order ?? index + 1}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onPreview?.(item)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="معاينة"
                  >
                    <Eye className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit?.(item)}
                    disabled={isBusy || !canManage}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    title="تعديل"
                  >
                    <Pencil className="size-4" />
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(item)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      title={isPublished ? "إيقاف النشر" : "نشر للجمهور"}
                    >
                      {isPublished ? <EyeOff className="size-4" /> : <Globe className="size-4 text-emerald-600" />}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete?.(item)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
