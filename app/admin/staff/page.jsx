"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  RotateCcw,
  Search,
  KeyRound,
  History,
  ShieldCheck,
  UserX,
  UserCheck,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { adminFetch } from "@/lib/admin/api";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useToast } from "@/lib/admin/toast-context";
import { hasPermission, ROLE_LABELS } from "@/lib/admin/permissions";
import PageHeader from "@/components/Admin/ui/PageHeader";
import ActionDropdown from "@/components/Admin/ui/ActionDropdown";
import { RoleBadge } from "@/components/Admin/ui/Badge";
import Skeleton from "@/components/Admin/ui/Skeleton";
import EmptyState from "@/components/Admin/ui/EmptyState";
import { formatStaffDate, toArabicDigits, STAFF_ROLES } from "@/lib/admin/staff-utils";
import StaffEditorModal from "@/components/Admin/Staff/StaffEditorModal";
import StaffResetPasswordModal from "@/components/Admin/Staff/StaffResetPasswordModal";
import StaffSuccessPasswordModal from "@/components/Admin/Staff/StaffSuccessPasswordModal";
import StaffStatusModal from "@/components/Admin/Staff/StaffStatusModal";
import StaffAuditModal from "@/components/Admin/Staff/StaffAuditModal";
import StaffDeleteModal from "@/components/Admin/Staff/StaffDeleteModal";
import CustomSelect from "@/components/Home/ui/CustomSelect";

function getInitials(name) {
  if (!name) return "م";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0);
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
}

export default function StaffPage() {
  const { user, status } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const isSuperAdmin =
    user?.role === "super_admin" || hasPermission(user?.role, "staff:manage");

  // Staff Data
  const [staffList, setStaffList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Copy helper
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Modal States
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetResetStaff, setTargetResetStaff] = useState(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatusStaff, setTargetStatusStaff] = useState(null);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [targetAuditStaff, setTargetAuditStaff] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteStaff, setTargetDeleteStaff] = useState(null);

  // Success Password Modal (stores password temporarily in memory only)
  const [successPasswordModalOpen, setSuccessPasswordModalOpen] = useState(false);
  const [successStaff, setSuccessStaff] = useState(null);
  const [successTempPassword, setSuccessTempPassword] = useState("");
  const [successActionType, setSuccessActionType] = useState("create"); // 'create' | 'reset'

  // Fetch all staff members (handling multi-page aggregation if total > 100)
  const fetchStaff = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const initialRes = await adminFetch("/api/admin/staff?page=1&page_size=100");
      let allItems = Array.isArray(initialRes?.items) ? [...initialRes.items] : [];
      const total = initialRes?.total ?? allItems.length;

      const totalPages = Math.ceil(total / 100);
      if (totalPages > 1) {
        const extraPromises = [];
        for (let p = 2; p <= totalPages; p++) {
          extraPromises.push(adminFetch(`/api/admin/staff?page=${p}&page_size=100`));
        }
        const extraResults = await Promise.all(extraPromises);
        extraResults.forEach((pageRes) => {
          if (Array.isArray(pageRes?.items)) {
            allItems.push(...pageRes.items);
          }
        });
      }

      setStaffList(allItems);
      setTotalCount(total);
    } catch (err) {
      showError(err.message || "تعذر تحميل قائمة الموظفين");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    let ignore = false;
    if (status !== "loading" && isSuperAdmin) {
      adminFetch("/api/admin/staff?page=1&page_size=100")
        .then(async (initialRes) => {
          if (ignore) return;
          let allItems = Array.isArray(initialRes?.items) ? [...initialRes.items] : [];
          const total = initialRes?.total ?? allItems.length;

          const totalPages = Math.ceil(total / 100);
          if (totalPages > 1) {
            const extraPromises = [];
            for (let p = 2; p <= totalPages; p++) {
              extraPromises.push(adminFetch(`/api/admin/staff?page=${p}&page_size=100`));
            }
            const extraResults = await Promise.all(extraPromises);
            extraResults.forEach((pageRes) => {
              if (Array.isArray(pageRes?.items)) {
                allItems.push(...pageRes.items);
              }
            });
          }
          if (!ignore) {
            setStaffList(allItems);
            setTotalCount(total);
          }
        })
        .catch((err) => {
          if (!ignore) showError(err.message || "تعذر تحميل قائمة الموظفين");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [status, isSuperAdmin, showError]);

  // Handle email copy
  const handleCopyEmail = (email) => {
    navigator.clipboard
      .writeText(email)
      .then(() => {
        setCopiedEmail(email);
        showSuccess("تم نسخ البريد الإلكتروني");
        setTimeout(() => setCopiedEmail(null), 2000);
      })
      .catch(() => showError("تعذر النسخ"));
  };

  // KPI Calculations
  const statistics = useMemo(() => {
    const total = totalCount || staffList.length;
    const active = staffList.filter((s) => s.is_active).length;
    const inactive = staffList.filter((s) => !s.is_active).length;

    const roleCounts = {};
    STAFF_ROLES.forEach((r) => {
      roleCounts[r] = staffList.filter((s) => s.role === r).length;
    });

    return { total, active, inactive, roleCounts };
  }, [staffList, totalCount]);

  // CustomSelect options for role filter
  const roleOptions = useMemo(
    () => [
      { value: "all", label: `جميع الأدوار (${toArabicDigits(staffList.length)})` },
      ...STAFF_ROLES.map((r) => ({
        value: r,
        label: `${ROLE_LABELS[r]} (${toArabicDigits(statistics.roleCounts[r] || 0)})`,
      })),
    ],
    [staffList.length, statistics.roleCounts],
  );

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return staffList.filter((staff) => {
      // 1. Status Filter
      if (statusFilter === "active" && !staff.is_active) return false;
      if (statusFilter === "inactive" && staff.is_active) return false;

      // 2. Role Filter
      if (roleFilter !== "all" && staff.role !== roleFilter) return false;

      // 3. Search Query
      if (query) {
        const matchesName = staff.full_name?.toLowerCase().includes(query);
        const matchesEmail = staff.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      return true;
    });
  }, [staffList, searchInput, roleFilter, statusFilter]);

  // Paginated records for current view
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  // Filter change handlers that reset pagination
  const handleSearchChange = (val) => {
    setSearchInput(val);
    setCurrentPage(1);
  };

  const handleRoleChange = (val) => {
    setRoleFilter(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  // Handle Save from Editor Modal
  const handleEditorSaved = (savedStaff, isEdit, temporaryPassword) => {
    if (isEdit) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === savedStaff.id ? { ...s, ...savedStaff } : s)),
      );
    } else {
      setStaffList((prev) => [savedStaff, ...prev]);
      setTotalCount((prev) => prev + 1);

      // Open password success modal if password provided
      if (temporaryPassword) {
        setSuccessStaff(savedStaff);
        setSuccessTempPassword(temporaryPassword);
        setSuccessActionType("create");
        setSuccessPasswordModalOpen(true);
      }
    }
  };

  // Handle Password Reset Success
  const handleResetSuccess = (updatedStaff, temporaryPassword) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === updatedStaff.id ? { ...s, ...updatedStaff } : s)),
    );
    setResetModalOpen(false);

    setSuccessStaff(updatedStaff);
    setSuccessTempPassword(temporaryPassword);
    setSuccessActionType("reset");
    setSuccessPasswordModalOpen(true);
  };

  // Handle Status Update Success
  const handleStatusSuccess = (updatedStaff) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === updatedStaff.id ? { ...s, is_active: updatedStaff.is_active } : s)),
    );
  };

  const handleDeleteSuccess = (deletedStaff) => {
    setStaffList((prev) => prev.filter((staff) => staff.id !== deletedStaff.id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    const remainingFilteredCount = filteredStaff.filter(
      (staff) => staff.id !== deletedStaff.id,
    ).length;
    const remainingPages = Math.max(1, Math.ceil(remainingFilteredCount / pageSize));
    setCurrentPage((page) => Math.min(page, remainingPages));
  };

  // Row Action Menu Items
  const getActionMenuItems = (staff) => {
    const isSelf = staff.id === user?.id;

    return [
      {
        id: "edit",
        label: "تعديل البيانات",
        icon: <Edit3 className="size-4" />,
        onClick: () => {
          setEditingStaff(staff);
          setEditorModalOpen(true);
        },
      },
      {
        id: "status",
        label: staff.is_active ? "تعطيل الحساب" : "تفعيل الحساب",
        icon: staff.is_active ? (
          <UserX className="size-4 text-rose-600" />
        ) : (
          <UserCheck className="size-4 text-emerald-600" />
        ),
        tone: staff.is_active ? "danger" : undefined,
        disabled: isSelf && staff.is_active,
        onClick: () => {
          setTargetStatusStaff(staff);
          setStatusModalOpen(true);
        },
      },
      {
        id: "reset-password",
        label: "إعادة تعيين كلمة المرور",
        icon: <KeyRound className="size-4 text-amber-600" />,
        onClick: () => {
          setTargetResetStaff(staff);
          setResetModalOpen(true);
        },
      },
      { divider: true },
      {
        id: "audit-log",
        label: "سجل تدقيق الموظف",
        icon: <History className="size-4 text-gold-dark" />,
        onClick: () => {
          setTargetAuditStaff(staff);
          setAuditModalOpen(true);
        },
      },
      { divider: true },
      {
        id: "delete",
        label: isSelf ? "لا يمكن حذف حسابك الحالي" : "حذف الموظف نهائيًا",
        icon: <Trash2 className="size-4 text-rose-600" />,
        tone: "danger",
        disabled: isSelf,
        onClick: () => {
          if (staff.is_active) {
            showError("يجب تعطيل حساب الموظف أولًا قبل حذفه.");
            return;
          }
          setTargetDeleteStaff(staff);
          setDeleteModalOpen(true);
        },
      },
    ];
  };

  // Unauthorized Screen
  if (status !== "loading" && !isSuperAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 text-center animate-elem-fade-up"
        dir="rtl"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 shadow-2xs mb-4">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-lg font-black text-ink">غير مصرح لك بالوصول إلى هذا القسم</h2>
        <p className="mt-1 text-xs sm:text-sm text-muted max-w-md">
          إدارة حسابات فريق العمل والأدوار الوظيفية مقتصرة حصراً على «مدير النظام» (Super Admin).
        </p>
        <Link
          href="/admin"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-5 py-2.5 text-xs font-bold text-ink shadow-btn hover:brightness-110 transition-all cursor-pointer"
        >
          <span>العودة للوحة التحكم الرئيسية</span>
          <ChevronLeft className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6" dir="rtl">
      {/* 1. Header with Actions */}
      <PageHeader
        title="إدارة الموظفين"
        description="إدارة حسابات فريق العمل، الأدوار الوظيفية، الصلاحيات، وحالة الحسابات"
        className="sm:!flex-col 2xl:!flex-row"
        badge={
          <span className="rounded-full border border-gold/40 bg-gold-tint px-3 py-0.5 text-xs font-black text-gold-dark shadow-2xs">
            {toArabicDigits(statistics.total)} موظف
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchStaff(true)}
              disabled={refreshing || loading}
              className="flex size-11 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="تحديث البيانات"
            >
              <RotateCcw className={`size-4 ${refreshing ? "animate-spin text-gold-dark" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingStaff(null);
                setEditorModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gold-gradient px-5 py-3 text-xs sm:text-sm font-black text-ink shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.35)] transition-all duration-300 hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <UserPlus className="size-4 stroke-[2.5]" />
              <span>إضافة موظف جديد</span>
            </button>
          </div>
        }
      />

      {/* 2. Statistics KPIs Cards */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4 animate-elem-fade-up">
        {/* Card 1: Total Staff */}
        <div className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-gold/50 transition-all">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="min-w-0 text-xs font-bold text-muted">إجمالي فريق العمل</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-gold-tint border border-gold/30 text-gold-dark shadow-2xs">
              <Users className="size-4" />
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl sm:text-2xl font-black text-ink font-mono">
              {toArabicDigits(statistics.total)}
            </span>
            <span className="text-[11px] text-muted">حساب مسجل</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>الصلاحيات المعتمدة</span>
            <span className="font-bold text-ink">مفعلة</span>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">الحسابات النشطة</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {toArabicDigits(statistics.active)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold">نشط ومفعل</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>الوصول للوحة</span>
            <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Deactivated Accounts */}
        <div className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">الحسابات المعطلة</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs">
              <UserX className="size-4" />
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
              {toArabicDigits(statistics.inactive)}
            </span>
            <span className="text-[11px] text-rose-700 font-bold">محظور مؤقتاً</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>تسجيل الدخول</span>
            <span className="font-bold text-rose-600">ممنوع</span>
          </div>
        </div>

        {/* Card 4: Super Admins */}
        <div className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-2xs hover:shadow-card hover:border-gold/50 transition-all">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-muted">مديرو النظام (Super Admin)</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-ink text-gold border border-gold/30 shadow-2xs">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl sm:text-2xl font-black text-ink font-mono">
              {toArabicDigits(statistics.roleCounts.super_admin || 0)}
            </span>
            <span className="text-[11px] text-muted">مدير نظام</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>كامل الصلاحيات</span>
            <span className="font-bold text-gold-dark">إداري كامل</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Role Filter, & Status Filter */}
      <div className="flex min-w-0 flex-col items-stretch gap-3.5 animate-elem-fade-up 2xl:flex-row 2xl:items-center 2xl:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-page/80 border border-line shadow-2xs w-full 2xl:w-auto">
          {[
            { id: "all", label: "جميع الموظفين", shortLabel: "الكل", count: statistics.total },
            { id: "active", label: "النشطون فقط", shortLabel: "النشطون", count: statistics.active },
            { id: "inactive", label: "المعطلون فقط", shortLabel: "المعطلون", count: statistics.inactive },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`group relative flex min-w-0 flex-1 2xl:flex-initial items-center justify-center gap-1 sm:gap-2 rounded-xl px-1.5 sm:px-4 py-2 text-[11px] sm:text-xs font-bold cursor-pointer transition-all duration-200 select-none whitespace-nowrap active:scale-[0.98] ${
                  isActive
                    ? "bg-gold-gradient text-ink font-black shadow-btn shadow-[0_4px_14px_rgba(201,162,74,0.3)] border border-gold/60"
                    : "bg-white text-muted border border-line shadow-2xs hover:border-gold/60 hover:text-gold-dark hover:bg-gold-tint/50"
                }`}
              >
                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold font-mono shrink-0 transition-colors ${
                    isActive
                      ? "bg-ink text-gold border border-gold/40 shadow-xs"
                      : "bg-page text-muted border border-line/60"
                  }`}
                >
                  {toArabicDigits(tab.count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search and Role Dropdown */}
        <div className="flex min-w-0 w-full flex-col items-stretch gap-2.5 xl:flex-row xl:items-center 2xl:w-auto">
          {/* Role Filter — CustomSelect matching site design */}
            <div className="min-w-0 w-full xl:w-64 xl:flex-none 2xl:w-56">
            <CustomSelect
              id="staff-role-filter"
              placeholder="جميع الأدوار"
              options={roleOptions}
              value={roleFilter}
              onChange={(val) => handleRoleChange(val)}
            />
          </div>

          {/* Search Input — h-14, border-border, gold focus shadow */}
          <div className="relative w-full min-w-0 xl:flex-1 2xl:w-72 2xl:flex-none">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="h-14 w-full rounded-2xl border border-border bg-white pr-4 pl-12 text-right text-xs sm:text-sm font-medium text-ink shadow-none placeholder:text-muted/60 transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)]"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <Search className="size-4" />
            </span>
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute left-10 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-lg text-xs font-bold text-muted hover:text-ink hover:bg-page transition-colors duration-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Staff Records Container: Desktop Table & Mobile Cards */}
      <div className="rounded-3xl border border-line bg-white shadow-2xs overflow-hidden animate-elem-fade-up">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={() => <Users className="size-8" />}
              title="لم يتم العثور على موظفين"
              description={
                searchInput || roleFilter !== "all" || statusFilter !== "all"
                  ? "لا توجد نتائج تطابق معايير البحث والفلترة المحددة."
                  : "لم يتم تسجيل أي موظفين في النظام بعد."
              }
              action={
                searchInput || roleFilter !== "all" || statusFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gold-tint border border-gold/40 px-4 py-2 text-xs font-bold text-gold-dark hover:bg-gold-tint/80 hover:border-gold hover:text-ink transition-all duration-200 cursor-pointer"
                  >
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden 2xl:block w-full">
              <table className="w-full text-right text-xs table-fixed">
                <thead>
                  <tr className="border-b border-line bg-page/60 text-muted font-bold select-none">
                    <th className="py-4 pr-6 pl-3 w-[24%]">الموظف</th>
                    <th className="py-4 px-3 w-[26%]">البريد الإلكتروني</th>
                    <th className="py-4 px-3 w-[16%]">الدور الوظيفي</th>
                    <th className="py-4 px-3 w-[12%] text-center">حالة الحساب</th>
                    <th className="py-4 px-3 w-[14%]">آخر تسجيل دخول</th>
                    <th className="py-4 pr-3 pl-6 w-[8%] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {paginatedRecords.map((staff) => {
                    const isSelf = staff.id === user?.id;
                    const menuItems = getActionMenuItems(staff);

                    return (
                      <tr
                        key={staff.id}
                        className="group transition-colors hover:bg-gold-tint/25"
                      >
                        {/* Name + Initials */}
                        <td className="py-4 pr-6 pl-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink font-bold text-gold text-xs shadow-2xs">
                              {getInitials(staff.full_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-ink text-sm truncate">
                                  {staff.full_name}
                                </span>
                                {isSelf && (
                                  <span className="shrink-0 rounded-full bg-gold-tint border border-gold/40 px-2 py-0.5 text-[10px] font-bold text-gold-dark">
                                    حسابك
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-1.5 font-mono text-muted group-hover:text-ink transition-colors">
                            <span className="truncate dir-ltr">{staff.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(staff.email)}
                              className="size-6 shrink-0 flex items-center justify-center rounded-lg text-muted/60 hover:text-gold-dark hover:bg-gold-tint/50 transition-all cursor-pointer"
                              title="نسخ البريد الإلكتروني"
                            >
                              {copiedEmail === staff.email ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-3">
                          <RoleBadge role={staff.role} />
                        </td>

                        {/* Active Status */}
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border select-none whitespace-nowrap ${
                              staff.is_active
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                staff.is_active ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                            <span>{staff.is_active ? "نشط ومفعل" : "معطل مؤقتاً"}</span>
                          </span>
                        </td>

                        {/* Last Login Date */}
                        <td className="py-4 px-3 text-muted text-[11px] truncate">
                          {formatStaffDate(staff.last_login_at)}
                        </td>

                        {/* Action Menu */}
                        <td className="py-4 pr-3 pl-6 text-center">
                          <ActionDropdown items={menuItems} label={`إجراءات ${staff.full_name}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block 2xl:hidden divide-y divide-line/60">
              {paginatedRecords.map((staff) => {
                const isSelf = staff.id === user?.id;
                const menuItems = getActionMenuItems(staff);

                return (
                  <div key={staff.id} className="p-4 space-y-3 hover:bg-gold-tint/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink font-bold text-gold text-xs shadow-2xs">
                          {getInitials(staff.full_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink text-sm break-words">
                              {staff.full_name}
                            </span>
                            {isSelf && (
                              <span className="shrink-0 rounded-full bg-gold-tint border border-gold/40 px-2 py-0.5 text-[10px] font-bold text-gold-dark">
                                حسابك
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-muted block break-all dir-ltr">
                            {staff.email}
                          </span>
                        </div>
                      </div>

                      <ActionDropdown items={menuItems} label={`إجراءات ${staff.full_name}`} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/40 text-xs">
                      <RoleBadge role={staff.role} />

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          staff.is_active
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            staff.is_active ? "bg-emerald-600" : "bg-rose-600"
                          }`}
                        />
                        <span>{staff.is_active ? "نشط" : "معطل"}</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-muted flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span>آخر تسجيل دخول:</span>
                      <span className="font-mono">{formatStaffDate(staff.last_login_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-t border-line bg-page/30 text-xs">
                <span className="text-muted">
                  عرض {toArabicDigits(paginatedRecords.length)} من أصل{" "}
                  {toArabicDigits(filteredStaff.length)} موظف
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex size-8 items-center justify-center rounded-xl border border-line bg-white text-muted transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight className="size-4" />
                  </button>

                  <span className="font-mono font-bold text-ink px-2">
                    {toArabicDigits(currentPage)} / {toArabicDigits(totalPages)}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex size-8 items-center justify-center rounded-xl border border-line bg-white text-muted transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="الصفحة التالية"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Modals */}
      {/* A. Editor Modal (Create / Edit) */}
      <StaffEditorModal
        isOpen={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        item={editingStaff}
        onSaved={handleEditorSaved}
      />

      {/* B. Reset Password Modal */}
      <StaffResetPasswordModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        staffMember={targetResetStaff}
        onSuccess={handleResetSuccess}
      />

      {/* C. Status Modal (Activate / Deactivate confirmation) */}
      <StaffStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        staffMember={targetStatusStaff}
        currentUserId={user?.id}
        onSuccess={handleStatusSuccess}
      />

      {/* D. Audit Log Modal */}
      <StaffAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        staffMember={targetAuditStaff}
      />

      {/* E. Individual Staff Deletion Confirmation */}
      <StaffDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetDeleteStaff(null);
        }}
        staffMember={targetDeleteStaff}
        onSuccess={handleDeleteSuccess}
        onNotFound={() => fetchStaff(true)}
      />

      {/* F. Temporary Password Success Display Modal */}
      <StaffSuccessPasswordModal
        isOpen={successPasswordModalOpen}
        onClose={() => {
          setSuccessPasswordModalOpen(false);
          setSuccessStaff(null);
          setSuccessTempPassword("");
        }}
        staffMember={successStaff}
        password={successTempPassword}
        actionType={successActionType}
      />
    </div>
  );
}
