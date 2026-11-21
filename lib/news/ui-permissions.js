const WRITABLE_ARTICLE_STATUSES = new Set(["draft", "changes_requested"]);

export function isNewsArticleAuthor(article, user) {
  if (!article || !user) return false;
  if (user.id && article.created_by === user.id) return true;
  return Boolean(
    user.email &&
      article.created_by_user?.email &&
      article.created_by_user.email.toLowerCase() === user.email.toLowerCase(),
  );
}

export function canEditNewsArticle(role, isAuthor, status) {
  return (
    role === "super_admin" ||
    (role === "news_editor" && isAuthor && WRITABLE_ARTICLE_STATUSES.has(status))
  );
}

export function canSubmitNewsArticle(role, isAuthor, status) {
  return (
    role === "super_admin" ||
    (role === "news_editor" && isAuthor && WRITABLE_ARTICLE_STATUSES.has(status))
  );
}

export function canReviewNewsArticle(role, isAuthor, status) {
  if (role === "super_admin") {
    return (
      status === "pending_review" ||
      (isAuthor && (status === "draft" || status === "changes_requested"))
    );
  }
  return role === "news_reviewer" && !isAuthor && status === "pending_review";
}
