"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
      dir="rtl"
      lang="ar"
      aria-label="الحزب في أرقام"
      className="st-stats-section"
    >
      {STATS.map((stat) => {
        const currentCount = prefersReducedMotion
          ? stat.value
          : (counts[stat.id] ?? 0);
        const formattedCount = currentCount.toLocaleString("en-US");
        const fullAriaLabel = `${stat.prefix || ""}${stat.value} ${stat.label}`.trim();

        return (
          <article key={stat.id} className="st-stats-card card">
            <div className="st-stats-content">
              <div
                className="st-stats-number-wrapper"
                aria-label={fullAriaLabel}
              >
                <span aria-hidden="true" className="st-stats-number">
                  {stat.prefix ? (
                    <span className="st-stats-prefix">{stat.prefix}</span>
                  ) : null}
                  <span className="st-stats-digits">{formattedCount}</span>
                </span>
              </div>
              <span aria-hidden="true" className="st-stats-accent-line" />
              <p className="st-stats-label">{stat.label}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
