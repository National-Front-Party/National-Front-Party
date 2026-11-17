"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import "./RequestToast.css";

const toastContent = {
  success: {
    title: "تم إرسال طلبك بنجاح",
    subtitle: "سيتم التواصل معك في أقرب وقت",
  },
  error: {
    title: "تعذر إرسال الطلب",
    subtitle: "حاول مرة أخرى",
  },
};

export default function RequestToast({ toast, onExited }) {
  const [pointerOver, setPointerOver] = useState(false);
  const [touching, setTouching] = useState(false);

  if (!toast || typeof document === "undefined") return null;

  const isError = toast.type === "error";
  const isInterrupted = toast.phase === "interrupted";
  const content = toastContent[toast.type];

  function handleAnimationEnd(event) {
    if (event.target !== event.currentTarget) return;

    const expectedAnimation = isInterrupted
      ? "request-toast-interrupt-motion"
      : isError
        ? "request-toast-error-motion"
        : "request-toast-success-motion";

    if (
      event.animationName === expectedAnimation ||
      event.animationName === "request-toast-reduced" ||
      event.animationName === "request-toast-interrupt-reduced"
    ) {
      onExited(toast.id);
    }
  }

  return createPortal(
    <div
      className={`request-toast-layer ${
        pointerOver || touching ? "is-paused" : ""
      }`}
      dir="rtl"
      lang="ar"
    >
      <div
        className={`request-toast-capsule bg-gold-gradient ${
          isError ? "is-error" : "is-success"
        } ${isInterrupted ? "is-interrupted" : "is-shining"}`}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        aria-atomic="true"
        onPointerEnter={() => setPointerOver(true)}
        onPointerLeave={() => setPointerOver(false)}
        onTouchStart={() => setTouching(true)}
        onTouchEnd={() => setTouching(false)}
        onTouchCancel={() => setTouching(false)}
        onAnimationEnd={handleAnimationEnd}
      >
        <span className="request-toast-icon" aria-hidden="true">
          {isError ? (
            <span className="request-toast-error-icon">!</span>
          ) : (
            <svg
              className="request-toast-check"
              viewBox="0 0 32 32"
              fill="none"
            >
              <path
                d="m7 16 6 6L25 10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </svg>
          )}
        </span>
        <span className="request-toast-copy">
          <span className="request-toast-title">{content.title}</span>
          <span className="request-toast-subtitle">{content.subtitle}</span>
        </span>
      </div>
    </div>,
    document.body,
  );
}
