"use client";

import { useEffect, useRef, useState } from "react";
import ModalShell from "@/components/Home/ui/ModalShell";
import Reveal from "@/components/Home/ui/Reveal";
import "./Vision2030.css";

const defaultVision = {
  eyebrow: "استراتيجية التنمية المستدامة",
  title: "رؤية مصر 2030",
  intro:
    "النسخة المحدثة الصادرة عن وزارة التخطيط والتنمية الاقتصادية تقوم على أربعة مبادئ حاكمة، وستة أهداف استراتيجية، وسبعة ممكنات.",
  chips: [
    "الإنسان محور التنمية",
    "العدالة والإتاحة",
    "المرونة والتكيف",
    "الاستدامة",
  ],
  buttonLabel: "تفاصيل الرؤية والممكنات",
  stats: [
    { value: 4, label: "مبادئ حاكمة" },
    { value: 6, label: "أهداف استراتيجية" },
    { value: 7, label: "ممكنات" },
  ],
  modal: {
    title: "رؤية مصر 2030",
    paras: [
      "أطلقت مصر في فبراير 2016 استراتيجية التنمية المستدامة: رؤية مصر 2030 كأول استراتيجية تصاغ وفقا لمنهجية التخطيط الاستراتيجي التشاركي.",
      "تم تحديث الاستراتيجية لمواكبة التغيرات والتحديات، مع التركيز على الاستثمار في البشر والتحول الرقمي والعدالة الاجتماعية والتنمية المكانية المتوازنة.",
    ],
    note: "المصدر: الموقع الرسمي لوزارة التخطيط والتنمية الاقتصادية والتعاون الدولي",
    link: "https://mped.gov.eg",
    linkLabel: "موقع وزارة التخطيط",
  },
};

export default function Vision2030({ data }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tilesVisible, setTilesVisible] = useState(false);
  const sectionRef = useRef(null);

  const vision = {
    ...defaultVision,
    ...(data || {}),
    chips: data?.chips?.length ? data.chips : defaultVision.chips,
    stats: data?.stats?.length ? data.stats : defaultVision.stats,
    modal: {
      ...defaultVision.modal,
      ...(data?.modal || {}),
      paras: data?.modal?.paras?.length
        ? data.modal.paras
        : defaultVision.modal.paras,
    },
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTilesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        id="c-2030"
        tabIndex={-1}
        dir="rtl"
        lang="ar"
        aria-label="رؤية مصر 2030"
        className="vision2030-section mx-auto mt-[28px] w-full max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] px-5 scroll-mt-28 focus:outline-none"
      >
        <div className="vision2030-card flex w-full flex-col items-stretch gap-6 rounded-[28px] bg-ink p-[22px_16px] text-white shadow-card min-[600px]:p-[30px_28px] min-[1000px]:flex-row min-[1000px]:items-center min-[1000px]:gap-10">
          <Reveal
            direction="right"
            delay={0.08}
            duration={0.7}
            className="w-full min-w-0 flex min-[1000px]:flex-[999_1_380px]"
          >
            <div className="vision2030-text flex w-full min-w-0 flex-col gap-2.5">
              <p className="vision2030-eyebrow m-0 text-[13px] font-extrabold text-gold-light animate-elem-fade-up motion-reduce:animate-none">
                {vision.eyebrow}
              </p>
              <h2
                className="vision2030-title m-0 text-[clamp(24px,5vw,32px)] font-black leading-[1.35] animate-elem-fade-up motion-reduce:animate-none"
                style={{ animationDelay: "60ms" }}
              >
                {vision.title}
              </h2>
              <p
                className="vision2030-intro m-0 max-w-[560px] text-[15px] leading-[1.8] text-on-dark animate-elem-fade-up motion-reduce:animate-none"
                style={{ animationDelay: "120ms" }}
              >
                {vision.intro}
              </p>

              <div className="vision2030-chips flex flex-wrap gap-1.5" aria-label="مبادئ الرؤية">
                {vision.chips.map((chip, idx) => (
                  <span
                    className="vision2030-chip rounded-full border border-gold px-3 py-[3px] text-[13px] font-bold text-gold-light animate-elem-scale-in motion-reduce:animate-none"
                    style={{ animationDelay: `${idx * 40 + 180}ms` }}
                    key={chip}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="vision2030-details-button relative mt-1 inline-flex min-h-[46px] items-center justify-center self-start overflow-hidden rounded-xl border border-gold bg-transparent px-[22px] text-[15px] font-extrabold text-gold-light cursor-pointer animate-elem-fade-up motion-reduce:animate-none"
                style={{ animationDelay: "260ms" }}
                aria-haspopup="dialog"
                onClick={() => setModalOpen(true)}
              >
                {vision.buttonLabel}
              </button>
            </div>
          </Reveal>

          <Reveal
            direction="left"
            delay={0.2}
            duration={0.7}
            className="w-full min-w-0 flex min-[1000px]:flex-[1_1_300px]"
          >
            <div className="vision2030-stats grid w-full min-w-0 grid-cols-1 gap-3 min-[341px]:grid-cols-3">
              {vision.stats.map((stat, index) => (
                <div
                  className={`vision2030-stat relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-[18px] bg-[#22252c] p-[18px_8px] text-center text-on-dark${tilesVisible ? " vision2030-stat-visible" : ""}`}
                  style={{ "--tile-delay": `${index * 100}ms` }}
                  key={stat.label}
                >
                  <span className="vision2030-number font-['Noto_Kufi_Arabic',sans-serif] text-[36px] font-black leading-[1.1] text-gold-light min-[480px]:text-[44px]">{stat.value}</span>
                  <span className="vision2030-label mt-1 break-words text-center text-[13px] font-bold leading-[1.4] text-on-dark">{stat.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {modalOpen ? (
        <ModalShell
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={vision.modal.title}
          maxWidth="max-w-[800px]"
        >
          <div dir="rtl" className="vision2030-modal-content">
            {vision.modal.paras.map((paragraph) => (
              <p className="vision2030-modal-paragraph" key={paragraph}>
                {paragraph}
              </p>
            ))}
            <p className="vision2030-modal-note">{vision.modal.note}</p>
            <a
              href={vision.modal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="vision2030-modal-link"
            >
              {vision.modal.linkLabel}
            </a>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
