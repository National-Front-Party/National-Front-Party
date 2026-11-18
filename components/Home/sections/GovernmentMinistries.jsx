"use client";

import { useRef } from "react";
import SectionCard from "@/components/Home/ui/SectionCard";

export default function GovernmentMinistries({
  data,
  selected,
  onSelect,
  hasError = false,
}) {
  const radioRefs = useRef([]);
  const selectedIndex = data.ministries.findIndex(
    (ministry) => ministry.id === selected,
  );
  const tabStopIndex = selectedIndex < 0 ? 0 : selectedIndex;

  function handleKeyDown(event, index) {
    let nextIndex;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (index + 1) % data.ministries.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex =
          (index - 1 + data.ministries.length) % data.ministries.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = data.ministries.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onSelect(data.ministries[nextIndex].id);
    radioRefs.current[nextIndex]?.focus();
  }

  return (
    <SectionCard
      title={data.ministriesTitle}
      className={`!h-auto !min-h-0 !w-full !flex-none self-start transition-all duration-300 ${
        hasError
          ? "!border-[#C0392B] ring-2 ring-[#C0392B]/30 shadow-[0_0_15px_rgba(192,57,43,0.2)]"
          : ""
      }`}
      headerClassName="!pb-2.5"
      contentClassName="!pb-4 px-3"
    >
      <ul
        dir="rtl"
        role="radiogroup"
        aria-label={data.ministriesTitle}
        className="space-y-0"
      >
        {data.ministries.map((ministry, index) => {
          const isSelected = selected === ministry.id;
          const isLast = index === data.ministries.length - 1;
          const hoverStyles = isSelected
            ? ""
            : "[@media(hover:hover)]:hover:bg-ink [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:px-5 [@media(hover:hover)]:hover:border-transparent";

          return (
            <li
              key={ministry.id || ministry.dbId || String(index)}
              className="animate-elem-fade-up motion-reduce:animate-none"
              style={{ animationDelay: `${index * 50 + 100}ms` }}
            >
              <button
                ref={(element) => {
                  radioRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={index === tabStopIndex ? 0 : -1}
                onClick={() => onSelect(ministry.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`group/ministry-row flex min-h-10 w-full items-center gap-3 rounded-xl ${
                  isLast ? "" : "border-b border-line"
                } px-3.5 py-1.5 text-right text-sm text-ink transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${hoverStyles}`}
              >
                <span
                  aria-hidden="true"
                  className={`size-3.5 shrink-0 rounded-full border border-gold ${
                    isSelected ? "bg-gold" : "bg-white"
                  } [@media(hover:hover)]:group-hover/ministry-row:border-2`}
                />
                <span className="min-w-0 flex-1 text-right text-sm font-bold leading-snug">
                  {ministry.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
