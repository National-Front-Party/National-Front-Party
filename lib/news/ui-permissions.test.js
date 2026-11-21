import assert from "node:assert/strict";
import test from "node:test";
import { canEditNewsArticle, canSubmitNewsArticle } from "./ui-permissions.js";

test("News UI edit and submit actions are limited to eligible Writer-owned articles and System Administrators", () => {
  for (const canAct of [canEditNewsArticle, canSubmitNewsArticle]) {
    assert.equal(canAct("news_reviewer", true, "draft"), false);
    assert.equal(canAct("news_reviewer", true, "changes_requested"), false);
    assert.equal(canAct("news_reviewer", false, "draft"), false);
    assert.equal(canAct("news_editor", true, "draft"), true);
    assert.equal(canAct("news_editor", true, "changes_requested"), true);
    assert.equal(canAct("news_editor", false, "draft"), false);
    assert.equal(canAct("news_editor", true, "pending_review"), false);
    assert.equal(canAct("news_editor", true, "published"), false);
    assert.equal(canAct("super_admin", false, "draft"), true);
    assert.equal(canAct("super_admin", false, "pending_review"), true);
  }
});
