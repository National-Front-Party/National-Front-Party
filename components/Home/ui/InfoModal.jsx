"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// لازم يساوي duration-200 بتاعة أنيميشن الخروج تحت
const EXIT_DURATION = 150;

export default function InfoModal({ open, onClose, title, paragraphs, source }) {
  const [portalRoot, setPortalRoot] = useState(null);
  const [rendered, setRendered] = useState(false); // موجود في الـ DOM
  const [entered, setEntered] = useState(false); // بدأ أنيميشن الدخول
  const [snap, setSnap] = useState({ title, paragraphs, source });
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);

  // نحتفظ بآخر محتوى عشان يفضل ظاهر أثناء أنيميشن الخروج
  if (
    open &&
    (snap.title !== title ||
      snap.source !== source ||
      snap.paragraphs.join("|") !== paragraphs.join("|"))
  ) {
    setSnap({ title, paragraphs, source });
  }

  // عند الفتح: نضيفه للـ DOM
  if (open && !rendered) setRendered(true);

  const isVisible = open && entered;

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) setPortalRoot(document.body);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // أنيميشن الدخول: ننتظر فريمين عشان المتصفح يرسم الحالة الأولى
  useEffect(() => {
    if (!open || !portalRoot) return;
    let frame2;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [open, portalRoot]);

  // أنيميشن الخروج: بعد ما يخلص نشيله من الـ DOM
  useEffect(() => {
    if (open || !rendered) return;
    const timer = setTimeout(() => {
      setRendered(false);
      setEntered(false);
    }, EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [open, rendered]);

  // قفل السكرول طول ما الكارد موجود
  useEffect(() => {
    if (!rendered) return;
    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
    };
  }, [rendered]);

  // زرار Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // فوكس على زرار الإغلاق بعد ما يظهر
  useEffect(() => {
    if (open && entered) closeButtonRef.current?.focus({ preventScroll: true });
  }, [open, entered]);

  if (!rendered || !portalRoot) return null;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* الخلفية */}
      <button
        type="button"
        aria-label="إغلاق النافذة"
        onClick={onClose}
        tabIndex={-1}
        className={`absolute inset-0 z-0 bg-black/60 transition-[opacity,backdrop-filter] ease-out ${isVisible
            ? "opacity-100 backdrop-blur-sm duration-300"
            : "opacity-0 backdrop-blur-0 duration-200"
          }`}
      />

      {/* الكارد */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        className={`relative z-10 max-h-[85vh] w-[92%] max-w-[800px] overflow-y-auto rounded-3xl border-t-[6px] border-gold bg-white shadow-card transition-[opacity,transform] transform-gpu will-change-transform ${isVisible
            ? "translate-y-0 opacity-100 duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-y-0 opacity-0 duration-150 ease-out"
          }`}

      >
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 text-right">
            <h2
              id="info-modal-title"
              className="text-2xl font-extrabold text-ink md:text-3xl"
            >
              {snap.title}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="إغلاق"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink transition duration-300 hover:rotate-90 hover:bg-page"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>

          <div className="mt-6 space-y-4 text-right text-lg leading-loose text-ink">
            {snap.paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph}`}>{paragraph}</p>
            ))}
          </div>

          <p className="mt-8 text-sm text-muted">المصدر: {snap.source}</p>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}