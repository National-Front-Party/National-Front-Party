"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

const PANEL_MAX_HEIGHT = 240;
const OPTION_HEIGHT = 48;
const VIEWPORT_PADDING = 8;
const PANEL_GAP = 6;

export default function RequestSectorSelect({
  id,
  labelId,
  options,
  value,
  onChange,
  className,
  error,
  errorId,
  triggerStyle,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listboxId = useId();
  const selectableOptions = options.filter((option) => option.value !== "");
  const selectedIndex = selectableOptions.findIndex(
    (option) => option.value === value,
  );
  const selectedOption = options.find((option) => option.value === value);
  const placeholderOption = options.find((option) => option.value === "");

  function optionId(index) {
    return `${listboxId}-option-${index}`;
  }

  function closePanel() {
    setOpen(false);
    setPosition(null);
  }

  function openPanel(index = selectedIndex >= 0 ? selectedIndex : 0) {
    if (!selectableOptions.length) return;

    setActiveIndex(index);
    setPosition(null);
    setOpen(true);
  }

  function chooseOption(option) {
    onChange(option.value);
    closePanel();
    triggerRef.current?.focus();
  }

  function moveActiveIndex(index) {
    if (!selectableOptions.length) return;

    const nextIndex =
      (index + selectableOptions.length) % selectableOptions.length;
    setActiveIndex(nextIndex);
    document
      .getElementById(optionId(nextIndex))
      ?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(event) {
    if (event.key === "Tab") {
      if (open) closePanel();
      return;
    }

    if (!open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openPanel(selectedIndex >= 0 ? selectedIndex : 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openPanel(
          selectedIndex >= 0
            ? selectedIndex
            : selectableOptions.length - 1,
        );
      } else if (event.key === "Home") {
        event.preventDefault();
        openPanel(0);
      } else if (event.key === "End") {
        event.preventDefault();
        openPanel(selectableOptions.length - 1);
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      moveActiveIndex(selectableOptions.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = selectableOptions[activeIndex];
      if (option) chooseOption(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    }
  }

  useEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(
        rect.width,
        window.innerWidth - VIEWPORT_PADDING * 2,
      );
      const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(
          rect.left,
          window.innerWidth - width - VIEWPORT_PADDING,
        ),
      );
      const availableBelow = Math.max(
        0,
        window.innerHeight -
          rect.bottom -
          PANEL_GAP -
          VIEWPORT_PADDING,
      );
      const availableAbove = Math.max(
        0,
        rect.top - PANEL_GAP - VIEWPORT_PADDING,
      );
      const expectedHeight = Math.min(
        PANEL_MAX_HEIGHT,
        selectableOptions.length * OPTION_HEIGHT + 12,
      );
      const openUp =
        availableBelow < expectedHeight &&
        availableAbove > availableBelow;

      setPosition({
        left,
        width,
        top: openUp ? undefined : rect.bottom + PANEL_GAP,
        bottom: openUp
          ? window.innerHeight - rect.top + PANEL_GAP
          : undefined,
        maxHeight: Math.min(
          PANEL_MAX_HEIGHT,
          openUp ? availableAbove : availableBelow,
        ),
        openUp,
      });
    }

    function closeOnOutsidePointer(event) {
      if (
        triggerRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }

      closePanel();
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      document.removeEventListener(
        "pointerdown",
        closeOnOutsidePointer,
        true,
      );
    };
  }, [open, selectableOptions.length]);

  const panel =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            dir="rtl"
            className="fixed z-[10000] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(21,23,28,0.14)] [scrollbar-color:var(--color-gold)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold [&::-webkit-scrollbar-track]:bg-transparent motion-reduce:animate-none"
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
              animation: "fadeUp 150ms ease-out both",
            }}
          >
            {selectableOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <div
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => chooseOption(option)}
                  className={`flex h-12 cursor-pointer items-center rounded-xl px-[14px] text-right text-[15px] text-ink transition-colors duration-150 [@media(hover:hover)]:hover:bg-gold-tint ${
                    isSelected
                      ? "bg-gold-tint font-extrabold"
                      : isActive
                        ? "bg-gold-tint"
                        : ""
                  }`}
                >
                  {option.label}
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        aria-activedescendant={
          open && selectableOptions[activeIndex]
            ? optionId(activeIndex)
            : undefined
        }
        onClick={() =>
          open
            ? closePanel()
            : openPanel(selectedIndex >= 0 ? selectedIndex : 0)
        }
        onKeyDown={handleKeyDown}
        className={`${className} flex items-center justify-between gap-3`}
        style={triggerStyle}
      >
        <span className="min-w-0 flex-1 truncate text-right text-ink">
          {(selectedOption ?? placeholderOption)?.label}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={20}
          className={`shrink-0 text-muted transition-transform duration-300 ${
            open ? "rotate-180" : ""
          } motion-reduce:transition-none`}
        />
      </button>
      {panel}
    </>
  );
}
