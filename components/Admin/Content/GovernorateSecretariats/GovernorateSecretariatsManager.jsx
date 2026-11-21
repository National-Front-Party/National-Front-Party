"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { hasPermission } from "@/lib/admin/permissions";
import Skeleton from "@/components/Admin/ui/Skeleton";
import DeleteConfirmModal from "@/components/Admin/Content/DeleteConfirmModal";
import GovernoratePersonFormModal from "./GovernoratePersonFormModal";
import GovernorateFormModal from "./GovernorateFormModal";
import {
  MapPin,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Users,
  Building2,
  Plus,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";

export default function GovernorateSecretariatsManager() {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [loadingGovs, setLoadingGovs] = useState(true);
  const [govsError, setGovsError] = useState(null);
  const [governorates, setGovernorates] = useState([]);
  const [selectedGovId, setSelectedGovId] = useState(null);
  const [govSearch, setGovSearch] = useState("");

  const [loadingPeople, setLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState(null);
  const [people, setPeople] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals for Members
  const [personModalState, setPersonModalState] = useState({
    isOpen: false,
    person: null,
  });
  const [deletingPerson, setDeletingPerson] = useState(null);

  // Modals for Governorates
  const [govModalState, setGovModalState] = useState({
    isOpen: false,
    governorate: null,
  });
  const [deletingGov, setDeletingGov] = useState(null);

  const canManage = hasPermission(user?.role, "content:manage");
  const canDelete = hasPermission(user?.role, "records:delete");

  // 1. Fetch Governorates List (Admin API with fallback)
  useEffect(() => {
    let ignore = false;

    adminFetch("/api/admin/content/governorates")
      .then((res) => {
        if (!ignore) {
          const list = Array.isArray(res?.governorates) ? res.governorates : [];
          setGovernorates(list);
          setSelectedGovId((current) => current || (list.length > 0 ? list[0].id : null));
          setLoadingGovs(false);
        }
      })
      .catch(() => {
        // Fallback to public endpoint if admin route is unreachable
        fetch("/api/governorates")
          .then((r) => r.json())
          .then((data) => {
            if (!ignore) {
              const list = Array.isArray(data?.governorates) ? data.governorates : [];
              setGovernorates(list);
              setSelectedGovId((current) => current || (list.length > 0 ? list[0].id : null));
              setLoadingGovs(false);
            }
          })
          .catch((err) => {
            if (!ignore) {
              setGovsError(err?.message || "فشل تحميل المحافظات.");
              setLoadingGovs(false);
            }
          });
      });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. Fetch People for Selected Governorate
  useEffect(() => {
    if (!selectedGovId) return;

    let ignore = false;

    adminFetch(
      `/api/admin/content/governorate-secretariats?page=1&page_size=100&governorate_id=${selectedGovId}`
    )
      .then((res) => {
        if (!ignore) {
          const items = Array.isArray(res?.items) ? res.items : [];
          setPeople(items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
          setPeopleError(null);
          setLoadingPeople(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setPeopleError(err?.message || "فشل تحميل كوادر أمانة المحافظة.");
          setLoadingPeople(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedGovId, refreshKey]);

  // Selected Governorate Object
  const selectedGov = useMemo(() => {
    if (!selectedGovId) return null;
    return governorates.find((g) => g.id === selectedGovId) || null;
  }, [governorates, selectedGovId]);

  // Filtered Governorates for Search
  const filteredGovs = useMemo(() => {
    const q = (govSearch || "").trim().toLowerCase();
    if (!q) return governorates;
    return governorates.filter(
      (g) =>
        (g.name_ar && g.name_ar.toLowerCase().includes(q)) ||
        (g.code && g.code.toLowerCase().includes(q))
    );
  }, [governorates, govSearch]);

  // Next available sort order for governorates
  const nextGovSortOrder = useMemo(() => {
    if (!governorates.length) return 1;
    const maxOrder = Math.max(...governorates.map((g) => g.sort_order ?? 0));
    return maxOrder + 1;
  }, [governorates]);

  // Next available sort order for the selected governorate members
  const nextPersonSortOrder = useMemo(() => {
    if (!people.length) return 1;
    const maxOrder = Math.max(...people.map((p) => p.sort_order ?? 0));
    return maxOrder + 1;
  }, [people]);

  // ----------------------------------------------------
  // Governorate Actions (Add / Edit / Toggle / Delete)
  // ----------------------------------------------------
  const handleSaveGov = async (formData) => {
    setIsSubmitting(true);
    const isEditing = Boolean(govModalState.governorate?.id);

    try {
      if (isEditing) {
        const id = govModalState.governorate.id;
        const res = await adminFetch(`/api/admin/content/governorates/${id}`, {
          method: "PATCH",
          body: formData,
        });
        const updated = res?.governorate || { ...govModalState.governorate, ...formData };
        setGovernorates((prev) =>
          prev
            .map((g) => (g.id === id ? { ...g, ...updated } : g))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
        showSuccess(`تم تحديث محافظة «${formData.name_ar}» بنجاح.`);
      } else {
        const res = await adminFetch("/api/admin/content/governorates", {
          method: "POST",
          body: formData,
        });
        const created = res?.governorate;
        if (created) {
          setGovernorates((prev) =>
            [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          );
          setSelectedGovId(created.id);
        }
        showSuccess(`تمت إضافة محافظة «${formData.name_ar}» بنجاح.`);
      }
      setGovModalState({ isOpen: false, governorate: null });
    } catch (err) {
      showError(err?.message || "تعذر حفظ بيانات المحافظة.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGovStatus = async (gov, e) => {
    e?.stopPropagation();
    if (!canManage) return;
    const newStatus = !gov.is_active;
    setIsSubmitting(true);

    try {
      await adminFetch(`/api/admin/content/governorates/${gov.id}/status`, {
        method: "PATCH",
        body: { is_active: newStatus },
      });
      setGovernorates((prev) =>
        prev.map((g) => (g.id === gov.id ? { ...g, is_active: newStatus } : g))
      );
      showSuccess(
        newStatus
          ? `تم تفعيل وإظهار محافظة «${gov.name_ar}» بالموقع.`
          : `تم إخفاء محافظة «${gov.name_ar}» من الموقع العام.`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة ظهور المحافظة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGovSuccess = () => {
    if (deletingGov) {
      const deletedId = deletingGov.id;
      const updatedList = governorates.filter((g) => g.id !== deletedId);
      setGovernorates(updatedList);
      if (selectedGovId === deletedId) {
        setSelectedGovId(updatedList.length > 0 ? updatedList[0].id : null);
      }
      setDeletingGov(null);
    }
  };

  // ----------------------------------------------------
  // Member Actions
  // ----------------------------------------------------
  const handleSavePerson = async (formData) => {
    setIsSubmitting(true);
    const isEditing = Boolean(personModalState.person?.id);

    try {
      if (isEditing) {
        const id = personModalState.person.id;
        const res = await adminFetch(`/api/admin/content/governorate-secretariats/${id}`, {
          method: "PATCH",
          body: {
            full_name: formData.full_name,
            role_title: formData.role_title ?? "",
            photo_url: formData.photo_url ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const updated = res?.governorate_secretariat || {
          ...personModalState.person,
          ...formData,
        };
        setPeople((prev) =>
          prev
            .map((p) => (p.id === id ? updated : p))
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        );
        showSuccess(`تم تحديث بيانات «${formData.full_name}» بنجاح.`);
      } else {
        const res = await adminFetch("/api/admin/content/governorate-secretariats", {
          method: "POST",
          body: {
            governorate_id: Number(selectedGovId),
            full_name: formData.full_name,
            role_title: formData.role_title ?? "",
            photo_url: formData.photo_url ?? "",
            sort_order: Number(formData.sort_order),
            is_published: Boolean(formData.is_published),
          },
        });
        const created = res?.governorate_secretariat;
        if (created) {
          setPeople((prev) =>
            [...prev, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          );
        }
        showSuccess(`تمت إضافة «${formData.full_name}» إلى أمانة المحافظة بنجاح.`);
      }
      setPersonModalState({ isOpen: false, person: null });
    } catch (err) {
      showError(err?.message || "تعذر حفظ بيانات العضو. يرجى المحاولة مرة أخرى.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (person) => {
    if (!canManage) return;
    const newStatus = !person.is_published;
    setIsSubmitting(true);

    try {
      await adminFetch(`/api/admin/content/governorate-secretariats/${person.id}/status`, {
        method: "PATCH",
        body: { is_published: newStatus },
      });
      setPeople((prev) =>
        prev.map((p) => (p.id === person.id ? { ...p, is_published: newStatus } : p))
      );
      showSuccess(
        newStatus
          ? `تم نشر «${person.full_name}» في الموقع العام.`
          : `تم إيقاف عرض «${person.full_name}» بالموقع.`
      );
    } catch (err) {
      showError(err?.message || "تعذر تغيير حالة نشر العضو.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePersonSuccess = () => {
    if (deletingPerson) {
      const deletedId = deletingPerson.id;
      setPeople((prev) => prev.filter((p) => p.id !== deletedId));
      setDeletingPerson(null);
    }
  };

  const handleRetryPeople = useCallback(() => {
    setLoadingPeople(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSelectGov = (id) => {
    if (id === selectedGovId) return;
    setSelectedGovId(id);
    setLoadingPeople(true);
  };

  if (loadingGovs) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-56 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-96 md:col-span-1 rounded-3xl" />
          <Skeleton className="h-96 md:col-span-3 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (govsError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center" dir="rtl">
        <AlertCircle className="mx-auto size-8 text-red-600 mb-2" aria-hidden="true" />
        <h3 className="text-sm font-bold text-red-900">تعذر تحميل المحافظات</h3>
        <p className="text-xs text-red-700 mt-1">{govsError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-red-200 text-xs font-bold text-red-800 hover:bg-red-50 transition-colors"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>تحديث الصفحة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold/15 text-gold-darker shadow-2xs">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-base font-black text-slate-900">
              أمانات المحافظات والتشكيلات الإقليمية
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
              {governorates.length} محافظة
            </span>
          </div>
          <p className="text-xs text-slate-500">
            التحكم في ظهور وترتيب المحافظات وإدارة كوادر وأمناء المحافظات بالصفحة الرئيسية للموقع
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {canManage && (
            <button
              type="button"
              onClick={() => setGovModalState({ isOpen: true, governorate: null })}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Plus className="size-4 text-gold-darker" aria-hidden="true" />
              <span>إضافة محافظة جديدة</span>
            </button>
          )}

          {selectedGov && canManage && (
            <button
              type="button"
              onClick={() => setPersonModalState({ isOpen: true, person: null })}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gold-gradient text-xs font-bold text-ink shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              <span>إضافة عضو بأمانة {selectedGov.name_ar}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Side: Governorates Navigator & Visibility Control (4 cols on lg) */}
        <aside
          className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5"
          aria-label="قائمة المحافظات والتحكم في الظهور"
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <MapPin className="size-4 text-gold-darker" aria-hidden="true" />
              <span>المحافظات والظهور:</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ({filteredGovs.length} / {governorates.length})
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={govSearch}
              onChange={(e) => setGovSearch(e.target.value)}
              placeholder="ابحث عن محافظة..."
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50/50 pr-9 pl-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-gold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-gold/20 transition-all"
            />
            {govSearch && (
              <button
                type="button"
                onClick={() => setGovSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Governorates Scrollable List */}
          <div className="max-h-[560px] overflow-y-auto space-y-1.5 pr-0.5 pl-1">
            {filteredGovs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                لا توجد محافظة تطابق «{govSearch}»
              </div>
            ) : (
              filteredGovs.map((gov) => {
                const isSelected = gov.id === selectedGovId;
                const isActive = gov.is_active !== false;

                return (
                  <div
                    key={gov.id}
                    onClick={() => handleSelectGov(gov.id)}
                    className={`group w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer border ${
                      isSelected
                        ? "bg-slate-900 text-gold-light shadow-xs border-slate-800 ring-2 ring-gold/20"
                        : isActive
                        ? "bg-white text-slate-700 hover:bg-slate-50 border-slate-100"
                        : "bg-slate-50/80 text-slate-400 hover:bg-slate-100 border-dashed border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Active Status Dot */}
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          isActive ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-300"
                        }`}
                        title={isActive ? "معروضة بالموقع" : "مخفية من الموقع"}
                      />

                      <span className="truncate">{gov.name_ar}</span>

                      {!isActive && (
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal shrink-0">
                          مخفية
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-white/10 text-gold-light"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {gov.code || `ID:${gov.id}`}
                      </span>

                      {/* Quick Hover Controls */}
                      {canManage && (
                        <div className="flex items-center gap-0.5">
                          {/* Toggle Active Visibility */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleGovStatus(gov, e)}
                            disabled={isSubmitting}
                            className={`size-6 rounded-md flex items-center justify-center transition-colors ${
                              isSelected
                                ? "text-gold-light hover:bg-white/20"
                                : isActive
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-slate-400 hover:bg-slate-200"
                            }`}
                            title={isActive ? "إخفاء المحافظة من الموقع" : "إظهار المحافظة في الموقع"}
                          >
                            {isActive ? (
                              <Eye className="size-3.5" aria-hidden="true" />
                            ) : (
                              <EyeOff className="size-3.5" aria-hidden="true" />
                            )}
                          </button>

                          {/* Edit Governorate */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGovModalState({ isOpen: true, governorate: gov });
                            }}
                            disabled={isSubmitting}
                            className={`size-6 rounded-md flex items-center justify-center transition-colors ${
                              isSelected
                                ? "text-gold-light hover:bg-white/20"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                            title="تعديل بيانات المحافظة والترتيب"
                          >
                            <Edit3 className="size-3" aria-hidden="true" />
                          </button>

                          {/* Delete Governorate (if super admin) */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingGov(gov);
                              }}
                              disabled={isSubmitting}
                              className={`size-6 rounded-md flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "text-red-300 hover:bg-red-500/20"
                                  : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                              title="حذف المحافظة"
                            >
                              <Trash2 className="size-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Left Side: Secretariat Members Management (8 cols on lg) */}
        <section
          className="lg:col-span-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-5"
          aria-labelledby="selected-gov-title"
        >
          {/* Header of Selected Governorate */}
          {selectedGov ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-darker shadow-2xs">
                  <MapPin className="size-6 text-gold-darker" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="selected-gov-title" className="text-base font-black text-slate-900">
                      أمانة محافظة {selectedGov.name_ar}
                    </h3>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600">
                      {selectedGov.code}
                    </span>

                    {/* Active Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        selectedGov.is_active !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {selectedGov.is_active !== false ? (
                        <>
                          <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                          <span>معروضة بالموقع</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3 text-slate-400" aria-hidden="true" />
                          <span>مخفية من الموقع</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ترتيب العرض: {selectedGov.sort_order ?? 0} • الكوادر المسجلة: {people.length} عضو
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setGovModalState({ isOpen: true, governorate: selectedGov })}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    title="تعديل اسم أو كود أو ترتيب المحافظة"
                  >
                    <Settings className="size-3.5 text-slate-500" aria-hidden="true" />
                    <span>إعدادات المحافظة</span>
                  </button>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={() => setPersonModalState({ isOpen: true, person: null })}
                    disabled={isSubmitting || loadingPeople}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gold/15 hover:bg-gold/25 text-gold-darker text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    <span>إضافة عضو</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              يرجى اختيار محافظة من القائمة الجانبية لعرض كوادرها
            </div>
          )}

          {/* Members Content Area */}
          {loadingPeople ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : peopleError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 text-center">
              <AlertCircle className="mx-auto size-6 text-red-600 mb-1" aria-hidden="true" />
              <p className="text-xs font-bold text-red-900">{peopleError}</p>
              <button
                type="button"
                onClick={handleRetryPeople}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : people.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <Users className="mx-auto size-9 text-slate-300 mb-2" aria-hidden="true" />
              <h4 className="text-sm font-bold text-slate-800">
                لا يوجد أعضاء مسجلين بأمانة {selectedGov?.name_ar || "المحافظة"} حالياً
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                يظهر للمواطنين بالصفحة الرئيسية التنبيه الافتراضي «هيكل أمانة المحافظة قيد الاعتماد» حتى يتم تسجيل كوادر لها.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setPersonModalState({ isOpen: true, person: null })}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-gold-light hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  <span>إضافة أول عضو بأمانة {selectedGov?.name_ar}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th scope="col" className="py-3 px-3 w-14 text-center">
                      الترتيب
                    </th>
                    <th scope="col" className="py-3 px-3">
                      العضو
                    </th>
                    <th scope="col" className="py-3 px-3">
                      الصفة / المنصب
                    </th>
                    <th scope="col" className="py-3 px-3 text-center w-28">
                      حالة النشر
                    </th>
                    <th scope="col" className="py-3 px-4 text-left w-24">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {people.map((person, index) => {
                    const rowKey = `${person.id}-${index}`;
                    return (
                      <tr
                        key={rowKey}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Sort Order */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex size-6 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-mono font-bold text-slate-600">
                            {person.sort_order ?? 0}
                          </span>
                        </td>

                        {/* Person Name & Optional Avatar */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {person.photo_url ? (
                              <Image
                                src={person.photo_url}
                                alt={person.full_name || ""}
                                width={36}
                                height={36}
                                className="size-9 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                              />
                            ) : (
                              <div
                                className="size-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200"
                                aria-label="بدون صورة"
                              >
                                <Users className="size-4 text-slate-400" aria-hidden="true" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">
                                {person.full_name}
                              </span>
                              {!person.photo_url && (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  بدون صورة شخصية
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role Title */}
                        <td className="py-3 px-3">
                          <span className="text-slate-700">
                            {person.role_title || "عضو أمانة"}
                          </span>
                        </td>

                        {/* Published Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(person)}
                              disabled={isSubmitting}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                                person.is_published
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title={
                                person.is_published
                                  ? "انقر لإلغاء النشر بالموقع"
                                  : "انقر لتفعيل النشر بالموقع"
                              }
                            >
                              {person.is_published ? (
                                <>
                                  <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                                  <span>منشور</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="size-3 text-slate-400" aria-hidden="true" />
                                  <span>معطل</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                person.is_published
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {person.is_published ? "منشور" : "معطل"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center justify-end gap-1">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPersonModalState({ isOpen: true, person })
                                }
                                disabled={isSubmitting}
                                className="size-7 rounded-lg text-slate-400 hover:text-gold-darker hover:bg-gold-tint flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                                title="تعديل بيانات العضو"
                              >
                                <Edit3 className="size-3.5" aria-hidden="true" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeletingPerson(person)}
                                disabled={isSubmitting}
                                className="size-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                                title="حذف العضو نهائياً"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
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
          )}
        </section>
      </div>

      {/* Member Add/Edit Modal */}
      {personModalState.isOpen && selectedGov && (
        <GovernoratePersonFormModal
          key={personModalState.person?.id || `new-gov-person-${selectedGovId}`}
          isOpen={personModalState.isOpen}
          onClose={() => setPersonModalState({ isOpen: false, person: null })}
          person={personModalState.person}
          governorateId={selectedGovId}
          governorateName={selectedGov.name_ar}
          nextSortOrder={nextPersonSortOrder}
          onSave={handleSavePerson}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Governorate Add/Edit Modal */}
      {govModalState.isOpen && (
        <GovernorateFormModal
          key={govModalState.governorate?.id || "new-gov-modal"}
          isOpen={govModalState.isOpen}
          onClose={() => setGovModalState({ isOpen: false, governorate: null })}
          governorate={govModalState.governorate}
          nextSortOrder={nextGovSortOrder}
          onSave={handleSaveGov}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Member Confirmation Modal */}
      {deletingPerson && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingPerson)}
          onClose={() => setDeletingPerson(null)}
          onSuccess={handleDeletePersonSuccess}
          endpoint={`/api/admin/content/governorate-secretariats/${deletingPerson.id}`}
          recordName={deletingPerson.full_name}
          recordType="عضو الأمانة"
          title="تأكيد حذف عضو أمانة المحافظة"
          warningNote="سيتم حذف العضو نهائياً من أمانة المحافظة وتوثيق العملية في سجل التدقيق."
        />
      )}

      {/* Delete Governorate Confirmation Modal */}
      {deletingGov && (
        <DeleteConfirmModal
          isOpen={Boolean(deletingGov)}
          onClose={() => setDeletingGov(null)}
          onSuccess={handleDeleteGovSuccess}
          endpoint={`/api/admin/content/governorates/${deletingGov.id}`}
          recordName={deletingGov.name_ar}
          recordType="المحافظة"
          title="تأكيد حذف المحافظة"
          warningNote="تنبيه: لا يمكن حذف المحافظة إذا كانت تحتوي على أعضاء أو طلبات انضمام أو كوادر مسجلة. في تلك الحالة يفضل إخفاؤها من الموقع بدلاً من حذفها."
        />
      )}
    </div>
  );
}
