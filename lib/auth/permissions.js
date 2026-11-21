export const ROLES = Object.freeze([
  "super_admin",
  "membership_officer",
  "service_officer",
  "content_editor",
  "news_editor",
  "news_reviewer",
]);

const ALL_PERMISSIONS = Object.freeze([
  "applications:read",
  "applications:update",
  "applications:export",
  "services:manage",
  "content:manage",
  "news:write",
  "news:submit",
  "news:read_all",
  "news:read_own",
  "news:review",
  "staff:manage",
  "records:delete",
  "organization:manage",
]);

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: ALL_PERMISSIONS,
  membership_officer: Object.freeze([
    "applications:read",
    "applications:update",
  ]),
  service_officer: Object.freeze(["services:manage"]),
  content_editor: Object.freeze(["content:manage"]),
  news_editor: Object.freeze([
    "news:write",
    "news:submit",
    "news:read_own",
  ]),
  news_reviewer: Object.freeze([
    "news:write",
    "news:read_all",
    "news:review",
  ]),
});

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
