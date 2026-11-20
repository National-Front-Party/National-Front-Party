"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export default function ActionDropdown({ items = [], label = "إجراءات إضافية" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const visibleItems = items.filter((item) => item && !item.hidden);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // If button is off-screen (e.g. scrolled past viewport), close menu
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const menuWidth = 200;
    const estimatedHeight = Math.min(320, visibleItems.length * 42 + 24);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Prefer opening downwards unless there's not enough room below and more room above
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    // Horizontal positioning for RTL / Arabic interface:
    // Align menu to the left edge of the button so it expands rightward toward the page content
    let left = rect.left;
    // Ensure menu does not exceed the right edge of viewport
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }
    // Ensure menu does not exceed the left edge of viewport
    if (left < 12) {
      left = 12;
    }

    setPosition({
      top: openUp ? undefined : Math.round(rect.bottom + 6),
      bottom: openUp ? Math.round(window.innerHeight - rect.top + 6) : undefined,
      left: Math.round(left),
      openUp,
    });
  }, [visibleItems.length]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Re-verify position on open
    updatePosition();

    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  if (visibleItems.length === 0) return null;

  const menuPortal =
    isOpen && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            dir="rtl"
            className={`fixed z-[9999] min-w-[195px] max-w-[260px] rounded-2xl border border-line bg-white/98 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md text-right space-y-0.5 animate-elem-scale-in transition-[transform,opacity] duration-150 ${
              position.openUp ? "origin-bottom" : "origin-top"
            }`}
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
            }}
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
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-150 disabled:opacity-50 text-right cursor-pointer select-none ${
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative inline-block text-right">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={label}
        className={`flex size-8 items-center justify-center rounded-xl border border-line bg-white text-muted shadow-2xs transition-all duration-200 hover:border-gold hover:text-ink hover:bg-gold-tint/40 hover:scale-105 active:scale-95 cursor-pointer ${
          isOpen ? "border-gold text-ink bg-gold-tint/40 ring-2 ring-gold/20" : ""
        }`}
      >
        <MoreVertical className="size-4" />
      </button>

      {menuPortal}
    </div>
  );
}
