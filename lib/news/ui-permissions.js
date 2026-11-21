const WRITABLE_ARTICLE_STATUSES = new Set(["draft", "changes_requested"]);

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
