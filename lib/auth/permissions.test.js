import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, ROLE_PERMISSIONS, ROLES } from "./permissions.js";
import { canAccessPath, ROLE_LABELS, SECTIONS } from "../admin/permissions.js";
import { STAFF_ROLES } from "../admin/staff-utils.js";

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
  assert.equal(hasPermission("super_admin", "records:delete"), true);
  assert.equal(hasPermission("super_admin", "organization:manage"), true);
  for (const role of ["membership_officer", "service_officer", "content_editor"]) {
    assert.equal(hasPermission(role, "organization:manage"), false);
    assert.equal(hasPermission(role, "applications:read"), false);
    assert.equal(hasPermission(role, "services:manage"), false);
    assert.equal(hasPermission(role, "content:manage"), false);
  }
  assert.equal(hasPermission("news_editor", "organization:manage"), false);
  assert.equal(hasPermission("news_reviewer", "organization:manage"), false);
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
      "organization:manage",
    ],
    news_editor: ["news:write", "news:submit", "news:read_own"],
    news_reviewer: ["news:read_all", "news:review"],
  });
});

test("staff role UI options and labels match the supported roles", () => {
  assert.deepEqual(STAFF_ROLES, ROLES);
  assert.deepEqual(Object.keys(ROLE_LABELS), ROLES);
  for (const role of ROLES) {
    assert.equal(typeof ROLE_LABELS[role], "string");
    assert.ok(ROLE_LABELS[role].length > 0);
  }
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

test("all registered Admin routes preserve role access, including login and password change", () => {
  const roles = ["super_admin", "news_editor", "news_reviewer"];
  for (const section of SECTIONS) {
    for (const role of roles) {
      assert.equal(
        canAccessPath(role, section.route),
        section.allowedRoles.includes(role),
        `${role} access to ${section.route}`,
      );
      assert.equal(
        canAccessPath(role, `${section.route}/`),
        section.allowedRoles.includes(role),
        `${role} access to ${section.route}/`,
      );
    }
  }

  for (const role of roles) {
    assert.equal(canAccessPath(role, "/admin/login"), true);
    assert.equal(canAccessPath(role, "/admin/change-password"), true);
    assert.equal(canAccessPath(role, "/admin"), true);
  }
});

test("nested and dynamic Admin routes inherit the longest registered section route", () => {
  const cases = [
    ["super_admin", "/admin/applications/2f5d1e", true],
    ["news_editor", "/admin/applications/2f5d1e", false],
    ["news_reviewer", "/admin/applications/2f5d1e/notes", false],
    ["super_admin", "/admin/news/articles/2f5d1e", true],
    ["news_editor", "/admin/news/articles/2f5d1e", true],
    ["news_reviewer", "/admin/news/articles/2f5d1e/review", true],
    ["news_editor", "/admin/news-sources/2f5d1e", false],
    ["news_reviewer", "/admin/news-sources/2f5d1e/status", false],
    ["super_admin", "/admin/news-sources/2f5d1e/status", true],
  ];

  for (const [role, pathname, expected] of cases) {
    assert.equal(canAccessPath(role, pathname), expected, `${role} access to ${pathname}`);
  }
});

test("unregistered Admin paths, sibling prefixes, and unknown roles fail closed", () => {
  for (const role of ["super_admin", "news_editor", "news_reviewer"]) {
    for (const pathname of [
      "/admin/unknown",
      "/admin/unknown/child",
      "/admin/login/extra",
      "/admin/login-extra",
      "/admin/newsletter",
      "/admin/applications-extra",
      "/adminish",
    ]) {
      assert.equal(canAccessPath(role, pathname), false, `${role} access to ${pathname}`);
    }
  }

  assert.equal(canAccessPath("unknown_role", "/admin"), false);
  assert.equal(canAccessPath("news_editor", null), false);
});

test("unknown roles and permissions have no grants", () => {
  assert.equal(hasPermission("unknown_role", "records:delete"), false);
  assert.equal(hasPermission("super_admin", "unknown:permission"), false);
});
