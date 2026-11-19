"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import DeleteConfirmModal from "@/components/Admin/Content/DeleteConfirmModal";
import PresidentCard from "./PresidentCard";
import PresidentEditModal from "./PresidentEditModal";
import LeaderCardList from "./LeaderCardList";
import LeaderFormModal from "./LeaderFormModal";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function PartyLeadershipManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(null);
  const [president, setPresident] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isPresidentModalOpen, setIsPresidentModalOpen] = useState(false);
  const [leaderFormState, setLeaderFormState] = useState({
    isOpen: false,
    leader: null, // null for create, object for edit
  });
  const [deletingLeader, setDeletingLeader] = useState(null);

  const canManage = hasPermission(user?.role, "content:manage");
  const canDelete = hasPermission(user?.role, "records:delete");

  // Fetch Central Leadership Panel & Leaders
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Panels to locate "central-leadership"
        const panelsRes = await adminFetch("/api/admin/content/leadership/panels?page=1&page_size=50");
        const panelList = panelsRes?.items || [];
        const targetPanel =
          panelList.find((p) => p.slug === "central-leadership") ||
          panelList[0] ||
          null;

        if (!targetPanel) {
          if (mounted) {
            setError("لم يتم العثور على تشكيل القيادة المركزية في النظام.");
            setLoading(false);
          }
          return;
        }

        if (mounted) setPanel(targetPanel);

        // 2. Fetch Leaders for this panel
        const leadersRes = await adminFetch(
          `/api/admin/content/leadership/leaders?panel_id=${targetPanel.id}&page_size=100`
        );
        const allItems = leadersRes?.items || [];

        if (mounted) {
          // Identify head of the panel (Party President)
          const head = allItems.find((it) => it.is_head === true) || null;
          // Identify non-head leaders (Party Leadership list)
          const nonHead = allItems
            .filter((it) => it.is_head !== true)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

          setPresident(head);
          setLeaders(nonHead);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "فشل تحميل بيانات قيادات الحزب من الخادم.");
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Next available sort order for new leaders
  const nextSortOrder = useMemo(() => {
    if (!leaders.length) return 1;
    const maxOrder = Math.max(...leaders.map((it) => it.sort_order ?? 0));
    return maxOrder + 1;
  }, [leaders]);

  // Handle Save President (Create or Update)
  const handleSavePresident = async (formData) => {
    setIsSubmitting(true);
    try {
      if (president?.id) {
        // PATCH existing president
        const res = await adminFetch(`/api/admin/content/leadership/leaders/${president.id}`, {
          method: "PATCH",
          body: {
            full_name: formData.full_name,
            role_title: formData.role_title ?? "",
            badge_label: formData.badge_label ?? "",
            photo_url: formData.photo_url ?? "",
          },
        });
        setPresident(res?.leader || { ...president, ...formData });
        showSuccess("تم تحديث بيانات رئيس الحزب بنجاح.");
      } else {
        // POST new president
        if (!panel?.id) throw new Error("التشكيل القيادي غير محدد.");
        const res = await adminFetch("/api/admin/content/leadership/leaders", {
          method: "POST",
          body: {
            panel_id: Number(panel.id),
            full_name: formData.full_name,
            role_title: formData.role_title ?? "",
            badge_label: formData.badge_label ?? "",
            photo_url: formData.photo_url ?? "",
            is_head: true,
            sort_order: 0,
            is_published: true,
          },
        });
        setPresident(res?.leader || null);
        showSuccess("تم تحديد وإضافة رئيس الحزب بنجاح.");
      }
      setIsPresidentModalOpen(false);
    } catch (err) {
      showError(err?.message || "تعذر حفظ بيانات رئيس الحزب، يرجى المحاولة مرة أخرى.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Leader (Create or Update non-head leader)
  const handleSaveLeader = async (formData) => {
    setIsSubmitting(true);
    const isEditing = Boolean(leaderFormState.leader?.id);

    try {
      if (isEditing) {
        const id = leaderFormState.leader.id;
        const res = await adminFetch(`/api/admin/content/leadership/leaders/${id}`, {
          method: "PATCH",
          body: {
            full_name: formData.full_name,
            role_title: formData.role_title ?? "",
            badge_label: formData.badge_label ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const updated = res?.leader || { ...leaderFormState.leader, ...formData };
        setLeaders((prev) =>
          prev
            .map((it) => (it.id === id ? updated : it))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
        showSuccess(`تم تحديث بيانات «${formData.full_name}» بنجاح.`);
      } else {
        if (!panel?.id) throw new Error("التشكيل القيادي غير محدد.");
        const res = await adminFetch("/api/admin/content/leadership/leaders", {
          method: "POST",
          body: {
            panel_id: Number(panel.id),
            full_name: formData.full_name,
            role_title: formData.role_title ?? "",
            badge_label: formData.badge_label ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
            is_head: false,
          },
        });
        const created = res?.leader;
        if (created) {
          setLeaders((prev) =>
            [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          );
        }
        showSuccess(`تمت إضافة القيادي «${formData.full_name}» بنجاح.`);
      }
      setLeaderFormState({ isOpen: false, leader: null });
    } catch (err) {
      showError(err?.message || "تعذر حفظ بيانات القيادي، يرجى المحاولة مرة أخرى.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Published Status for a leader
  const handleToggleLeaderStatus = async (leader) => {
    const newStatus = !leader.is_published;
    setIsSubmitting(true);

    try {
      await adminFetch(`/api/admin/content/leadership/leaders/${leader.id}/status`, {
        method: "PATCH",
        body: { is_published: newStatus },
      });
      setLeaders((prev) =>
        prev.map((it) => (it.id === leader.id ? { ...it, is_published: newStatus } : it))
      );
      showSuccess(
        newStatus
          ? `تم نشر «${leader.full_name}» بالصفحة الرئيسية.`
          : `تم إيقاف عرض «${leader.full_name}» بالموقع.`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة النشر، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reordering Leaders (Move Up / Move Down)
  const handleMoveLeader = async (leader, direction) => {
    const currentIndex = leaders.findIndex((it) => it.id === leader.id);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= leaders.length) return;

    const targetLeader = leaders[targetIndex];
    const currentOrder = leader.sort_order ?? currentIndex;
    const targetOrder = targetLeader.sort_order ?? targetIndex;

    const newCurrentOrder = targetOrder === currentOrder
      ? (direction === "up" ? targetOrder - 1 : targetOrder + 1)
      : targetOrder;
    const newTargetOrder = currentOrder;

    setIsSubmitting(true);

    try {
      await Promise.all([
        adminFetch(`/api/admin/content/leadership/leaders/${leader.id}`, {
          method: "PATCH",
          body: { sort_order: newCurrentOrder },
        }),
        adminFetch(`/api/admin/content/leadership/leaders/${targetLeader.id}`, {
          method: "PATCH",
          body: { sort_order: newTargetOrder },
        }),
      ]);

      setLeaders((prev) =>
        prev
          .map((it) => {
            if (it.id === leader.id) return { ...it, sort_order: newCurrentOrder };
            if (it.id === targetLeader.id) return { ...it, sort_order: newTargetOrder };
            return it;
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
      showSuccess(`تم تعديل ترتيب «${leader.full_name}».`);
    } catch (err) {
      showError(err?.message || "تعذر حفظ الترتيب الجديد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Successful Deletion
  const handleDeleteSuccess = () => {
    if (deletingLeader) {
      const deletedId = deletingLeader.id;
      setLeaders((prev) => prev.filter((it) => it.id !== deletedId));
      setDeletingLeader(null);
    }
  };

  // Loading State Skeleton
  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-7 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div
        className="rounded-3xl border border-red-200 bg-red-50/70 p-6 sm:p-8 text-center"
        dir="rtl"
        role="alert"
      >
        <AlertCircle className="mx-auto size-10 text-red-600 mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-red-950 mb-1">
          تعذر تحميل بيانات قيادات الحزب
        </h3>
        <p className="text-xs text-red-700/90 max-w-md mx-auto mb-4 leading-relaxed">
          {error}
        </p>
        <button
          type="button"
          onClick={reload}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white border border-red-200 px-5 text-xs font-bold text-red-800 hover:bg-red-100/50 shadow-xs active:scale-[0.99] transition-all"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* 1. Party President Section */}
      <section aria-labelledby="party-president-section-title">
        <h2 id="party-president-section-title" className="sr-only">
          رئيس الحزب
        </h2>
        <PresidentCard
          president={president}
          onEdit={() => setIsPresidentModalOpen(true)}
          onCreate={() => setIsPresidentModalOpen(true)}
          canManage={canManage}
        />
      </section>

      {/* 2. Party Leadership List Section */}
      <section aria-labelledby="party-leaders-list-section-title">
        <h2 id="party-leaders-list-section-title" className="sr-only">
          قائمة قيادات الحزب
        </h2>
        <LeaderCardList
          leaders={leaders}
          onAddNew={() => setLeaderFormState({ isOpen: true, leader: null })}
          onEdit={(leader) => setLeaderFormState({ isOpen: true, leader })}
          onDelete={(leader) => setDeletingLeader(leader)}
          onToggleStatus={handleToggleLeaderStatus}
          onMoveUp={(leader) => handleMoveLeader(leader, "up")}
          onMoveDown={(leader) => handleMoveLeader(leader, "down")}
          canManage={canManage}
          canDelete={canDelete}
          isBusy={isSubmitting}
        />
      </section>

      {/* President Edit Modal */}
      {isPresidentModalOpen && (
        <PresidentEditModal
          key={president?.id || "president-edit-modal"}
          isOpen={isPresidentModalOpen}
          onClose={() => setIsPresidentModalOpen(false)}
          president={president}
          onSave={handleSavePresident}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Leader Add/Edit Modal */}
      {leaderFormState.isOpen && (
        <LeaderFormModal
          key={leaderFormState.leader?.id || "new-leader-modal"}
          isOpen={leaderFormState.isOpen}
          onClose={() => setLeaderFormState({ isOpen: false, leader: null })}
          leader={leaderFormState.leader}
          nextSortOrder={nextSortOrder}
          onSave={handleSaveLeader}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Leader Confirmation Modal */}
      {deletingLeader && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingLeader)}
          onClose={() => setDeletingLeader(null)}
          endpoint={`/api/admin/content/leadership/leaders/${deletingLeader.id}`}
          onSuccess={handleDeleteSuccess}
          recordName={deletingLeader.full_name}
          recordType="القيادي"
          title="تأكيد حذف القيادي"
          warningNote="سيتم حذف القيادي نهائياً من قائمة قيادات الحزب وتوثيق العملية بسجل التدقيق."
        />
      )}
    </div>
  );
}
