"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeReducedMotion(callback) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function noopSubscribe() {
  return () => {};
}

function getHasIntersectionSnapshot() {
  return typeof window !== "undefined" && "IntersectionObserver" in window;
}

function getServerTrue() {
  return true;
}

function getServerFalse() {
  return false;
}

export default function Reveal({
  children,
  direction = "up", // "up" | "down" | "left" | "right" | "scale" | "none"
  delay = 0,
  duration = 0.7,
  threshold = 0.15,
  className = "",
  as: Component = "div",
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  const prefersReduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerFalse
  );

  const hasIntersectionObserver = useSyncExternalStore(
    noopSubscribe,
    getHasIntersectionSnapshot,
    getServerTrue
  );

  useEffect(() => {
    if (prefersReduced || !hasIntersectionObserver) return undefined;

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasIntersectionObserver, prefersReduced, threshold]);

  const shown = prefersReduced || !hasIntersectionObserver || isVisible;

  const getTransform = () => {
    if (shown) return "none";
    switch (direction) {
      case "up":
        return "translateY(32px)";
      case "down":
        return "translateY(-32px)";
      case "right":
        return "translateX(36px)";
      case "left":
        return "translateX(-36px)";
      case "scale":
        return "scale(0.92) translateY(16px)";
      case "none":
      default:
        return "none";
    }
  };

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: getTransform(),
        transitionProperty: prefersReduced ? "none" : "opacity, transform",
        transitionDuration: `${duration}s`,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${delay}s`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
