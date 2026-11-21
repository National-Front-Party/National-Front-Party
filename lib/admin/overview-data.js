import { canAccess } from "./permissions.js";

export async function loadAdminOverviewData(role, {
  adminFetch,
  publicFetch = (...args) => fetch(...args),
  statusConfigMap,
  appKindLabels,
  fallbackLabels,
}) {
  const nextStats = {
    applicationsTotal: null,
    serviceRequestsTotal: null,
    publishedNewsTotal: null,
    staffTotal: null,
  };
  const requestsList = [];
  let acceptedApps = 0;
  let completedSrv = 0;

  if (canAccess(role, "applications")) {
    try {
      const result = await adminFetch("/api/admin/applications?page=1&page_size=6", { skipAuthRedirect: true });
      nextStats.applicationsTotal = result?.pagination?.total ?? result?.total ?? null;
      if (typeof nextStats.applicationsTotal !== "number") nextStats.applicationsTotal = null;
      if (Array.isArray(result?.applications)) result.applications.forEach((app) => requestsList.push({
        id: `app-${app.id}`, name: app.full_name,
        type: appKindLabels[app.type] || fallbackLabels.applicationType,
        status: statusConfigMap[app.status]?.label || fallbackLabels.reviewStatus,
        rawStatus: app.status, createdAt: app.created_at, href: "/admin/applications",
      }));
      if ((nextStats.applicationsTotal || 0) > 0) {
        try {
          const accepted = await adminFetch("/api/admin/applications?status=accepted&page=1&page_size=1", { skipAuthRedirect: true });
          const total = accepted?.pagination?.total ?? accepted?.total;
          if (typeof total === "number") acceptedApps = total;
        } catch {}
      }
    } catch {}
  }

  if (canAccess(role, "service-requests")) {
    try {
      const result = await adminFetch("/api/admin/service-requests?page=1&page_size=6", { skipAuthRedirect: true });
      nextStats.serviceRequestsTotal = result?.pagination?.total ?? result?.total ?? null;
      if (typeof nextStats.serviceRequestsTotal !== "number") nextStats.serviceRequestsTotal = null;
      if (Array.isArray(result?.service_requests)) result.service_requests.forEach((item) => requestsList.push({
        id: `srv-${item.id}`, name: item.full_name,
        type: item.sector?.name_ar || item.ministry?.name_ar || fallbackLabels.serviceType,
        status: statusConfigMap[item.status]?.label || fallbackLabels.reviewStatus,
        rawStatus: item.status, createdAt: item.created_at, href: "/admin/service-requests",
      }));
      if ((nextStats.serviceRequestsTotal || 0) > 0) {
        try {
          const completed = await adminFetch("/api/admin/service-requests?status=completed&page=1&page_size=1", { skipAuthRedirect: true });
          const total = completed?.pagination?.total ?? completed?.total;
          if (typeof total === "number") completedSrv = total;
        } catch {}
      }
    } catch {}
  }

  if (canAccess(role, "news")) {
    try {
      const result = await adminFetch("/api/admin/news/articles?status=published&page=1&page_size=1", { skipAuthRedirect: true });
      const total = result?.pagination?.total ?? result?.total;
      if (typeof total === "number") nextStats.publishedNewsTotal = total;
    } catch {
      try {
        const response = await publicFetch("/api/content/news?page=1&page_size=1");
        const result = await response.json();
        const total = result?.pagination?.total ?? result?.total;
        if (typeof total === "number") nextStats.publishedNewsTotal = total;
      } catch {}
    }
  }

  if (canAccess(role, "staff")) {
    try {
      const result = await adminFetch("/api/admin/staff?page=1&page_size=1", { skipAuthRedirect: true });
      const total = result?.total ?? result?.pagination?.total;
      if (typeof total === "number") nextStats.staffTotal = total;
    } catch {}
  }

  requestsList.sort((a, b) => {
    const pendingA = ["new", "under_review", "in_progress"].includes(a.rawStatus);
    const pendingB = ["new", "under_review", "in_progress"].includes(b.rawStatus);
    if (pendingA && !pendingB) return -1;
    if (!pendingA && pendingB) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const totalCount = (nextStats.applicationsTotal || 0) + (nextStats.serviceRequestsTotal || 0);
  const completionRate = totalCount > 0
    ? Math.min(100, Math.max(0, Math.round(((acceptedApps + completedSrv) / totalCount) * 100)))
    : 0;

  return { stats: nextStats, recentRequests: requestsList.slice(0, 4), completionRate };
}
