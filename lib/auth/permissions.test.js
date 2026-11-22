import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, ROLE_PERMISSIONS, ROLES } from "./permissions.js";

test("maps every documented staff role to its permissions", () => {
  assert.deepEqual(ROLES, [
    "super_admin",
    "membership_officer",
    "service_officer",
    "content_editor",
    "news_editor",
    "news_reviewer",
  ]);
  assert.equal(hasPermission("super_admin", "records:delete"), true);
  assert.equal(hasPermission("super_admin", "organization:manage"), true);
  assert.equal(hasPermission("membership_officer", "organization:manage"), false);
  assert.equal(hasPermission("service_officer", "organization:manage"), false);
  assert.equal(hasPermission("content_editor", "organization:manage"), false);
  assert.equal(hasPermission("news_editor", "organization:manage"), false);
  assert.equal(hasPermission("news_reviewer", "organization:manage"), false);
  assert.equal(hasPermission("membership_officer", "applications:read"), true);
  assert.equal(hasPermission("membership_officer", "applications:export"), false);
  assert.equal(hasPermission("service_officer", "services:manage"), true);
  assert.equal(hasPermission("content_editor", "content:manage"), true);
  assert.equal(hasPermission("news_editor", "news:submit"), true);
  assert.equal(hasPermission("news_editor", "news:review"), false);
  assert.equal(hasPermission("news_editor", "news:read_all"), false);
  assert.equal(hasPermission("news_reviewer", "news:review"), true);
  assert.equal(hasPermission("news_reviewer", "news:read_all"), true);
  assert.equal(Object.hasOwn(ROLE_PERMISSIONS, "unknown_role"), false);
  assert.deepEqual(ROLE_PERMISSIONS, {
    super_admin: [
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
    ],
    membership_officer: ["applications:read", "applications:update"],
    service_officer: ["services:manage"],
    content_editor: ["content:manage"],
    news_editor: ["news:write", "news:submit", "news:read_own"],
    news_reviewer: ["news:write", "news:read_all", "news:review"],
  });
});

test("unknown roles and permissions have no grants", () => {
  assert.equal(hasPermission("unknown_role", "records:delete"), false);
  assert.equal(hasPermission("super_admin", "unknown:permission"), false);
});
