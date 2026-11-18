"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import JoinModal from "@/components/Home/ui/JoinModal";
import ModalShell from "@/components/Home/ui/ModalShell";
import Reveal from "@/components/Home/ui/Reveal";
import { membershipTypes } from "@/data/mock/membership";
import "./NewsSection.css";

const PORTAL_URL = "/";

export default function NewsSection({ data }) {
  const [activeNews, setActiveNews] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const touchStartRef = useRef(0);
  const [newsList, setNewsList] = useState(data || []);

  useEffect(() => {
    let ignore = false;
    async function fetchPublicNews() {
      try {
        const response = await fetch("/api/content/news");
        if (!response.ok) return;
        const result = await response.json();
        if (!ignore && Array.isArray(result?.news) && result.news.length > 0) {
          setNewsList(
            result.news.map((item) => ({
              id: item.id,
              slug: item.slug,
              title: item.title,
              meta: item.meta || item.formatted_date || "",
              paras: [],
              note: item.meta || item.formatted_date || "",
              img: item.image_url || "/news1.jpg",
              link: item.slug ? `/news/${item.slug}` : "/",
              linkLabel: "التفاصيل من المصدر",
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load /api/content/news:", error);
      }
    }
    fetchPublicNews();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleArticleClick(item) {
    setActiveNews(item);
    if (item.slug) {
      try {
        const response = await fetch(`/api/content/news/${item.slug}`);
        if (response.ok) {
          const result = await response.json();
          if (result?.article) {
            setActiveNews((prev) =>
              prev?.id === item.id
                ? {
                    ...prev,
                    title: result.article.title || prev.title,
                    paras:
                      result.article.paragraphs ||
                      (result.article.body ? [result.article.body] : prev.paras),
                    note: result.article.meta || prev.note,
                    link: result.article.source_url || prev.link,
                    linkLabel:
                      result.article.link_label || prev.linkLabel,
                  }
                : prev,
            );
          }
        }
      } catch (error) {
        console.error("Failed to load article detail:", error);
      }
    }
  }

  const maxIndex = Math.max(0, newsList.length - 3);

  function handlePrev() {
    setStartIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNext() {
    setStartIndex((prev) => Math.min(maxIndex, prev + 1));
  }

  function handleTouchStart(e) {
    touchStartRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchEnd - touchStartRef.current;
    if (diff > 50) {
      handlePrev();
    } else if (diff < -50) {
      handleNext();
    }
  }

  const visibleNews =
    newsList.length <= 3
      ? newsList
      : newsList.slice(startIndex, startIndex + 3);

  return (
    <>
      <section
        id="c-news"
        tabIndex={-1}
        dir="rtl"
        lang="ar"
        aria-label="جريدة الجبهة الوطنية"
        className="news-section mx-auto mt-[28px] w-full max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] px-5 min-[768px]:mt-[36px] scroll-mt-28 focus:outline-none"
      >
        <div className="news-outer-card flex w-full flex-col items-stretch gap-[18px] rounded-[24px] border border-[rgba(21,23,28,0.07)] bg-white p-[18px] shadow-card min-[1200px]:flex-row">
          <Reveal
            direction="right"
            delay={0.05}
            duration={0.7}
            className="flex w-full min-[1200px]:w-[220px] min-[1200px]:flex-none"
          >
            <div className="news-title-panel flex w-full flex-col justify-center gap-2.5 rounded-[18px] bg-ink p-[22px_18px] text-white min-[768px]:max-[1199px]:flex-row min-[768px]:max-[1199px]:items-center min-[768px]:max-[1199px]:justify-between">
              <div className="flex flex-col gap-2.5">
                <p className="news-eyebrow m-0 text-[13px] font-extrabold text-gold-light">أخبار 2026</p>
                <h2 className="news-section-title m-0 font-['Noto_Kufi_Arabic',sans-serif] text-[24px] font-black leading-[1.45]">جريدة الجبهة الوطنية</h2>
                <div aria-hidden="true" className="news-divider h-[3px] w-[56px] rounded-[3px] bg-gold" />
              </div>
              <Link href={PORTAL_URL} className="news-portal-link bg-gold-gradient relative mt-2 inline-flex min-h-[46px] items-center justify-center overflow-hidden rounded-full px-4 text-center text-[14px] font-extrabold text-ink no-underline min-[768px]:max-[1199px]:mt-0">
                افتح بوابة الجبهة الوطنية
              </Link>
            </div>
          </Reveal>

          <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-2">
            {newsList.length > 3 ? (
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-light bg-gold-tint px-3 py-1 text-xs font-bold text-ink">
                    <span className="size-2 rounded-full bg-gold" />
                    <span>
                      تصفح الأخبار ({startIndex + 1} -{" "}
                      {Math.min(startIndex + 3, newsList.length)} من{" "}
                      {newsList.length})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={startIndex === 0}
                    aria-label="الأخبار السابقة"
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-gold/40 bg-white px-3 text-xs font-bold text-ink shadow-sm transition-all hover:border-gold hover:bg-gold-gradient hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gold/30 disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <span>السابق</span>
                    <svg
                      className="size-3.5 rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={startIndex >= maxIndex}
                    aria-label="الأخبار التالية"
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-gold/40 bg-white px-3 text-xs font-bold text-ink shadow-sm transition-all hover:border-gold hover:bg-gold-gradient hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gold/30 disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <svg
                      className="size-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>التالي</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className="grid min-w-0 flex-1 grid-cols-1 gap-[14px] min-[480px]:grid-cols-2 min-[768px]:grid-cols-3"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {visibleNews.map((item) => (
                <div
                  key={item.id}
                  className="w-full flex animate-elem-fade-up motion-reduce:animate-none"
                >
                  <button
                    type="button"
                    className="news-card flex flex-col justify-start h-full w-full cursor-pointer overflow-hidden rounded-[18px] border border-[rgba(21,23,28,0.07)] bg-white p-0 text-start text-ink shadow-card"
                    onClick={() => handleArticleClick(item)}
                    aria-haspopup="dialog"
                  >
                    <span className="news-card-image relative block aspect-[16/9] w-full shrink-0 overflow-hidden bg-page">
                      <Image
                        src={item.img}
                        alt={item.title}
                        width={420}
                        height={236}
                        className="news-card-photo h-full w-full object-cover"
                      />
                    </span>
                    <span className="news-card-text flex flex-1 flex-col justify-start p-[12px_14px_16px]">
                      <span className="news-card-meta mb-1 block text-[12px] font-extrabold text-gold-dark">
                        {item.meta}
                      </span>
                      <span className="news-card-title font-['Noto_Kufi_Arabic',sans-serif] text-[15px] font-extrabold leading-[1.6] line-clamp-2 min-h-[48px]">
                        {item.title}
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Reveal
            direction="scale"
            delay={0.35}
            duration={0.7}
            className="news-join-wrap mx-auto flex w-full items-center justify-center p-2 min-[1200px]:w-[170px] min-[1200px]:flex-none"
          >
            <button
              type="button"
              className="news-join-button relative isolate size-[140px] cursor-pointer rounded-full border-[5px] border-gold bg-ink font-['Noto_Kufi_Arabic',sans-serif] text-[22px] font-black leading-[1.45] text-white"
              aria-haspopup="dialog"
              onClick={() => setJoinOpen(true)}
            >
              <span className="news-join-label relative z-10">
                انضم
                <br />
                للحزب
              </span>
            </button>
          </Reveal>
        </div>
      </section>

      {activeNews ? (
        <ModalShell
          open={Boolean(activeNews)}
          onClose={() => setActiveNews(null)}
          title={activeNews.title}
          maxWidth="max-w-[640px]"
        >
          <div dir="rtl" className="mt-5 text-right">
            <div className="space-y-4">
              {activeNews.paras.map((paragraph) => (
                <p key={paragraph} className="news-modal-paragraph">
                  {paragraph}
                </p>
              ))}
            </div>

            {activeNews.note ? (
              <p className="news-modal-note">{activeNews.note}</p>
            ) : null}

            {activeNews.link ? (
              <a
                href={activeNews.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-modal-source"
              >
                {activeNews.linkLabel}
              </a>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {joinOpen ? (
        <JoinModal
          open={joinOpen}
          onClose={() => setJoinOpen(false)}
          types={membershipTypes}
        />
      ) : null}
    </>
  );
}
