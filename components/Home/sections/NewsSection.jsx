"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import JoinModal from "@/components/Home/ui/JoinModal";
import ModalShell from "@/components/Home/ui/ModalShell";
import Reveal from "@/components/Home/ui/Reveal";
import { membershipTypes } from "@/data/mock/membership";
import { NEWS, PORTAL_URL } from "@/data/mock/newsMock";
import "./NewsSection.css";

export default function NewsSection() {
  const [activeNews, setActiveNews] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);

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

          <div className="news-grid grid min-w-0 flex-1 grid-cols-1 gap-[14px] min-[480px]:grid-cols-2 min-[768px]:grid-cols-3">
            {NEWS.map((item, index) => (
              <Reveal
                key={item.id}
                direction="up"
                delay={0.1 + index * 0.1}
                duration={0.7}
                className="w-full flex"
              >
                <button
                  type="button"
                  className="news-card w-full cursor-pointer overflow-hidden rounded-[18px] border border-[rgba(21,23,28,0.07)] bg-white p-0 text-start text-ink shadow-card"
                  onClick={() => setActiveNews(item)}
                  aria-haspopup="dialog"
                >
                  <span className="news-card-image block aspect-[16/9] w-full overflow-hidden bg-page">
                    <Image
                      src={item.img}
                      alt={item.title}
                      width={420}
                      height={236}
                      className="news-card-photo h-full w-full object-cover"
                    />
                  </span>
                  <span className="news-card-text flex flex-col p-[12px_14px_16px]">
                    <span className="news-card-meta mb-1 text-[12px] font-extrabold text-gold-dark">{item.meta}</span>
                    <span className="news-card-title font-['Noto_Kufi_Arabic',sans-serif] text-[15px] font-extrabold leading-[1.6]">{item.title}</span>
                  </span>
                </button>
              </Reveal>
            ))}
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
