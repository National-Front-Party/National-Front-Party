"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { adminFetch } from "@/lib/admin/api";
import { useToast } from "@/lib/admin/toast-context";
import { useAdminAuth } from "@/lib/admin/auth-context";
import Spinner from "@/components/Admin/ui/Spinner";

export default function ArticleReviewModal({
  isOpen,
  article,
  onClose,
  onUpdated,
}) {
  const { user } = useAdminAuth();
  const { showSuccess, showError } = useToast();

  const [reviewNote, setReviewNote] = useState(article?.review_note || "");
  const [showChangesInput, setShowChangesInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !actionLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, actionLoading, onClose]);

  if (!isOpen || !article) return null;

  const isSelfAuthor = Boolean(user?.id && article?.created_by === user.id);
  const isReviewer = user?.role === "news_reviewer";
  const cannotSelfReview = isReviewer && isSelfAuthor;

  // Split body text into paragraphs
  const paragraphs = (article.body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Publish Article
  const handlePublish = async () => {
    if (cannotSelfReview) {
      showError("لا يمكن للمراجع مراجعة مقال كتبه بنفسه. يرجى إسناده إلى مراجع آخر.");
      return;
    }

    setActionLoading(true);
    try {
      await adminFetch(`/api/admin/news/articles/${article.id}/publish`, {
        method: "POST",
      });
      showSuccess(`تم اعتماد ونشر المقال «${article.title}» بنجاح على الموقع`);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      if (
        err.message?.includes("SELF_PUBLISHING_PROHIBITED") ||
        err.message?.includes("SELF_REVIEW_PROHIBITED") ||
        err.error === "SELF_PUBLISHING_PROHIBITED" ||
        err.error === "SELF_REVIEW_PROHIBITED"
      ) {
        showError("لا يمكن للمراجع مراجعة مقال كتبه بنفسه. يرجى إسناده إلى مراجع آخر.");
      } else {
        showError(err.message || "تعذر اعتماد ونشر المقال");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Request Changes with Review Note
  const handleRequestChanges = async (e) => {
    e.preventDefault();
    if (cannotSelfReview) {
      showError("لا يمكن للمراجع مراجعة مقال كتبه بنفسه. يرجى إسناده إلى مراجع آخر.");
      return;
    }
    const trimmedNote = reviewNote.trim();
    if (!trimmedNote) {
      showError("يرجى كتابة الملاحظات والتعديلات المطلوبة لإرسالها للكاتب");
      return;
    }

    setActionLoading(true);
    try {
      await adminFetch(`/api/admin/news/articles/${article.id}/request-changes`, {
        method: "POST",
        body: JSON.stringify({ review_note: trimmedNote }),
      });
      showSuccess(`تم إرجاع المقال للكاتب بطلب تعديلات بنجاح`);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      if (err.message?.includes("SELF_REVIEW_PROHIBITED") || err.error === "SELF_REVIEW_PROHIBITED") {
        showError("لا يمكن للمراجع مراجعة مقال كتبه بنفسه. يرجى إسناده إلى مراجع آخر.");
      } else {
        showError(err.message || "\u062a\u0639\u0630\u0631 \u0625\u0631\u062c\u0627\u0639 \u0627\u0644\u0645\u0642\u0627\u0644 \u0628\u0637\u0644\u0628 \u062a\u0639\u062f\u064a\u0644\u0627\u062a");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Unpublish Article (published -> draft)
  const handleUnpublish = async () => {
    setActionLoading(true);
    try {
      await adminFetch(`/api/admin/news/articles/${article.id}/unpublish`, {
        method: "POST",
      });
      showSuccess(`تم إلغاء نشر المقال وإعادته إلى المسودات`);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      showError(err.message || "تعذر إلغاء نشر المقال");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-[26px] border border-line bg-white shadow-card-hover animate-elem-fade-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-page/40 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300 bg-sky-50 text-sky-700 shadow-2xs">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted">مراجعة وتدقيق النشر</span>
                <span className="rounded-full bg-gold-tint border border-gold/40 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark">
                  {article.status === "pending_review"
                    ? "قيد المراجعة والاعتماد"
                    : article.status === "published"
                    ? "مقال منشور"
                    : article.status}
                </span>
              </div>
              <h2 className="text-lg font-black text-ink tracking-tight mt-0.5">
                تدقيق مقال: «{article.title}»
              </h2>
            </div>
          </div>

          {/* Golden Rotating Close Button */}
          <button
            type="button"
            disabled={actionLoading}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="group relative flex size-10 items-center justify-center rounded-2xl border border-line bg-white text-muted shadow-2xs transition-all duration-300 ease-out hover:rotate-90 hover:scale-110 hover:border-gold hover:bg-gold-gradient hover:text-ink hover:shadow-[0_4px_14px_rgba(201,162,74,0.35)] active:scale-95 disabled:opacity-50"
            title="إغلاق"
          >
            <svg
              className="size-5 transition-transform duration-300 group-hover:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Self-Publishing Prohibition Warning Banner */}
          {cannotSelfReview && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-black text-sm">منع المراجع من مراجعة مقاله الخاص:</p>
                <p className="mt-1 font-medium text-amber-800 leading-relaxed">لا يمكنك مراجعة أو طلب تعديلات أو نشر مقال كتبته بنفسك. يرجى إسناد المقال إلى مراجع آخر.</p>
              </div>
            </div>
          )}

          {/* Article Meta Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-page/50 p-4 rounded-2xl border border-line">
            <div className="flex items-center gap-1.5 text-muted">
              <span className="font-bold text-ink">المصدر:</span>
              <span className="rounded-lg bg-white border border-line px-2.5 py-1 text-ink font-bold">
                📰 {article.source?.name_ar || "—"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <span className="font-bold text-ink">الكاتب:</span>
              <span className="rounded-lg bg-white border border-line px-2.5 py-1 text-ink font-bold">
                ✍️ {article.created_by_user?.full_name || "محرر غير معروف"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-muted">
              <span className="font-bold text-ink">تاريخ النشر:</span>
              <span className="rounded-lg bg-white border border-line px-2.5 py-1 font-mono text-ink">
                📅 {article.published_on ? new Date(article.published_on).toISOString().substring(0, 10) : "—"}
              </span>
            </div>

            {article.is_featured && (
              <span className="rounded-lg bg-gold-tint border border-gold/40 px-2.5 py-1 text-gold-dark font-black">
                ★ مقال مميز
              </span>
            )}

            {article.source_url && (
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-white border border-line px-2.5 py-1 text-sky-700 hover:border-gold hover:text-gold-dark transition-colors mr-auto font-bold"
              >
                <span>رابط المصدر</span>
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>

          {/* Cover Image Preview if exists */}
          {article.image_url && (
            <div className="rounded-2xl border border-line overflow-hidden bg-page/40 max-h-72 flex items-center justify-center relative">
              <Image
                src={article.image_url}
                alt={article.image_alt || article.title}
                width={800}
                height={300}
                className="w-full h-auto max-h-72 object-cover"
                unoptimized
              />
              {article.image_alt && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs p-2 text-center text-[11px] text-white">
                  {article.image_alt}
                </div>
              )}
            </div>
          )}

          {/* Existing Review Note if article has changes_requested */}
          {article.review_note && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs space-y-1">
              <span className="font-bold text-rose-800 block">آخر ملاحظة مراجعة مسجلة:</span>
              <p className="text-rose-950 leading-relaxed font-medium">{article.review_note}</p>
            </div>
          )}

          {/* Article Full Body */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted">نص المقال الصحفي الكامل:</h3>
            <div className="rounded-2xl border border-line bg-page/20 p-5 space-y-3.5 text-xs sm:text-sm text-ink leading-relaxed">
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          {/* Review Actions Form */}
          {article.status === "pending_review" && !cannotSelfReview && (
            <div className="space-y-4 pt-4 border-t border-line">
              <h4 className="text-xs font-bold text-ink">اتخاذ قرار المراجعة:</h4>

              {!showChangesInput ? (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Publish Button */}
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handlePublish}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-btn hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Spinner size="xs" color="white" />
                    ) : (
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>اعتماد ونشر المقال الآن</span>
                  </button>

                  {/* Request Changes Toggle Button */}
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowChangesInput(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>طلب تعديلات من الكاتب</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestChanges} className="space-y-3 p-4 rounded-2xl border border-rose-200 bg-rose-50/50">
                  <div className="space-y-1">
                    <label htmlFor="review-note-input" className="block text-xs font-bold text-rose-900">
                      بيان الملاحظات والتعديلات المطلوبة من الكاتب <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      id="review-note-input"
                      required
                      rows={3}
                      maxLength={2000}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="مثال: يرجى إعادة صياغة الفقرة الثانية لتكون أكثر دقة وتوثيق مصدر الأرقام..."
                      className="w-full rounded-2xl border border-border bg-white p-3.5 text-right text-xs font-medium text-ink transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] placeholder:text-muted/60 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowChangesInput(false)}
                      className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-muted hover:border-gold hover:text-ink transition-all shadow-2xs"
                    >
                      تراجع
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || !reviewNote.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-btn disabled:opacity-50"
                    >
                      {actionLoading ? <Spinner size="xs" color="white" /> : null}
                      <span>إرسال طلب التعديلات للكاتب</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Unpublish action if already published */}
          {article.status === "published" && (
            <div className="space-y-3 pt-4 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-ink">سحب المقال من النشر</h4>
                  <p className="text-[11px] text-muted">
                    سيتم سحب المقال فوراً من العرض العام وإعادته كمسودة قابلة للتعديل.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleUnpublish}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
                >
                  {actionLoading ? <Spinner size="xs" color="ink" /> : null}
                  <span>إلغاء النشر وإعادة للمسودات</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
