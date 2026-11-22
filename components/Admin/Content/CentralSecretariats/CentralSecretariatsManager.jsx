"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import DeleteConfirmModal from "@/components/Admin/Content/DeleteConfirmModal";
import SecretariatList from "./SecretariatList";
import SecretariatPeopleManager from "./SecretariatPeopleManager";
import CentralSecretariatFormModal from "./CentralSecretariatFormModal";
import SecretariatPersonFormModal from "./SecretariatPersonFormModal";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function CentralSecretariatsManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secretariats, setSecretariats] = useState([]);
  const [selectedSecretariatId, setSelectedSecretariatId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [secModalState, setSecModalState] = useState({
    isOpen: false,
    secretariat: null,
  });
  const [personModalState, setPersonModalState] = useState({
    isOpen: false,
    person: null,
  });
  const [deletingSecretariat, setDeletingSecretariat] = useState(null);
  const [deletingPerson, setDeletingPerson] = useState(null);

  const canManage = hasPermission(user?.role, "content:manage");
  const canDelete = hasPermission(user?.role, "records:delete");

  // Fetch Central Secretariats list (with people included)
  useEffect(() => {
    let ignore = false;

    adminFetch("/api/admin/content/central-secretariats?page=1&page_size=100")
      .then((res) => {
        if (!ignore) {
          const items = Array.isArray(res?.items) ? res.items : [];
          setSecretariats(
            items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err?.message || "فشل تحميل قائمة الأمانات المركزية.");
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

  // Currently selected secretariat object
  const selectedSecretariat = useMemo(() => {
    if (!selectedSecretariatId) return null;
    return secretariats.find((s) => s.id === selectedSecretariatId) || null;
  }, [secretariats, selectedSecretariatId]);

  // Derive parent info_item_id
  const parentInfoItemId = useMemo(() => {
    if (secretariats.length > 0 && secretariats[0].info_item_id) {
      return secretariats[0].info_item_id;
    }
    return 1;
  }, [secretariats]);

  // Next available sort order for secretariats
  const nextSecSortOrder = useMemo(() => {
    if (!secretariats.length) return 1;
    const maxOrder = Math.max(...secretariats.map((s) => s.sort_order ?? 0));
    return maxOrder + 1;
  }, [secretariats]);

  // Next available sort order for members of the selected secretariat
  const nextPersonSortOrder = useMemo(() => {
    const people = selectedSecretariat?.people || [];
    if (!people.length) return 1;
    const maxOrder = Math.max(...people.map((p) => p.sort_order ?? 0));
    return maxOrder + 1;
  }, [selectedSecretariat]);

  // Save Secretariat (Create or Update)
  const handleSaveSecretariat = async (formData) => {
    setIsSubmitting(true);
    const isEditing = Boolean(secModalState.secretariat?.id);

    try {
      if (isEditing) {
        const id = secModalState.secretariat.id;
        const res = await adminFetch(`/api/admin/content/central-secretariats/${id}`, {
          method: "PATCH",
          body: {
            name_ar: formData.name_ar,
            head_name: formData.head_name ?? "",
            source_note: formData.source_note ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const updated = res?.central_secretariat || { ...secModalState.secretariat, ...formData };
        setSecretariats((prev) =>
          prev
            .map((s) =>
              s.id === id ? { ...s, ...updated, people: s.people || [] } : s
            )
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
        showSuccess(`تم تحديث «${formData.name_ar}» بنجاح.`);
      } else {
        const res = await adminFetch("/api/admin/content/central-secretariats", {
          method: "POST",
          body: {
            info_item_id: Number(formData.info_item_id),
            name_ar: formData.name_ar,
            head_name: formData.head_name ?? "",
            source_note: formData.source_note ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const created = res?.central_secretariat;
        if (created) {
          const itemWithPeople = { ...created, people: [] };
          setSecretariats((prev) =>
            [...prev, itemWithPeople].sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
          );
        }
        showSuccess(`تمت إضافة الأمانة «${formData.name_ar}» بنجاح.`);
      }
      setSecModalState({ isOpen: false, secretariat: null });
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Secretariat Published Status
  const handleToggleSecretariatStatus = async (sec) => {
    const newStatus = !sec.is_published;
    setIsSubmitting(true);

    try {
      await adminFetch(`/api/admin/content/central-secretariats/${sec.id}/status`, {
        method: "PATCH",
        body: { is_published: newStatus },
      });
      setSecretariats((prev) =>
        prev.map((s) => (s.id === sec.id ? { ...s, is_published: newStatus } : s))
      );
      showSuccess(
        newStatus
          ? `تم تفعيل ونشر «${sec.name_ar}» بالموقع العام.`
          : `تم إيقاف نشر «${sec.name_ar}».`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة النشر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Secretariat Delete Success (no duplicate toast)
  const handleDeleteSecretariatSuccess = () => {
    if (deletingSecretariat) {
      const deletedId = deletingSecretariat.id;
      setSecretariats((prev) => prev.filter((s) => s.id !== deletedId));
      if (selectedSecretariatId === deletedId) {
        setSelectedSecretariatId(null);
      }
      setDeletingSecretariat(null);
    }
  };

  // Save Person (Create or Update in selected secretariat)
  const handleSavePerson = async (formData) => {
    if (!selectedSecretariatId) return;
    setIsSubmitting(true);
    const isEditing = Boolean(personModalState.person?.id);
    const secId = selectedSecretariatId;

    try {
      if (isEditing) {
        const personId = personModalState.person.id;
        const res = await adminFetch(
          `/api/admin/content/central-secretariats/${secId}/people/${personId}`,
          {
            method: "PATCH",
            body: {
              full_name: formData.full_name,
              position_title: formData.position_title ?? "",
              image_url: formData.image_url ?? "",
              details: formData.details ?? "",
              sort_order: Number(formData.sort_order),
              is_published: Boolean(formData.is_published),
            },
          }
        );
        const updated = res?.person || { ...personModalState.person, ...formData };
        setSecretariats((prev) =>
          prev.map((s) => {
            if (s.id !== secId) return s;
            const updatedPeople = (s.people || [])
              .map((p) => (p.id === personId ? updated : p))
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            return { ...s, people: updatedPeople };
          })
        );
        showSuccess(`تم تحديث بيانات «${formData.full_name}» بنجاح.`);
      } else {
        const res = await adminFetch(
          `/api/admin/content/central-secretariats/${secId}/people`,
          {
            method: "POST",
            body: {
              full_name: formData.full_name,
              position_title: formData.position_title ?? "",
              image_url: formData.image_url ?? "",
              details: formData.details ?? "",
              sort_order: Number(formData.sort_order),
              is_published: Boolean(formData.is_published),
            },
          }
        );
        const created = res?.person;
        if (created) {
          setSecretariats((prev) =>
            prev.map((s) => {
              if (s.id !== secId) return s;
              const newPeople = [...(s.people || []), created].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
              );
              return { ...s, people: newPeople };
            })
          );
        }
        showSuccess(`تمت إضافة «${formData.full_name}» للأمانة بنجاح.`);
      }
      setPersonModalState({ isOpen: false, person: null });
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Person Published Status
  const handleTogglePersonStatus = async (person) => {
    if (!selectedSecretariatId) return;
    const secId = selectedSecretariatId;
    const newStatus = !person.is_published;
    setIsSubmitting(true);

    try {
      await adminFetch(
        `/api/admin/content/central-secretariats/${secId}/people/${person.id}/status`,
        {
          method: "PATCH",
          body: { is_published: newStatus },
        }
      );
      setSecretariats((prev) =>
        prev.map((s) => {
          if (s.id !== secId) return s;
          const updatedPeople = (s.people || []).map((p) =>
            p.id === person.id ? { ...p, is_published: newStatus } : p
          );
          return { ...s, people: updatedPeople };
        })
      );
      showSuccess(
        newStatus
          ? `تم تفعيل نشر «${person.full_name}».`
          : `تم إيقاف نشر «${person.full_name}».`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة نشر العضو.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Person Delete Success (no duplicate toast)
  const handleDeletePersonSuccess = () => {
    if (deletingPerson && selectedSecretariatId) {
      const deletedPersonId = deletingPerson.id;
      const secId = selectedSecretariatId;
      setSecretariats((prev) =>
        prev.map((s) => {
          if (s.id !== secId) return s;
          return {
            ...s,
            people: (s.people || []).filter((p) => p.id !== deletedPersonId),
          };
        })
      );
      setDeletingPerson(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-52 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center shadow-sm sm:p-8" dir="rtl">
        <AlertCircle className="mx-auto size-8 text-red-600 mb-2" aria-hidden="true" />
        <h3 className="text-sm font-bold text-red-900">تعذر تحميل الأمانات المركزية</h3>
        <p className="text-xs text-red-700 mt-1">{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 text-sm font-bold text-red-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* View Switch: All Secretariats OR Single Secretariat People */}
      {!selectedSecretariat ? (
        <SecretariatList
          secretariats={secretariats}
          onSelectSecretariat={(sec) => setSelectedSecretariatId(sec.id)}
          onAddNew={() => setSecModalState({ isOpen: true, secretariat: null })}
          onEdit={(sec) => setSecModalState({ isOpen: true, secretariat: sec })}
          onDelete={(sec) => setDeletingSecretariat(sec)}
          onToggleStatus={handleToggleSecretariatStatus}
          canManage={canManage}
          canDelete={canDelete}
          busy={isSubmitting}
        />
      ) : (
        <SecretariatPeopleManager
          secretariat={selectedSecretariat}
          people={selectedSecretariat.people || []}
          onBack={() => setSelectedSecretariatId(null)}
          onAddPerson={() => setPersonModalState({ isOpen: true, person: null })}
          onEditPerson={(p) => setPersonModalState({ isOpen: true, person: p })}
          onDeletePerson={(p) => setDeletingPerson(p)}
          onToggleStatus={handleTogglePersonStatus}
          canManage={canManage}
          canDelete={canDelete}
          busy={isSubmitting}
        />
      )}

      {/* Secretariat Form Modal (Add / Edit) */}
      <CentralSecretariatFormModal
        key={secModalState.secretariat?.id || (secModalState.isOpen ? "new-sec" : "sec-none")}
        isOpen={secModalState.isOpen}
        onClose={() => setSecModalState({ isOpen: false, secretariat: null })}
        secretariat={secModalState.secretariat}
        parentInfoItemId={parentInfoItemId}
        nextSortOrder={nextSecSortOrder}
        onSave={handleSaveSecretariat}
        isSubmitting={isSubmitting}
      />

      {/* Person Form Modal (Add / Edit) */}
      <SecretariatPersonFormModal
        key={personModalState.person?.id || (personModalState.isOpen ? "new-person" : "person-none")}
        isOpen={personModalState.isOpen}
        onClose={() => setPersonModalState({ isOpen: false, person: null })}
        person={personModalState.person}
        secretariatName={selectedSecretariat?.name_ar || ""}
        nextSortOrder={nextPersonSortOrder}
        onSave={handleSavePerson}
        isSubmitting={isSubmitting}
      />

      {/* Secretariat Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingSecretariat)}
        onClose={() => setDeletingSecretariat(null)}
        endpoint={`/api/admin/content/central-secretariats/${deletingSecretariat?.id}`}
        recordName={deletingSecretariat?.name_ar}
        recordType="الأمانة المركزية"
        title="تأكيد حذف الأمانة المركزية"
        warningNote="سيتم حذف هذه الأمانة وجميع الكوادر والأعضاء التابعين لها نهائياً وتوثيق الإجراء في سجل التدقيق."
        onSuccess={handleDeleteSecretariatSuccess}
      />

      {/* Person Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingPerson)}
        onClose={() => setDeletingPerson(null)}
        endpoint={
          selectedSecretariatId && deletingPerson
            ? `/api/admin/content/central-secretariats/${selectedSecretariatId}/people/${deletingPerson.id}`
            : ""
        }
        recordName={deletingPerson?.full_name}
        recordType="عضو الأمانة"
        title="تأكيد حذف عضو الأمانة"
        warningNote="سيتم حذف هذا العضو نهائياً من قائمة كوادر الأمانة وتوثيق الإجراء في سجل التدقيق."
        onSuccess={handleDeletePersonSuccess}
      />
    </div>
  );
}
