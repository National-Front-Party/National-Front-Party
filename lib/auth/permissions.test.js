import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, ROLE_PERMISSIONS, ROLES } from "./permissions.js";

test("maps every documented staff role to its permissions", () => {
  assert.deepEqual(ROLES, [
    "super_admin",
    "news_editor",
    "news_reviewer",
  ]);
  for (const permission of [
    "applications:read", "applications:update", "applications:export",
    "services:manage", "content:manage", "staff:manage", "records:delete",
  ]) assert.equal(hasPermission("super_admin", permission), true);
  assert.equal(hasPermission("news_editor", "news:submit"), true);
  assert.equal(hasPermission("news_editor", "applications:read"), false);
  assert.equal(hasPermission("news_editor", "services:manage"), false);
  assert.equal(hasPermission("news_editor", "content:manage"), false);
  assert.equal(hasPermission("news_editor", "news:submit"), true);
  assert.equal(hasPermission("news_editor", "news:review"), false);
  assert.equal(hasPermission("news_editor", "news:read_all"), false);
  assert.equal(hasPermission("news_reviewer", "news:review"), true);
  assert.equal(hasPermission("news_reviewer", "news:read_all"), true);
  assert.equal(hasPermission("news_reviewer", "news:write"), false);
  assert.equal(hasPermission("news_editor", "news:write"), true);
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
    ],
    news_editor: ["news:write", "news:submit", "news:read_own"],
    news_reviewer: ["news:read_all", "news:review"],
  });
});

test("admin navigation is complete and news roles stay limited to News", async () => {
  const { sectionsForRole } = await import("../admin/permissions.js");
  const adminSections = sectionsForRole("super_admin").map(({ id }) => id);
  assert.deepEqual(adminSections, [
    "overview", "applications", "service-requests", "news", "content",
    "news-sources", "catalogs", "staff", "audit-log", "account",
  ]);
  for (const section of ["applications", "service-requests", "content", "catalogs", "news", "staff", "audit-log"]) {
    assert.ok(adminSections.includes(section), `super_admin should access ${section}`);
  }
  for (const role of ["news_editor", "news_reviewer"]) {
    assert.deepEqual(sectionsForRole(role).map(({ id }) => id), ["overview", "news", "account"]);
  }
});

test("unknown roles and permissions have no grants", () => {
  assert.equal(hasPermission("unknown_role", "records:delete"), false);
  assert.equal(hasPermission("super_admin", "unknown:permission"), false);
});
