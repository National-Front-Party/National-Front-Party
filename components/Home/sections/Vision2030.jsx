"use client";

import { useEffect, useRef, useState } from "react";
import ModalShell from "@/components/Home/ui/ModalShell";
import { VISION_2030 } from "@/data/mock/vision2030Mock";
import "./Vision2030.css";

export default function Vision2030() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tilesVisible, setTilesVisible] = useState(false);
  const sectionRef = useRef(null);

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
        className="vision2030-section mx-auto mt-[28px] w-full max-w-[1320px] px-5 scroll-mt-28 focus:outline-none"
      >
        <div className="vision2030-card flex w-full flex-col items-stretch gap-6 rounded-[28px] bg-ink p-[22px_16px] text-white shadow-card min-[600px]:p-[30px_28px] min-[1000px]:flex-row min-[1000px]:items-center min-[1000px]:gap-10">
          <div className="vision2030-text flex w-full min-w-0 flex-col gap-2.5 min-[1000px]:flex-[999_1_380px]">
            <p className="vision2030-eyebrow m-0 text-[13px] font-extrabold text-gold-light">{VISION_2030.eyebrow}</p>
            <h2 className="vision2030-title m-0 text-[clamp(24px,5vw,32px)] font-black leading-[1.35]">{VISION_2030.title}</h2>
            <p className="vision2030-intro m-0 max-w-[560px] text-[15px] leading-[1.8] text-on-dark">{VISION_2030.intro}</p>

            <div className="vision2030-chips flex flex-wrap gap-1.5" aria-label="مبادئ الرؤية">
              {VISION_2030.chips.map((chip) => (
                <span className="vision2030-chip rounded-full border border-gold px-3 py-[3px] text-[13px] font-bold text-gold-light" key={chip}>
                  {chip}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="vision2030-details-button relative mt-1 inline-flex min-h-[46px] items-center justify-center self-start overflow-hidden rounded-xl border border-gold bg-transparent px-[22px] text-[15px] font-extrabold text-gold-light cursor-pointer"
              aria-haspopup="dialog"
              onClick={() => setModalOpen(true)}
            >
              {VISION_2030.buttonLabel}
            </button>
          </div>

          <div className="vision2030-stats grid w-full min-w-0 grid-cols-1 gap-3 min-[341px]:grid-cols-3 min-[1000px]:flex-[1_1_300px]">
            {VISION_2030.stats.map((stat, index) => (
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
        </div>
      </section>

      {modalOpen ? (
        <ModalShell
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={VISION_2030.modal.title}
          maxWidth="max-w-[800px]"
        >
          <div dir="rtl" className="vision2030-modal-content">
            {VISION_2030.modal.paras.map((paragraph) => (
              <p className="vision2030-modal-paragraph" key={paragraph}>
                {paragraph}
              </p>
            ))}
            <p className="vision2030-modal-note">{VISION_2030.modal.note}</p>
            <a
              href={VISION_2030.modal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="vision2030-modal-link"
            >
              {VISION_2030.modal.linkLabel}
            </a>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
