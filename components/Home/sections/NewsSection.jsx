"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import JoinModal from "@/components/Home/ui/JoinModal";
import ModalShell from "@/components/Home/ui/ModalShell";
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
        dir="rtl"
        lang="ar"
        aria-label="جريدة الجبهة الوطنية"
        className="news-section"
      >
        <div className="news-outer-card">
          <div className="news-title-panel">
            <p className="news-eyebrow">أخبار 2026</p>
            <h2 className="news-section-title">جريدة الجبهة الوطنية</h2>
            <div aria-hidden="true" className="news-divider" />
            <Link href={PORTAL_URL} className="news-portal-link bg-gold-gradient">
              افتح بوابة الجبهة الوطنية
            </Link>
          </div>

          <div className="news-grid">
            {NEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="news-card"
                onClick={() => setActiveNews(item)}
                aria-haspopup="dialog"
              >
                <span className="news-card-image">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={420}
                    height={236}
                    className="news-card-photo"
                  />
                </span>
                <span className="news-card-text">
                  <span className="news-card-meta">{item.meta}</span>
                  <span className="news-card-title">{item.title}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="news-join-wrap">
            <button
              type="button"
              className="news-join-button"
              aria-haspopup="dialog"
              onClick={() => setJoinOpen(true)}
            >
              <span className="news-join-label">
                انضم
                <br />
                للحزب
              </span>
            </button>
          </div>
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
