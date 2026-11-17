"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export const inputBase =
  "h-14 w-full rounded-2xl border border-border bg-white px-4 text-right text-ink shadow-none transition-all duration-300 ease-out hover:border-gold/60 hover:shadow-[0_8px_20px_-6px_rgba(201,162,74,0.35)] focus:outline-none focus:border-gold focus:-translate-y-0.5 focus:shadow-[0_10px_25px_-6px_rgba(201,162,74,0.45)] focus:ring-2 focus:ring-gold/25 disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed";

export const inputError =
  "border-red-500 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.35)] hover:border-red-500 hover:shadow-[0_8px_20px_-6px_rgba(239,68,68,0.35)] focus:border-red-500 focus:shadow-[0_8px_20px_-6px_rgba(239,68,68,0.35)] focus:ring-red-500/25 disabled:shadow-none";

const PANEL_MAX_HEIGHT = 256;

const CustomSelect = forwardRef(function CustomSelect(
  {
    id,
    label,
    placeholder,
    options,
    value,
    onChange,
    onBlur,
    error,
    disabled,
    required,
  },
  forwardedRef,
) {
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const openRef = useRef(false);
  const optionRefs = useRef(new Map());
  const closeTimerRef = useRef(null);
  const openFrameRef = useRef(null);
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef(null);
  const listboxId = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  useImperativeHandle(forwardedRef, () => ({
    focus: () => triggerRef.current?.focus(),
  }), []);

  const normalizedSearch = search.trim().normalize("NFKC").toLocaleLowerCase("ar");
  const filteredOptions = options.filter((option) =>
    option.label.normalize("NFKC").toLocaleLowerCase("ar").includes(normalizedSearch),
  );
  const selectedOption = options.find((option) => option.value === value);

  const calculatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const availableBelow = Math.max(0, window.innerHeight - rect.bottom - 16);
    const availableAbove = Math.max(0, rect.top - 16);
    const openUp = availableBelow < PANEL_MAX_HEIGHT && availableAbove > availableBelow;

    return {
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom,
      bottom: openUp ? window.innerHeight - rect.top : undefined,
      maxHeight: Math.min(
        PANEL_MAX_HEIGHT,
        openUp ? availableAbove : availableBelow,
      ),
      openUp,
    };
  }, []);

  const closeDropdown = useCallback(
    ({ restoreFocus = false } = {}) => {
      if (openFrameRef.current) cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
      openRef.current = false;
      setOpen(false);
      setSearch("");
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => setPanelMounted(false), 200);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [],
  );

  const openDropdown = useCallback(() => {
    if (disabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    openRef.current = true;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setPosition(calculatePosition());
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setPanelMounted(true);
    openFrameRef.current = requestAnimationFrame(() => {
      openFrameRef.current = null;
      setOpen(true);
    });
  }, [calculatePosition, disabled, options, value]);

  const selectOption = useCallback(
    (option) => {
      triggerRef.current?.focus();
      onChange(option.value);
      closeDropdown();
    },
    [closeDropdown, onChange],
  );

  const moveHighlight = useCallback(
    (nextIndex) => {
      if (!filteredOptions.length) return;
      const index =
        (nextIndex + filteredOptions.length) % filteredOptions.length;
      setHighlightedIndex(index);
      requestAnimationFrame(() => {
        optionRefs.current
          .get(filteredOptions[index].value)
          ?.scrollIntoView({ block: "nearest" });
      });
    },
    [filteredOptions],
  );

  function handleMenuKeyDown(event) {
    const dropdownOpen = openRef.current;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!dropdownOpen) openDropdown();
      else moveHighlight(highlightedIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!dropdownOpen) openDropdown();
      else moveHighlight(highlightedIndex - 1);
    } else if (event.key === "Home" && dropdownOpen) {
      event.preventDefault();
      moveHighlight(0);
    } else if (event.key === "End" && dropdownOpen) {
      event.preventDefault();
      moveHighlight(filteredOptions.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && !dropdownOpen) {
      event.preventDefault();
      openDropdown();
    } else if ((event.key === "Enter" || event.key === " ") && dropdownOpen) {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex] ?? filteredOptions[0];
      if (option) selectOption(option);
    } else if (event.key === "Escape" && dropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeDropdown({ restoreFocus: true });
    } else if (
      dropdownOpen &&
      event.target !== searchRef.current &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const nextSearch = `${typeaheadRef.current}${event.key}`
        .normalize("NFKC")
        .toLocaleLowerCase("ar");
      typeaheadRef.current = nextSearch;
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = setTimeout(() => {
        typeaheadRef.current = "";
      }, 500);

      const startIndex = Math.max(highlightedIndex, 0);
      const matchOffset = filteredOptions
        .slice(startIndex)
        .concat(filteredOptions.slice(0, startIndex))
        .findIndex((option) =>
          option.label.normalize("NFKC").toLocaleLowerCase("ar").startsWith(nextSearch),
        );
      if (matchOffset >= 0) {
        moveHighlight((startIndex + matchOffset) % filteredOptions.length);
      }
    }
  }

  useEffect(() => {
    if (!open) return;

    let frame;
    const schedulePositionUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPosition(calculatePosition()));
    };

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);
    window.visualViewport?.addEventListener("resize", schedulePositionUpdate);
    window.visualViewport?.addEventListener("scroll", schedulePositionUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      window.visualViewport?.removeEventListener("resize", schedulePositionUpdate);
      window.visualViewport?.removeEventListener("scroll", schedulePositionUpdate);
    };
  }, [calculatePosition, open]);

  useEffect(() => {
    if (!open) return;

    function handleOutsidePointerDown(event) {
      if (
        rootRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      closeDropdown();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [closeDropdown, open]);

  useEffect(() => {
    if (!open) return;

    function handleCaptureKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeDropdown({ restoreFocus: true });
      } else if (event.key === "Tab") {
        closeDropdown();
        if (event.target === searchRef.current) triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleCaptureKeyDown, true);
    return () =>
      document.removeEventListener("keydown", handleCaptureKeyDown, true);
  }, [closeDropdown, open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
      if (openFrameRef.current) cancelAnimationFrame(openFrameRef.current);
    },
    [],
  );

  function handleBlur(event) {
    if (
      rootRef.current?.contains(event.relatedTarget) ||
      panelRef.current?.contains(event.relatedTarget)
    ) {
      return;
    }
    onBlur?.(event);
  }

  const panel =
    panelMounted && position && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            dir="rtl"
            className={`fixed z-[120] max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-[opacity,transform] duration-200 ease-out [scrollbar-color:var(--color-gold)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gold [&::-webkit-scrollbar-track]:bg-transparent motion-reduce:animate-none motion-reduce:transition-none ${
              position.openUp ? "mb-2 origin-bottom" : "mt-2 origin-top"
            } ${
              open
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-95 opacity-0"
            }`}
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
          >
            {options.length > 8 ? (
              <input
                ref={searchRef}
                type="search"
                aria-label={`ابحث في ${label}`}
                placeholder="ابحث..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setHighlightedIndex(0);
                  panelRef.current?.scrollTo({ top: 0 });
                }}
                onKeyDown={handleMenuKeyDown}
                onBlur={handleBlur}
                className="sticky top-0 z-10 mb-2 h-10 w-full rounded-xl border border-border bg-white px-3 text-right text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25 motion-reduce:transition-none"
              />
            ) : null}
            <ul
              id={listboxId}
              role="listbox"
              aria-labelledby={labelId}
              className="space-y-1"
            >
              {filteredOptions.length ? (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={option.value}
                      ref={(node) => {
                        if (node) optionRefs.current.set(option.value, node);
                        else optionRefs.current.delete(option.value);
                      }}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectOption(option)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-right text-ink transition-all duration-200 hover:-translate-x-1 ${
                        isSelected
                          ? "bg-gold/15 font-bold"
                          : isHighlighted
                            ? "-translate-x-1 bg-gold-tint"
                            : "hover:bg-gold-tint"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <Check aria-hidden="true" size={18} className="shrink-0 text-gold" />
                      ) : null}
                    </li>
                  );
                })
              ) : (
                <li role="presentation" className="px-4 py-6 text-center text-sm text-muted">
                  لا توجد نتائج
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  const openClassName =
    open && !error
      ? "border-gold -translate-y-0.5 shadow-[0_10px_25px_-6px_rgba(201,162,74,0.45)] ring-2 ring-gold/25"
      : "";

  return (
    <div ref={rootRef} dir="rtl">
      <label
        id={labelId}
        htmlFor={`${id}-trigger`}
        className="mb-2 block text-sm font-bold text-ink"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="mr-1 text-gold">
            *
          </span>
        ) : null}
      </label>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && highlightedIndex >= 0 && filteredOptions[highlightedIndex]
            ? `${listboxId}-option-${highlightedIndex}`
            : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        aria-required={required}
        disabled={disabled}
        onClick={() => (openRef.current ? closeDropdown() : openDropdown())}
        onKeyDown={handleMenuKeyDown}
        onBlur={handleBlur}
        className={`${inputBase} ${error ? inputError : ""} ${openClassName} flex items-center justify-between gap-3 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:transform-none`}
      >
        <span className={selectedOption ? "text-ink" : "text-muted"}>
          {selectedOption?.label ?? placeholder}
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
    </div>
  );
});

export default CustomSelect;
