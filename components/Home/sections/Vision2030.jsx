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
        dir="rtl"
        lang="ar"
        aria-label="رؤية مصر 2030"
        className="vision2030-section"
      >
        <div className="vision2030-card">
          <div className="vision2030-text">
            <p className="vision2030-eyebrow">{VISION_2030.eyebrow}</p>
            <h2 className="vision2030-title">{VISION_2030.title}</h2>
            <p className="vision2030-intro">{VISION_2030.intro}</p>

            <div className="vision2030-chips" aria-label="مبادئ الرؤية">
              {VISION_2030.chips.map((chip) => (
                <span className="vision2030-chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="vision2030-details-button"
              aria-haspopup="dialog"
              onClick={() => setModalOpen(true)}
            >
              {VISION_2030.buttonLabel}
            </button>
          </div>

          <div className="vision2030-stats">
            {VISION_2030.stats.map((stat, index) => (
              <div
                className={`vision2030-stat${tilesVisible ? " vision2030-stat-visible" : ""}`}
                style={{ "--tile-delay": `${index * 100}ms` }}
                key={stat.label}
              >
                <span className="vision2030-number">{stat.value}</span>
                <span className="vision2030-label">{stat.label}</span>
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
