"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return typeof document === "undefined" ? null : document.body;
}

function getServerSnapshot() {
  return null;
}

const ToastContext = createContext({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
});

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const portalTarget = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = "success", duration = 4000 }) => {
    const id = ++toastIdCounter;
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, duration = 4000) => {
    return showToast({ message, type: "success", duration });
  }, [showToast]);

  const showError = useCallback((message, duration = 5000) => {
    return showToast({ message, type: "error", duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      {portalTarget && toasts.length > 0 &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-6 sm:bottom-6"
          >
            {toasts.map((toast) => {
              const isError = toast.type === "error";
              return (
                <div
                  key={toast.id}
                  role="status"
                  className={`pointer-events-auto flex w-full max-w-xl min-w-0 items-start gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-xl transition-all duration-300 animate-elem-scale-in motion-reduce:animate-none sm:items-center sm:rounded-full sm:px-5 sm:py-2.5 ${
                    isError
                      ? "border border-red-500/40 bg-[#2A1517] text-red-200 shadow-red-950/40"
                      : "border border-gold/40 bg-ink text-gold-light shadow-black/40"
                  }`}
                >
                  {isError ? (
                    <svg aria-hidden="true" className="mt-1 size-4 shrink-0 text-red-400 sm:mt-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="mt-1 size-4 shrink-0 text-gold sm:mt-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span className="min-w-0 flex-1 whitespace-normal break-words leading-6 [overflow-wrap:anywhere]">{toast.message}</span>
                </div>
              );
            })}
          </div>,
          portalTarget,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
