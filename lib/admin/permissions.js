import { ROLE_PERMISSIONS, hasPermission } from "../auth/permissions.js";

export { ROLE_PERMISSIONS, hasPermission };

export const ROLE_LABELS = Object.freeze({
  super_admin: "مدير النظام",
  news_editor: "محرر الأخبار",
  news_reviewer: "مراجع الأخبار",
});

export const ALL_ROLES = Object.keys(ROLE_LABELS);

export const SECTION_GROUPS = Object.freeze([
  { id: "main", label: "الرئيسية" },
  { id: "requests", label: "الطلبات" },
  { id: "content", label: "المحتوى" },
  { id: "management", label: "الإدارة" },
]);

export const SECTIONS = Object.freeze([
  {
    id: "overview",
    label: "نظرة عامة",
    route: "/admin",
    icon: "overview",
    group: "main",
    description: "لوحة التحكم الرئيسية والروابط السريعة",
    allowedRoles: ALL_ROLES,
  },
  {
    id: "applications",
    label: "طلبات الانضمام",
    route: "/admin/applications",
    icon: "applications",
    group: "requests",
    description: "إدارة ومراجعة طلبات الانضمام والعضوية بالحزب",
    allowedRoles: ["super_admin"],
  },
  {
    id: "service-requests",
    label: "طلبات الخدمات",
    route: "/admin/service-requests",
    icon: "service-requests",
    group: "requests",
    description: "متابعة طلبات المواطنين الموجهة للوزارات والقطاعات",
    allowedRoles: ["super_admin"],
  },
  {
    id: "news",
    label: "الأخبار",
    route: "/admin/news",
    icon: "news",
    group: "content",
    description: "تحرير ومراجعة ونشر المقالات والأخبار الصحفية",
    allowedRoles: ["super_admin", "news_editor", "news_reviewer"],
  },
  {
    id: "content",
    label: "المحتوى التنظيمي",
    route: "/admin/content",
    icon: "content",
    group: "content",
    description: "إدارة تشكيلات الأمانات، القيادات، والهيئة البرلمانية",
    allowedRoles: ["super_admin"],
  },
  {
    id: "news-sources",
    label: "مصادر الأخبار",
    route: "/admin/news-sources",
    icon: "news-sources",
    group: "content",
    description: "إدارة الصحف والمصادر الإخبارية المعتمدة",
    allowedRoles: ["super_admin"],
  },
  {
    id: "catalogs",
    label: "الوزارات والقطاعات",
    route: "/admin/catalogs",
    icon: "catalogs",
    group: "management",
    description: "إدارة كتالوج الوزارات والقطاعات الخدمية",
    allowedRoles: ["super_admin"],
  },
  {
    id: "staff",
    label: "الموظفون",
    route: "/admin/staff",
    icon: "staff",
    group: "management",
    description: "إدارة حسابات فريق العمل والأدوار والصلاحيات",
    allowedRoles: ["super_admin"],
  },
  {
    id: "audit-log",
    label: "سجل التدقيق",
    route: "/admin/audit-log",
    icon: "audit-log",
    group: "management",
    description: "متابعة سجل العمليات الأمنية والإدارية في النظام",
    allowedRoles: ["super_admin"],
  },
  {
    id: "account",
    label: "حسابي",
    route: "/admin/account",
    icon: "account",
    group: "account",
    description: "الملف الشخصي وتغيير كلمة المرور",
    allowedRoles: ALL_ROLES,
  },
]);

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? "موظف";
}

export function sectionsForRole(role) {
  if (!role || !ROLE_LABELS[role]) {
    return SECTIONS.filter((s) => s.id === "account");
  }
  return SECTIONS.filter((s) => s.allowedRoles.includes(role));
}

export function groupedSectionsForRole(role) {
  const allowed = sectionsForRole(role);
  return SECTION_GROUPS.map((group) => ({
    ...group,
    sections: allowed.filter((s) => s.group === group.id),
  })).filter((group) => group.sections.length > 0);
}

export function canAccess(role, sectionOrPermission) {
  if (!role || !ROLE_LABELS[role]) return false;
  if (sectionOrPermission.includes(":")) {
    return hasPermission(role, sectionOrPermission);
  }
  const section = SECTIONS.find((s) => s.id === sectionOrPermission);
  if (!section) return false;
  return section.allowedRoles.includes(role);
}

export function canAccessPath(role, pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  const section = SECTIONS.find((s) => s.route === normalized);
  if (!section) {
    const matched = SECTIONS.find(
      (s) => s.route !== "/admin" && normalized.startsWith(s.route),
    );
    if (matched) return canAccess(role, matched.id);
    return true;
  }
  return canAccess(role, section.id);
}
