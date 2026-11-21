import assert from "node:assert/strict";
import test from "node:test";
import { canEditNewsArticle, canReviewNewsArticle, canSubmitNewsArticle, isNewsArticleAuthor } from "./ui-permissions.js";

test("News author matching works with profile email when the session profile has no id", () => {
  const article = {
    created_by: "staff-id",
    created_by_user: { id: "staff-id", email: "writer@example.test" },
  };
  assert.equal(isNewsArticleAuthor(article, { email: "WRITER@example.test" }), true);
  assert.equal(isNewsArticleAuthor(article, { email: "other@example.test" }), false);
  assert.equal(isNewsArticleAuthor(article, { id: "staff-id" }), true);
  assert.equal(isNewsArticleAuthor(article, null), false);
});

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

test("News review actions allow Super Admin direct review only for their own eligible articles", () => {
  assert.equal(canReviewNewsArticle("super_admin", true, "draft"), true);
  assert.equal(canReviewNewsArticle("super_admin", true, "changes_requested"), true);
  assert.equal(canReviewNewsArticle("super_admin", false, "draft"), false);
  assert.equal(canReviewNewsArticle("super_admin", false, "changes_requested"), false);
  assert.equal(canReviewNewsArticle("super_admin", true, "pending_review"), true);
  assert.equal(canReviewNewsArticle("super_admin", false, "pending_review"), true);

  assert.equal(canReviewNewsArticle("news_reviewer", false, "pending_review"), true);
  assert.equal(canReviewNewsArticle("news_reviewer", true, "pending_review"), false);
  assert.equal(canReviewNewsArticle("news_reviewer", false, "draft"), false);
  assert.equal(canReviewNewsArticle("news_editor", true, "draft"), false);
});
