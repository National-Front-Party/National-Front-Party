"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import DraftEditor from "./DraftEditor";
import PublishedProgramCard from "./PublishedProgramCard";
import PublishConfirmModal from "./PublishConfirmModal";
import DiscardConfirmModal from "./DiscardConfirmModal";
import ProgramPreviewModal from "./ProgramPreviewModal";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  RotateCcw,
} from "lucide-react";

export default function PartyProgramManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ published: null, draft: null, has_draft: false });

  const [activeView, setActiveView] = useState("editor"); // "editor" | "published"

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Modal states
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [previewState, setPreviewState] = useState({
    isOpen: false,
    title: "",
    body: "",
    source_note: "",
    isDraft: true,
  });

  const canManage = hasPermission(user?.role, "content:manage");

  useEffect(() => {
    let mounted = true;

    adminFetch("/api/admin/content/party-program")
      .then((res) => {
        if (mounted) {
          setData(res || { published: null, draft: null, has_draft: false });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError({
            message: err.message || "فشل تحميل بيانات برنامج الحزب من الخادم.",
            status: err.status || 500,
          });
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    adminFetch("/api/admin/content/party-program")
      .then((res) => {
        setData(res || { published: null, draft: null, has_draft: false });
        setLoading(false);
      })
      .catch((err) => {
        setError({
          message: err.message || "فشل تحميل بيانات برنامج الحزب من الخادم.",
          status: err.status || 500,
        });
        setLoading(false);
      });
  };

  // Handle Save Draft (PUT /api/admin/content/party-program/draft)
  const handleSaveDraft = async (formData) => {
    setIsSaving(true);
    try {
      const res = await adminFetch("/api/admin/content/party-program/draft", {
        method: "PUT",
        body: formData,
      });
      showSuccess("تم حفظ مسودة برنامج الحزب بنجاح.");
      setData((prev) => ({
        ...prev,
        draft: res.draft,
        has_draft: true,
      }));
      return true;
    } catch (err) {
      showError(err.message || "تعذر حفظ المسودة، يرجى المحاولة مرة أخرى.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Publish Draft (POST /api/admin/content/party-program/publish)
  const handlePublishConfirm = async () => {
    setIsPublishing(true);
    try {
      const res = await adminFetch("/api/admin/content/party-program/publish", {
        method: "POST",
        body: {},
      });
      showSuccess("تم اعتماد ونشر مسودة برنامج الحزب على الصفحة الرئيسية بنجاح!");
      setData((prev) => ({
        ...prev,
        published: res.published,
        draft: null,
        has_draft: false,
      }));
      setIsPublishModalOpen(false);
      setActiveView("published");
    } catch (err) {
      showError(err.message || "فشلت عملية النشر، يرجى التحقق وإعادة المحاولة.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Discard Draft (DELETE /api/admin/content/party-program/draft)
  const handleDiscardConfirm = async () => {
    setIsDiscarding(true);
    try {
      await adminFetch("/api/admin/content/party-program/draft", {
        method: "DELETE",
        body: { confirm: true },
      });
      showSuccess("تم إهمال وحذف مسودة العمل بنجاح.");
      setData((prev) => ({
        ...prev,
        draft: null,
        has_draft: false,
      }));
      setIsDiscardModalOpen(false);
    } catch (err) {
      showError(err.message || "فشل إهمال المسودة، يرجى المحاولة لاحقاً.");
    } finally {
      setIsDiscarding(false);
    }
  };

  // Helper to open preview modal
  const handleOpenPreview = ({ title, body, source_note }) => {
    setPreviewState({
      isOpen: true,
      title: title || data.draft?.title || data.published?.title || "برنامج الحزب",
      body: body || data.draft?.body || data.published?.body || "",
      source_note: source_note || data.draft?.source_note || data.published?.source_note || "الموقع الرسمي للحزب",
      isDraft: true,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card" dir="rtl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="flex justify-end gap-3 pt-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-3xl border border-red-200 bg-red-50/70 p-6 sm:p-8 text-center"
        dir="rtl"
        role="alert"
      >
        <AlertCircle className="mx-auto size-10 text-red-600 mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-red-950 mb-1">
          {error.status === 403
            ? "غير مصرح لك بإدارة هذا المحتوى"
            : error.status === 401
            ? "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً"
            : "تعذر تحميل محتوى برنامج الحزب"}
        </h3>
        <p className="text-xs text-red-800 max-w-md mx-auto mb-5 leading-relaxed">
          {error.message}
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-2xl bg-white border border-red-200 px-5 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100/50 shadow-xs active:scale-[0.99] transition-all"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Container Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-card">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-gold shadow-xs">
              <BookOpen className="size-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="party-program-section-title" className="text-xl font-extrabold text-slate-900">
                  إدارة برنامج الحزب (الصفحة الرئيسية)
                </h2>
                <span className="rounded-full bg-gold/15 border border-gold/30 px-2.5 py-0.5 text-[10px] font-extrabold text-gold-darker">
                  محتوى تفاعلي
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة نصوص ومحاور بطاقة برنامج الحزب المنشورة للجمهور عبر نظام المسودات والاعتماد الذري
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {data.published ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                <span>النسخة المنشورة: نشطة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                <span>لا توجد نسخة منشورة</span>
              </span>
            )}

            {data.has_draft ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>مسودة عمل قيد التحرير</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                <span>لا توجد مسودة معلقة</span>
              </span>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 pt-6 pb-2" role="tablist" aria-label="تبويبات برنامج الحزب">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "editor"}
            onClick={() => setActiveView("editor")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeView === "editor"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileEdit className="size-4" aria-hidden="true" />
            <span>محرر المسودة</span>
            {data.has_draft && (
              <span className="size-2 rounded-full bg-amber-400" aria-label="يوجد مسودة عمل" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === "published"}
            onClick={() => setActiveView("published")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeView === "published"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <span>النسخة المنشورة للجمهور</span>
            {data.published && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2">
                مباشر
              </span>
            )}
          </button>
        </div>

        {/* Sub-view Content */}
        <div className="pt-4">
          {activeView === "editor" ? (
            <DraftEditor
              key={data.draft ? `draft-${data.draft.id}-${data.draft.updated_at}` : "new-draft"}
              draft={data.draft}
              published={data.published}
              onSaveDraft={handleSaveDraft}
              onOpenPublishModal={() => setIsPublishModalOpen(true)}
              onOpenDiscardModal={() => setIsDiscardModalOpen(true)}
              onOpenPreview={handleOpenPreview}
              isSaving={isSaving}
              isPublishing={isPublishing}
              isDiscarding={isDiscarding}
              canManage={canManage}
            />
          ) : (
            <PublishedProgramCard
              published={data.published}
              hasDraft={data.has_draft}
              canManage={canManage}
              onStartDraftFromPublished={() => setActiveView("editor")}
            />
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      <PublishConfirmModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublishConfirm}
        submitting={isPublishing}
        draftTitle={data.draft?.title || "برنامج الحزب"}
      />

      <DiscardConfirmModal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        onConfirm={handleDiscardConfirm}
        submitting={isDiscarding}
        draftTitle={data.draft?.title || "مسودة برنامج الحزب"}
      />

      <ProgramPreviewModal
        isOpen={previewState.isOpen}
        onClose={() => setPreviewState((prev) => ({ ...prev, isOpen: false }))}
        title={previewState.title}
        body={previewState.body}
        source_note={previewState.source_note}
        isDraft={previewState.isDraft}
      />
    </div>
  );
}
