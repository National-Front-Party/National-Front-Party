
"use client";

// Shared modal shell. Provides the generic modal frame only: portal rendering,
// dark blurred overlay, gold top strip, title row with a close button, ESC and
// overlay-click to close, body scroll lock, focus trap, and focus restoration.
// Content is passed through `children`, so any modal can reuse it.

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function subscribeToPortalRoot() {
  return () => {};
}

function getPortalRootSnapshot() {
  return typeof document === "undefined" ? null : document.body;
}

function getServerPortalRootSnapshot() {
  return null;
}

export default function ModalShell({
  open,
  onClose,
  title,
  maxWidth = "max-w-[800px]",
  hideScrollbar = true,
  children,
}) {
  const portalRoot = useSyncExternalStore(
    subscribeToPortalRoot,
    getPortalRootSnapshot,
    getServerPortalRootSnapshot,
  );

  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !portalRoot) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      const focusable = Array.from(focusableElements ?? []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsOutside = !dialogRef.current?.contains(
        document.activeElement,
      );

      if (!first) {
        event.preventDefault();
        closeButtonRef.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || focusIsOutside)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || focusIsOutside)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus?.({ preventScroll: true });
      }
    };
  }, [open, portalRoot]);

  if (!open || !portalRoot) return null;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="إغلاق النافذة"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 z-0 animate-modal-overlay-enter bg-black/60 backdrop-blur-sm motion-reduce:animate-none"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 max-h-[90vh] w-[92%] ${maxWidth} animate-modal-shell-enter overflow-x-hidden overflow-y-auto rounded-3xl border-t-[6px] border-gold bg-white shadow-card motion-reduce:animate-none ${
          hideScrollbar
            ? "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            : ""
        }`}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 text-right">
            <h2
              id={titleId}
              className="text-2xl font-extrabold text-ink md:text-3xl"
            >
              {title}
            </h2>

            <button
              ref={closeButtonRef}
              type="button"
              aria-label="إغلاق"
              onClick={onClose}
              className="group flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-gradient text-ink shadow-[0_0_8px_rgba(201,162,74,0.25)] transition-all duration-300 ease-out hover:scale-110 hover:rotate-90 hover:shadow-[0_0_14px_rgba(201,162,74,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <X
                aria-hidden="true"
                size={20}
                strokeWidth={2.5}
              />
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
