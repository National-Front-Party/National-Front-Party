"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { inputBase } from "@/components/Home/ui/CustomSelect";
import "./GovernoratesSecretariats.css";
import {
  GOVERNORATE_FALLBACK,
  GOVERNORATE_PEOPLE,
  MAIN_GOVERNORATES,
  OTHER_GOVERNORATES,
} from "@/data/mock/governoratesMock";

const ALL_GOVERNORATES = [...MAIN_GOVERNORATES, ...OTHER_GOVERNORATES];
const SHEET_EXIT_DURATION = 250;
const styles = {
  card: "governorates-card",
  cardHeader: "governorates-card-header",
  cardTitle: "governorates-card-title",
  titleUnderline: "governorates-title-underline",
  cardBody: "governorates-card-body",
  governorateList: "governorates-list",
  governorateBox: "governorates-box",
  governorateBoxOpen: "governorates-box-open",
  governorateButton: "governorates-button",
  governorateButtonOpen: "governorates-button-open",
  chevron: "governorates-chevron",
  pinIcon: "governorates-pin-icon",
  governorateName: "governorates-name",
  panelShell: "governorates-panel-shell",
  panelShellOpen: "governorates-panel-shell-open",
  panelContent: "governorates-panel-content",
  peopleList: "governorates-people-list",
  personRow: "governorates-person-row",
  personAvatar: "governorates-person-avatar",
  personText: "governorates-person-text",
  personName: "governorates-person-name",
  personRole: "governorates-person-role",
  browseButton: "governorates-browse-button",
  gobar: "governorates-gobar",
  gobarArrow: "governorates-gobar-arrow",
  sheetBackdrop: "governorates-sheet-backdrop",
  sheetBackdropClosing: "governorates-sheet-backdrop-closing",
  sheetDialog: "governorates-sheet-dialog",
  sheetDialogClosing: "governorates-sheet-dialog-closing",
  dragHandle: "governorates-drag-handle",
  sheetHeader: "governorates-sheet-header",
  sheetTitle: "governorates-sheet-title",
  closeButton: "governorates-close-button",
  searchWrap: "governorates-search-wrap",
  searchInput: "governorates-search-input",
  governorateOptions: "governorates-options",
  governorateOption: "governorates-option",
  governorateOptionSelected: "governorates-option-selected",
  selectedDot: "governorates-selected-dot",
  noResults: "governorates-no-results",
  srOnly: "governorates-sr-only",
};

function MapPin({ small = false }) {
  return (
    <svg
      aria-hidden="true"
      width={small ? 16 : 18}
      height={small ? 16 : 18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      className={styles.chevron}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function normalizeArabic(value) {
  return value
    .normalize("NFKC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ar");
}

export default function GovernoratesSecretariats() {
  const [openGovernorate, setOpenGovernorate] = useState(MAIN_GOVERNORATES[0]);
  const [extraGovernorate, setExtraGovernorate] = useState(null);
  const [sheetPhase, setSheetPhase] = useState("closed");
  const [search, setSearch] = useState("");
  const [scrollTarget, setScrollTarget] = useState(null);
  const portalRoot =
    typeof document === "undefined" ? null : document.body;
  const cardId = useId().replace(/:/g, "");
  const browseButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const searchInputRef = useRef(null);
  const rowRefs = useRef(new Map());
  const optionRefs = useRef(new Map());
  const closeTimerRef = useRef(null);
  const sheetWasMountedRef = useRef(false);
  const sheetIsMounted = sheetPhase !== "closed";

  const visibleGovernorates = useMemo(() => {
    if (!extraGovernorate || MAIN_GOVERNORATES.includes(extraGovernorate)) {
      return MAIN_GOVERNORATES;
    }

    return [...MAIN_GOVERNORATES.slice(0, 7), extraGovernorate];
  }, [extraGovernorate]);

  const filteredGovernorates = useMemo(() => {
    const normalizedQuery = normalizeArabic(search);

    if (!normalizedQuery) return ALL_GOVERNORATES;

    return ALL_GOVERNORATES.filter((name) =>
      normalizeArabic(name).includes(normalizedQuery),
    );
  }, [search]);

  useEffect(() => {
    if (!sheetIsMounted) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetIsMounted]);

  const closeSheet = useCallback(() => {
    if (!sheetIsMounted || sheetPhase === "closing") return;

    setSheetPhase("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setSheetPhase("closed");
    }, SHEET_EXIT_DURATION);
  }, [sheetIsMounted, sheetPhase]);

  useEffect(() => {
    if (!sheetIsMounted) return undefined;

    function handleEscape(event) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      closeSheet();
    }

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeSheet, sheetIsMounted]);

  useEffect(() => {
    if (sheetPhase !== "open") return undefined;

    const focusTimer = window.setTimeout(() => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        searchInputRef.current?.focus();
      } else {
        dialogRef.current?.querySelector("button")?.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [sheetPhase]);

  useEffect(() => {
    if (sheetWasMountedRef.current && !sheetIsMounted) {
      browseButtonRef.current?.focus();
    }

    sheetWasMountedRef.current = sheetIsMounted;
  }, [sheetIsMounted]);

  useEffect(() => {
    if (sheetIsMounted || !scrollTarget) return undefined;

    const frame = window.requestAnimationFrame(() => {
      rowRefs.current.get(scrollTarget)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
      });
      setScrollTarget(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sheetIsMounted, scrollTarget, visibleGovernorates]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  function openSheet() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setSearch("");
    setSheetPhase("open");
  }

  function handleSheetSelect(name) {
    if (!MAIN_GOVERNORATES.includes(name)) {
      setExtraGovernorate(name);
    }

    setOpenGovernorate(name);
    setScrollTarget(name);
    closeSheet();
  }

  function handleDialogKeyDown(event) {
    if (event.key !== "Tab") return;

    const focusableElements = dialogRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const focusable = Array.from(focusableElements ?? []);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !dialogRef.current?.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !dialogRef.current?.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleOptionKeyDown(event, index) {
    let nextIndex = index;

    if (event.key === "ArrowDown") nextIndex = (index + 1) % filteredGovernorates.length;
    else if (event.key === "ArrowUp") {
      nextIndex = (index - 1 + filteredGovernorates.length) % filteredGovernorates.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = filteredGovernorates.length - 1;
    else return;

    event.preventDefault();
    optionRefs.current.get(filteredGovernorates[nextIndex])?.focus();
  }

  return (
    <>
      <section
        id="c-govs"
        tabIndex={-1}
        aria-labelledby={`${cardId}-title`}
        dir="rtl"
        lang="ar"
        className={`${styles.card} flex h-full min-h-0 w-full flex-1 flex-col scroll-mt-28 focus:outline-none`}
      >
        <header className={styles.cardHeader}>
          <h2 id={`${cardId}-title`} className={styles.cardTitle}>
            أمانات المحافظات
          </h2>
          <div aria-hidden="true" className={styles.titleUnderline} />
        </header>

        <div className={styles.cardBody}>
          <div className={styles.governorateList}>
            {visibleGovernorates.map((name, index) => {
              const isOpen = openGovernorate === name;
              const panelId = `${cardId}-panel-${index}`;
              const buttonId = `${cardId}-button-${index}`;
              const people = GOVERNORATE_PEOPLE[name] ?? [GOVERNORATE_FALLBACK];

              return (
                <article
                  key={name}
                  ref={(node) => {
                    if (node) rowRefs.current.set(name, node);
                    else rowRefs.current.delete(name);
                  }}
                  className={`${styles.governorateBox} ${
                    isOpen ? styles.governorateBoxOpen : ""
                  }`}
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={`${styles.governorateButton} ${
                      isOpen ? styles.governorateButtonOpen : ""
                    }`}
                    onClick={() =>
                      setOpenGovernorate((current) =>
                        current === name ? null : name,
                      )
                    }
                  >
                    <span className={styles.pinIcon}>
                      <MapPin />
                    </span>
                    <span className={styles.governorateName}>{name}</span>
                    <ChevronDown />
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    aria-hidden={!isOpen}
                    className={`${styles.panelShell} ${
                      isOpen ? styles.panelShellOpen : ""
                    }`}
                  >
                    <div className={styles.panelContent}>
                      <div className={styles.peopleList}>
                        {people.map((person) => (
                          <div key={`${name}-${person.name}`} className={styles.personRow}>
                            {person.photo ? (
                              <Image
                                src={person.photo}
                                alt=""
                                width={44}
                                height={44}
                                className={styles.personAvatar}
                              />
                            ) : null}
                            <div className={styles.personText}>
                              <p className={styles.personName}>{person.name}</p>
                              <p className={styles.personRole}>{person.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            ref={browseButtonRef}
            type="button"
            className={styles.browseButton}
            onClick={openSheet}
          >
            تصفح باقي المحافظات
          </button>
        </div>

        <a
          href="#geo"
          aria-label="ابحث عن أمانتك"
          className={`${styles.gobar} bg-gold-gradient mt-auto shrink-0`}
        >
          <svg
            aria-hidden="true"
            className={styles.gobarArrow}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 12H4M10 6l-6 6 6 6" />
          </svg>
        </a>
      </section>

      {portalRoot && sheetIsMounted
        ? createPortal(
            <div
              className={`${styles.sheetBackdrop} ${
                sheetPhase === "closing" ? styles.sheetBackdropClosing : ""
              }`}
              data-phase={sheetPhase}
              onClick={(event) => {
                if (event.target === event.currentTarget) closeSheet();
              }}
            >
              <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${cardId}-sheet-title`}
                aria-describedby={`${cardId}-sheet-description`}
                tabIndex={-1}
                dir="rtl"
                lang="ar"
                className={`${styles.sheetDialog} ${
                  sheetPhase === "closing" ? styles.sheetDialogClosing : ""
                }`}
                onKeyDown={handleDialogKeyDown}
              >
                <div aria-hidden="true" className={styles.dragHandle} />
                <header className={styles.sheetHeader}>
                  <h2 id={`${cardId}-sheet-title`} className={styles.sheetTitle}>
                    كل المحافظات
                  </h2>
                  <button
                    type="button"
                    aria-label="إغلاق"
                    className={styles.closeButton}
                    onClick={closeSheet}
                  >
                    <CloseIcon />
                  </button>
                </header>
                <p id={`${cardId}-sheet-description`} className={styles.srOnly}>
                  ابحث عن محافظة ثم اخترها لعرض الأمانة التابعة لها.
                </p>

                <div className={styles.searchWrap}>
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث عن محافظة"
                    aria-label="ابحث عن محافظة"
                    className={`${inputBase} ${styles.searchInput}`}
                  />
                </div>

                <div
                  role="listbox"
                  aria-label="المحافظات"
                  className={styles.governorateOptions}
                >
                  {filteredGovernorates.length ? (
                    filteredGovernorates.map((name, index) => {
                      const isSelected = openGovernorate === name;

                      return (
                        <button
                          key={name}
                          ref={(node) => {
                            if (node) optionRefs.current.set(name, node);
                            else optionRefs.current.delete(name);
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`${styles.governorateOption} ${
                            isSelected ? styles.governorateOptionSelected : ""
                          }`}
                          onClick={() => handleSheetSelect(name)}
                          onKeyDown={(event) =>
                            handleOptionKeyDown(event, index)
                          }
                        >
                          <MapPin small />
                          <span>{name}</span>
                          {isSelected ? (
                            <span
                              aria-hidden="true"
                              className={styles.selectedDot}
                            />
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p role="status" className={styles.noResults}>
                      لا توجد نتائج
                    </p>
                  )}
                </div>
              </section>
            </div>,
            portalRoot,
          )
        : null}
    </>
  );
}
