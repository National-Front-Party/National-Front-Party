export const ROLES = Object.freeze([
  "super_admin",
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
]);

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: ALL_PERMISSIONS,
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
