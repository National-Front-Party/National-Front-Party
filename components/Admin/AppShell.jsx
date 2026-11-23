"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useToast } from "@/lib/admin/toast-context";
import {
  canAccessPath,
  groupedSectionsForRole,
  canAccess,
} from "@/lib/admin/permissions";
import { adminFetch } from "@/lib/admin/api";
import { NavIcon } from "./AdminIcons";
import { RoleBadge } from "./ui/Badge";
import Spinner from "./ui/Spinner";

function getInitials(name) {
  if (!name) return "م";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0);
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
}

// Convert numbers to Arabic-Indic digits
function toArabicDigits(num) {
  if (num === null || num === undefined) return "٠";
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// Claude-style Sidebar Toggle Icon
function ClaudePanelIcon({ collapsed, className = "size-5" }) {
  return (
    <svg
      className={`transition-transform duration-300 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2.5" />
      <line x1="15" y1="3" x2="15" y2="21" />
      {collapsed ? (
        <polyline points="11 9 8 12 11 15" />
      ) : (
        <polyline points="8 9 11 12 8 15" />
      )}
    </svg>
  );
}

let sidebarCollapsedListeners = [];
function subscribeSidebar(listener) {
  sidebarCollapsedListeners.push(listener);
  return () => {
    sidebarCollapsedListeners = sidebarCollapsedListeners.filter((l) => l !== listener);
  };
}
function emitSidebar() {
  for (const listener of sidebarCollapsedListeners) {
    listener();
  }
}
function getSidebarSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("nfp_admin_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}
function getSidebarServerSnapshot() {
  return false;
}

export default function AppShell({ children }) {
  const { user, status, logout } = useAdminAuth();
  const { showError } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  // Collapsed state persisted in localStorage via useSyncExternalStore
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Badge counts for requests
  const [badgeCounts, setBadgeCounts] = useState({
    applications: 0,
    serviceRequests: 0,
  });

  const toggleCollapsed = useCallback(() => {
    try {
      const current = localStorage.getItem("nfp_admin_sidebar_collapsed") === "true";
      localStorage.setItem("nfp_admin_sidebar_collapsed", String(!current));
    } catch {
      // Ignore localStorage errors
    }
    emitSidebar();
  }, []);

  // Fetch real badge counts for new requests if role has access
  useEffect(() => {
    if (status !== "authenticated" || !user?.role) return;

    let mounted = true;
    const fetchBadges = async () => {
      const counts = { applications: 0, serviceRequests: 0 };

      if (canAccess(user.role, "applications")) {
        try {
          const res = await adminFetch(
            "/api/admin/applications?status=new&page=1&page_size=1",
            { skipAuthRedirect: true },
          );
          if (res?.pagination?.total !== undefined) {
            counts.applications = res.pagination.total;
          }
        } catch {
          // Ignore
        }
      }

      if (canAccess(user.role, "service-requests")) {
        try {
          const res = await adminFetch(
            "/api/admin/service-requests?status=new&page=1&page_size=1",
            { skipAuthRedirect: true },
          );
          if (res?.pagination?.total !== undefined) {
            counts.serviceRequests = res.pagination.total;
          }
        } catch {
          // Ignore
        }
      }

      if (mounted) {
        setBadgeCounts(counts);
      }
    };

    fetchBadges();
    return () => {
      mounted = false;
    };
  }, [status, user?.role]);

  // Close mobile drawer on route change
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Close the mobile drawer with Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auth & Permissions routing checks
  useEffect(() => {
    if (status === "loading") return;

    if (status === "anonymous") {
      if (pathname && pathname !== "/admin/login") {
        const nextParam = encodeURIComponent(pathname);
        router.push(`/admin/login?next=${nextParam}&reason=expired`);
      }
      return;
    }

    if (status === "authenticated" && user) {
      if (user.mustChangePassword && pathname !== "/admin/change-password") {
        router.push("/admin/change-password");
        return;
      }

      if (!canAccessPath(user.role, pathname)) {
        showError("ليس لديك صلاحية للوصول إلى هذه الصفحة");
        router.replace("/admin");
      }
    }
  }, [status, user, pathname, router, showError]);

  // Handle logout
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      router.push("/admin/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // 1. If on login page, render children cleanly
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // 2. Full-page branded loading state (always keep children in tree for Next.js instant navigation validation)
  if (
    status === "loading" ||
    (status === "anonymous" && !pathname.startsWith("/admin/login"))
  ) {
    return (
      <div className="relative min-h-screen w-full bg-ink text-white" dir="rtl">
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink">
          <div className="flex flex-col items-center gap-5">
            <div className="relative h-16 w-52">
              <Image
                src="/logo.png"
                alt="حزب الجبهة الوطنية"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-gold/30 bg-surface-dark/80 px-5 py-2 text-xs text-gold">
              <Spinner size="sm" color="gold" />
              <span>جاري التحقق من الجلسة...</span>
            </div>
          </div>
        </div>
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </div>
    );
  }

  // 3. Forced password change focused shell
  if (user?.mustChangePassword || pathname === "/admin/change-password") {
    return (
      <div className="flex min-h-screen min-h-svh min-w-0 flex-col overflow-x-clip bg-page text-ink" dir="rtl">
        <header className="sticky top-0 z-30 flex shrink-0 flex-col gap-3 border-b border-line bg-white px-4 py-3 shadow-xs sm:min-h-20 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start sm:gap-4">
            <div className="relative h-10 w-36 shrink-0 sm:h-12 sm:w-44">
              <Image
                src="/logo.png"
                alt="حزب الجبهة الوطنية"
                fill
                className="object-contain object-right"
                priority
              />
            </div>
            <span className="rounded-lg border border-gold/30 bg-gold-tint px-2.5 py-1 text-center text-[11px] font-bold text-gold-dark sm:px-3 sm:text-xs">
              تغيير كلمة المرور
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start sm:gap-4">
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink sm:flex-none" title={user?.fullName}>{user?.fullName}</span>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
            >
              <svg
                className="size-4 rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 w-full flex-1 px-4 py-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    );
  }

  const groupedSections = groupedSectionsForRole(user?.role);

  return (
    <div className="flex min-h-screen bg-page text-ink antialiased" dir="rtl">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (272px expanded / 80px collapsed, sticky to viewport) */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 flex h-dvh max-h-screen flex-col border-l border-line bg-white shadow-card transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:z-40 ${
          collapsed ? "lg:w-20" : "lg:w-[272px]"
        } ${
          mobileOpen ? "translate-x-0 w-72" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header: Logo + Title + Claude-style panel toggle on inner edge */}
        <div
          className={`flex h-20 shrink-0 items-center border-b border-line px-4 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {collapsed ? (
            /* Icon-only logo / toggle when collapsed */
            <button
              type="button"
              onClick={toggleCollapsed}
              title="توسيع القائمة الجانبية"
              aria-label="توسيع القائمة الجانبية"
              aria-expanded={false}
              className="flex size-10 items-center justify-center rounded-xl text-muted hover:scale-105 hover:bg-gold-tint hover:text-gold-dark transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <ClaudePanelIcon collapsed={true} className="size-5" />
            </button>
          ) : (
            <>
              {/* Logo Only (Party emblem + calligraphy image, NO adjacent text per user specification) */}
              <Link
                href="/admin"
                className="flex items-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl py-1 pr-1"
                aria-label="شعار حزب الجبهة الوطنية"
              >
                <div className="relative h-11 w-44 shrink-0">
                  <Image
                    src="/logo.png"
                    alt="شعار حزب الجبهة الوطنية"
                    fill
                    sizes="(max-width: 768px) 176px, 176px"
                    className="object-contain object-right"
                    priority
                  />
                </div>
              </Link>

              {/* Claude-style panel toggle button on inner edge */}
              <button
                type="button"
                onClick={toggleCollapsed}
                title="طي القائمة الجانبية"
                aria-label="طي القائمة الجانبية"
                aria-expanded={true}
                className="hidden lg:flex size-10 items-center justify-center rounded-xl text-muted hover:scale-105 hover:bg-gold-tint hover:border hover:border-gold/30 hover:text-gold-dark transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <ClaudePanelIcon collapsed={false} className="size-5" />
              </button>

              {/* Mobile Drawer Close Button */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق القائمة الجانبية"
                className="flex lg:hidden size-10 items-center justify-center rounded-xl text-muted hover:bg-gray-100 transition-colors"
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [scrollbar-width:thin] [scrollbar-color:#c9a24b_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold/30 hover:[&::-webkit-scrollbar-thumb]:bg-gold/60"
          aria-label="أقسام لوحة التحكم"
        >
          {groupedSections.map((group) => (
            <div key={group.id} className="space-y-1">
              {/* Group Header (Hidden when collapsed) */}
              {!collapsed && (
                <p className="px-3 pb-1 text-[11px] font-bold tracking-wider text-muted/70 select-none">
                  {group.label}
                </p>
              )}

              {/* Group Links */}
              {group.sections.map((section) => {
                const isActive =
                  section.route === "/admin"
                    ? pathname === "/admin"
                    : pathname === section.route || pathname.startsWith(`${section.route}/`);

                // Badge count for requests
                const badgeCount =
                  section.id === "applications"
                    ? badgeCounts.applications
                    : section.id === "service-requests"
                    ? badgeCounts.serviceRequests
                    : 0;

                return (
                  <Link
                    key={section.id}
                    href={section.route}
                    title={collapsed ? section.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-bold transition-all duration-200 ${
                      collapsed ? "justify-center px-0" : ""
                    } ${
                      isActive
                        ? "bg-gold-tint text-gold-dark border border-gold/50 shadow-xs"
                        : "text-muted hover:bg-[#FBF6E9]/60 hover:text-ink hover:translate-x-[-3px]"
                    }`}
                  >
                    <span
                      className={`relative shrink-0 transition-colors ${
                        isActive
                          ? "text-gold-dark"
                          : "text-muted group-hover:text-gold-dark"
                      }`}
                    >
                      <NavIcon name={section.icon} className="size-5" />

                      {/* Dot badge on icon when collapsed */}
                      {collapsed && badgeCount > 0 && (
                        <span
                          className="absolute -top-1 -left-1 size-2 rounded-full bg-gold animate-pulse motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      )}
                    </span>

                    {/* Section Label & Counter Badge (Visible when expanded) */}
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <span className="truncate">{section.label}</span>

                        {badgeCount > 0 && (
                          <span className="shrink-0 rounded-full bg-gold-tint border border-gold/40 px-2 py-0.5 text-[10px] font-black text-gold-dark">
                            {toArabicDigits(badgeCount)}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Bottom: "حسابي" link + User Card with Logout button */}
        <div className="shrink-0 border-t border-line p-3 space-y-2">
          {/* Link: "حسابي" */}
          <Link
            href="/admin/account"
            title={collapsed ? "حسابي" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
              collapsed ? "justify-center px-0" : ""
            } ${
              pathname === "/admin/account"
                ? "bg-gold-tint text-gold-dark border-r-4 border-gold"
                : "text-muted hover:bg-[#FBF6E9]/60 hover:text-ink hover:translate-x-[-3px]"
            }`}
          >
            <span
              className={`shrink-0 ${
                pathname === "/admin/account"
                  ? "text-gold-dark"
                  : "text-muted hover:text-gold-dark"
              }`}
            >
              <NavIcon name="account" className="size-5" />
            </span>
            {!collapsed && <span>حسابي</span>}
          </Link>

          {/* User Card (The ONLY place where user details are shown) */}
          <div
            className={`rounded-2xl border border-line bg-page/70 p-2.5 transition-all duration-200 ${
              collapsed ? "flex flex-col items-center gap-2 p-2" : "flex items-center justify-between gap-2"
            }`}
          >
            {/* Avatar + User Info */}
            <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "justify-center" : ""}`}>
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink font-bold text-gold text-xs shadow-xs"
                title={user?.fullName}
              >
                {getInitials(user?.fullName)}
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink leading-tight">
                    {user?.fullName}
                  </p>
                  <div className="mt-1">
                    <RoleBadge role={user?.role} size="sm" />
                  </div>
                </div>
              )}
            </div>

            {/* Logout Icon Button (Inside User Card on the inner edge) */}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-white text-red-600 shadow-2xs hover:bg-red-50 hover:border-red-300 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <Spinner size="sm" color="ink" />
              ) : (
                <svg
                  className="size-4.5 rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-white/95 px-6 sm:px-10 shadow-xs backdrop-blur-xs">
          {/* Page title and mobile navigation toggle */}
          <div className="flex items-center gap-3.5">
            {/* Mobile Hamburger Drawer Trigger (Mobile Only) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة الجانبية"
              className="flex lg:hidden size-11 items-center justify-center rounded-2xl border border-border text-ink hover:border-gold hover:bg-gold-tint/30 transition-all duration-200"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div>
              <p className="text-[11px] font-bold text-muted/70 leading-none">
                لوحة التحكم
              </p>
              <h1 className="text-lg font-extrabold text-ink sm:text-xl mt-1 leading-tight">
                نظرة عامة
              </h1>
            </div>
          </div>

        </header>

        {/* Content Body */}
        <main className="flex-1 px-6 sm:px-10 py-8 space-y-6">{children}</main>
      </div>
    </div>
  );
}
