"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

export default function ActionDropdown({ items = [], label = "إجراءات إضافية" }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const visibleItems = items.filter((item) => item && !item.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <div className="relative inline-block text-right" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={label}
        title={label}
        className={`flex size-8 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/40 hover:scale-105 active:scale-95 cursor-pointer ${
          isOpen ? "border-gold text-ink bg-gold-tint/40 ring-2 ring-gold/20" : ""
        }`}
      >
        <MoreVertical className="size-4" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1.5 min-w-[185px] rounded-2xl border border-line bg-white p-1.5 shadow-card-hover z-50 animate-elem-fade-up text-right space-y-0.5"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {visibleItems.map((item, idx) => {
            if (item.divider) {
              return <div key={`div-${idx}`} className="my-1 border-t border-line/60" />;
            }
            return (
              <button
                key={item.id || idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-150 disabled:opacity-50 text-right cursor-pointer ${
                  item.tone === "danger"
                    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    : item.tone === "success"
                    ? "text-emerald-700 hover:bg-emerald-50"
                    : item.tone === "accent"
                    ? "text-gold-dark hover:bg-gold-tint/50"
                    : "text-ink hover:bg-page hover:text-gold-dark"
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
