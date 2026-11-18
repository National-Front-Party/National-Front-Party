"use client";

import { useEffect, useRef, useState } from "react";
import CustomSelect, {
  inputBase,
} from "@/components/Home/ui/CustomSelect";
import {
  GOVERNORATE_FALLBACK,
  GOVERNORATE_PEOPLE,
} from "@/data/mock/governoratesMock";
import {
  GEO_GOVERNORATES,
  MARKAZ_BY_GOVERNORATE,
} from "@/data/mock/geoSearchMock";
import "./GeographicSearch.css";

const emptyFilters = {
  governorate: "",
  markaz: "",
  village: "",
  ezba: "",
};

export default function GeographicSearch() {
  const [filters, setFilters] = useState(emptyFilters);
  const [result, setResult] = useState(null);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  function hideResult() {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    if (!result) {
      setExiting(false);
      return;
    }

    setExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setResult(null);
      setExiting(false);
    }, 200);
  }

  function updateFilter(field, value) {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);

    if (field === "governorate") {
      nextFilters.markaz = "";
      setFilters(nextFilters);
      if (value === "") hideResult();
      else hideResult();
      return;
    }

    if (
      !nextFilters.governorate &&
      !nextFilters.markaz &&
      !nextFilters.village &&
      !nextFilters.ezba
    ) {
      hideResult();
    } else if (result?.kind === "empty") {
      hideResult();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setExiting(false);

    if (!filters.governorate) {
      setResult({
        kind: "empty",
        title: "اختر المحافظة أولا",
        subtitle: "حدد المحافظة ثم المركز والقرية والعزبة.",
        rows: [],
      });
      return;
    }

    const scopeParts = [];
    if (filters.markaz.trim()) scopeParts.push(`مركز ${filters.markaz.trim()}`);
    if (filters.village.trim()) {
      scopeParts.push(`قرية ${filters.village.trim()}`);
    }
    if (filters.ezba.trim()) scopeParts.push(`عزبة ${filters.ezba.trim()}`);

    const people = GOVERNORATE_PEOPLE[filters.governorate];
    const rows = people?.length
      ? people.map(({ name, role }) => ({ name, role }))
      : [
          {
            name: GOVERNORATE_FALLBACK.name,
            role: GOVERNORATE_FALLBACK.role,
          },
        ];

    setResult({
      kind: "governorate",
      title: `أمانة حزب الجبهة الوطنية بمحافظة ${filters.governorate}`,
      subtitle: scopeParts.length
        ? `النطاق: ${scopeParts.join(" - ")}`
        : "النطاق: المحافظة كلها",
      rows,
    });
  }

  const markazOptions = MARKAZ_BY_GOVERNORATE[filters.governorate] ?? [];
  const governorateOptions = GEO_GOVERNORATES.map((name) => ({
    value: name,
    label: name,
  }));

  return (
    <section
      id="geo"
      tabIndex={-1}
      dir="rtl"
      lang="ar"
      aria-label="البحث الجغرافي"
      className="geo-section mx-auto mt-[18px] w-full max-w-[1320px] px-5 text-right scroll-mt-28 focus:outline-none"
    >
      <form
        className="geo-search-bar flex w-full flex-col gap-[10px] rounded-[28px] bg-ink p-[8px_10px] shadow-[0_20px_44px_rgba(21,23,28,0.28)] min-[700px]:flex-row min-[700px]:flex-wrap min-[1100px]:flex-nowrap min-[1100px]:items-center min-[1100px]:gap-2"
        onSubmit={handleSubmit}
      >
        <div className="geo-governorate w-full min-[700px]:w-[calc(50%-5px)] min-[700px]:flex-[1_1_calc(50%-10px)] min-[1100px]:w-0 min-[1100px]:flex-1 min-[1100px]:min-w-0">
          <CustomSelect
            id="geo-governorate"
            label="المحافظة"
            placeholder="المحافظة"
            options={[
              { value: "", label: "المحافظة" },
              ...governorateOptions,
            ]}
            value={filters.governorate}
            onChange={(value) => updateFilter("governorate", value)}
          />
        </div>

        <input
          type="text"
          list="geo-markaz-list"
          value={filters.markaz}
          onChange={(event) => updateFilter("markaz", event.target.value)}
          placeholder="المركز"
          aria-label="المركز"
          className={`${inputBase} geo-field geo-markaz w-full min-[700px]:w-[calc(50%-5px)] min-[700px]:flex-[1_1_calc(50%-10px)] min-[1100px]:w-0 min-[1100px]:flex-1 min-[1100px]:min-w-0`}
        />
        <datalist id="geo-markaz-list">
          {markazOptions.map((markaz) => (
            <option key={markaz} value={markaz} />
          ))}
        </datalist>

        <input
          type="text"
          value={filters.village}
          onChange={(event) => updateFilter("village", event.target.value)}
          placeholder="القرية"
          aria-label="القرية"
          className={`${inputBase} geo-field geo-village w-full min-[700px]:w-[calc(50%-5px)] min-[700px]:flex-[1_1_calc(50%-10px)] min-[1100px]:w-0 min-[1100px]:flex-1 min-[1100px]:min-w-0`}
        />

        <input
          type="text"
          value={filters.ezba}
          onChange={(event) => updateFilter("ezba", event.target.value)}
          placeholder="العزبة"
          aria-label="العزبة"
          className={`${inputBase} geo-field geo-ezba w-full min-[700px]:w-[calc(50%-5px)] min-[700px]:flex-[1_1_calc(50%-10px)] min-[1100px]:w-0 min-[1100px]:flex-1 min-[1100px]:min-w-0`}
        />

        <button type="submit" className="geo-search-button bg-gold-gradient w-full min-[1100px]:w-auto min-[1100px]:flex-none">
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span>بحث</span>
        </button>
      </form>

      {result ? (
        <div
          role="status"
          aria-live="polite"
          className={`geo-result-card w-full${exiting ? " geo-result-card-exit" : ""}`}
        >
          <h2 className="geo-result-title font-['Noto_Kufi_Arabic',sans-serif] m-0 text-[18px] font-black text-ink leading-[1.6]">{result.title}</h2>
          <p className="geo-result-subtitle mt-1 mb-0 text-[14px] text-muted">{result.subtitle}</p>
          {result.rows.map((person) => (
            <p className="geo-result-row mt-1.5 mb-0 border-t border-line py-1.5 text-[13px] text-muted break-words" key={`${person.name}-${person.role}`}>
              <span className="geo-person-name text-[15px] font-extrabold text-ink">{person.name}</span>
              {" - "}
              <span className="geo-person-role text-[13px] text-muted">{person.role}</span>
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
