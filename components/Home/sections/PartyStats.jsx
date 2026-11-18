"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Reveal from "@/components/Home/ui/Reveal";
import { STATS } from "@/data/mock/statsMock";
import "./PartyStats.css";

const subscribeReducedMotion = (callback) => {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
};

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getReducedMotionServerSnapshot = () => false;

export default function PartyStats() {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const sectionRef = useRef(null);
  const [counts, setCounts] = useState(() => {
    const initial = {};
    for (const stat of STATS) {
      initial[stat.id] = 0;
    }
    return initial;
  });

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const section = sectionRef.current;
    if (!section) return undefined;

    let animationFrameId = null;
    let startTime = null;
    const duration = 2600;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();

          const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const p = Math.min(elapsed / duration, 1);
            // ease-out cubic: value = Math.round(target * (1 - Math.pow(1 - p, 3)))
            const factor = 1 - Math.pow(1 - p, 3);

            const next = {};
            for (const stat of STATS) {
              next[stat.id] =
                p >= 1 ? stat.value : Math.round(stat.value * factor);
            }
            setCounts(next);

            if (p < 1) {
              animationFrameId = requestAnimationFrame(step);
            }
          };

          animationFrameId = requestAnimationFrame(step);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="st-stats"
      tabIndex={-1}
      dir="rtl"
      lang="ar"
      aria-label="الحزب في أرقام"
      className="st-stats-section mx-auto mt-[28px] w-full max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] px-5 pb-[56px] min-[768px]:pb-[72px] grid grid-cols-1 min-[380px]:grid-cols-2 min-[1000px]:grid-cols-4 gap-4 items-stretch scroll-mt-28 focus:outline-none"
    >
      {STATS.map((stat, index) => {
        const currentCount = prefersReducedMotion
          ? stat.value
          : (counts[stat.id] ?? 0);
        const formattedCount = currentCount.toLocaleString("en-US");
        const fullAriaLabel = `${stat.prefix || ""}${stat.value} ${stat.label}`.trim();

        return (
          <Reveal
            key={stat.id}
            direction="up"
            delay={index * 0.1}
            duration={0.7}
            className="h-full flex"
          >
            <article className="st-stats-card card flex h-full w-full min-h-0 flex-col items-center justify-center rounded-[24px] border border-[rgba(21,23,28,0.07)] bg-white p-[22px_18px] text-center shadow-card">
              <div className="st-stats-content">
                <div
                  className="st-stats-number-wrapper"
                  aria-label={fullAriaLabel}
                >
                  <span aria-hidden="true" className="st-stats-number font-['Noto_Kufi_Arabic',sans-serif] text-[32px] min-[600px]:text-[40px] font-black leading-[1.2] text-[#8c6a16] tabular-nums inline-flex flex-row items-baseline justify-center">
                    {stat.prefix ? (
                      <span className="st-stats-prefix">{stat.prefix}</span>
                    ) : null}
                    <span className="st-stats-digits">{formattedCount}</span>
                  </span>
                </div>
                <span aria-hidden="true" className="st-stats-accent-line" />
                <p className="st-stats-label mt-2 text-[14px] font-bold text-muted leading-[1.4] text-center">{stat.label}</p>
              </div>
            </article>
          </Reveal>
        );
      })}
    </section>
  );
}
