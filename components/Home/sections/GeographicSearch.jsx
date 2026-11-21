"use client";

import { useEffect, useRef, useState } from "react";
import CustomSelect, { inputBase } from "@/components/Home/ui/CustomSelect";
import Reveal from "@/components/Home/ui/Reveal";
import { Search, Users, AlertCircle } from "lucide-react";
import "./GeographicSearch.css";

const emptyFilters = { governorate: "", center: "", partyUnit: "" };

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || "تعذر تحميل البيانات المطلوبة");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export default function GeographicSearch() {
  const [filters, setFilters] = useState(emptyFilters);
  const [governorates, setGovernorates] = useState([]);
  const [centers, setCenters] = useState([]);
  const [partyUnits, setPartyUnits] = useState([]);
  const [result, setResult] = useState(null);
  const [loadingGovernorates, setLoadingGovernorates] = useState(true);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const exitTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchJson("/api/organization/governorates")
      .then((data) => {
        if (active) setGovernorates(data.governorates ?? []);
      })
      .catch(() => {
        if (active) setError("مش قادرين نحمل قائمة المحافظات دلوقتي. حاول تاني.");
      })
      .finally(() => {
        if (active) setLoadingGovernorates(false);
      });
    return () => {
      active = false;
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!filters.governorate) {
      setCenters([]);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoadingCenters(true);
    setCenters([]);
    fetchJson("/api/organization/centers?governorate_id=" + encodeURIComponent(filters.governorate))
      .then((data) => {
        if (active) setCenters(data.centers ?? []);
      })
      .catch(() => {
        if (active) setError("تعذر تحميل المراكز التابعة للمحافظة المختارة.");
      })
      .finally(() => {
        if (active) setLoadingCenters(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters.governorate]);

  useEffect(() => {
    if (!filters.center) {
      setPartyUnits([]);
      return;
    }
    let active = true;
    setLoadingUnits(true);
    setPartyUnits([]);
    fetchJson("/api/organization/party-units?center_id=" + encodeURIComponent(filters.center))
      .then((data) => {
        if (active) setPartyUnits(data.party_units ?? []);
      })
      .catch(() => {
        if (active) setError("تعذر تحميل الوحدات الحزبية التابعة للمركز المختار.");
      })
      .finally(() => {
        if (active) setLoadingUnits(false);
      });
    return () => {
      active = false;
    };
  }, [filters.center]);

  function hideResult() {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setResult(null);
    setError("");
  }

  function updateFilter(field, value) {
    setFilters((current) => {
      if (field === "governorate") {
        return { governorate: value, center: "", partyUnit: "" };
      }
      if (field === "center") {
        return { ...current, center: value, partyUnit: "" };
      }
      return { ...current, partyUnit: value };
    });
    hideResult();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    hideResult();

    if (!filters.governorate || !filters.center || !filters.partyUnit) {
      setError("اختار المحافظة والمركز والوحدة الحزبية الأول.");
      return;
    }

    setSearching(true);
    try {
      const data = await fetchJson("/api/organization/party-units/" + encodeURIComponent(filters.partyUnit));
      if (!data.party_unit) {
        setError("الوحدة الحزبية دي مش متاحة حاليًا.");
        return;
      }
      setResult(data.party_unit);
    } catch {
      setError("حصلت مشكلة أثناء البحث. راجع اختياراتك وحاول تاني.");
    } finally {
      setSearching(false);
    }
  }

  const governorateOptions = governorates.map((item) => ({
    value: String(item.id),
    label: item.name_ar,
  }));
  const centerOptions = centers.map((item) => ({
    value: String(item.id),
    label: item.name_ar,
  }));
  const unitOptions = partyUnits.map((item) => ({
    value: String(item.id),
    label: item.name_ar + (item.secretariat?.name_ar ? " — " + item.secretariat.name_ar : ""),
  }));

  const selectedGovernorate = governorates.find((item) => String(item.id) === filters.governorate);
  const selectedCenter = centers.find((item) => String(item.id) === filters.center);

  return (
    <section
      id="geo"
      tabIndex={-1}
      dir="rtl"
      lang="ar"
      aria-label="البحث عن الوحدات الحزبية"
      className="geo-section mx-auto mt-[18px] w-full max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] px-5 text-right scroll-mt-28 focus:outline-none"
    >
      <Reveal direction="up" delay={0.08} duration={0.7} className="w-full">
        <form
          className="geo-search-bar flex w-full flex-col gap-[10px] rounded-[28px] bg-ink p-[12px] shadow-[0_20px_44px_rgba(21,23,28,0.28)] min-[700px]:grid min-[700px]:grid-cols-2 min-[1100px]:grid-cols-[1fr_1fr_1.2fr_auto] min-[1100px]:items-end min-[1100px]:gap-3"
          onSubmit={handleSubmit}
        >
          <div className="geo-governorate min-w-0">
            <CustomSelect
              id="geo-governorate"
              label="المحافظة"
              placeholder={loadingGovernorates ? "جاري تحميل المحافظات..." : "اختار المحافظة"}
              options={governorateOptions}
              value={filters.governorate}
              onChange={(value) => updateFilter("governorate", value)}
              disabled={loadingGovernorates || governorates.length === 0}
            />
          </div>

          <div className="geo-center min-w-0">
            <CustomSelect
              id="geo-center"
              label="المركز"
              placeholder={
                !filters.governorate
                  ? "اختار المحافظة الأول"
                  : loadingCenters
                    ? "جاري تحميل المراكز..."
                    : "اختار المركز"
              }
              options={centerOptions}
              value={filters.center}
              onChange={(value) => updateFilter("center", value)}
              disabled={!filters.governorate || loadingCenters || centers.length === 0}
            />
          </div>

          <div className="geo-party-unit min-w-0">
            <CustomSelect
              id="geo-party-unit"
              label="الوحدة الحزبية"
              placeholder={
                !filters.center
                  ? "اختار المركز الأول"
                  : loadingUnits
                    ? "جاري تحميل الوحدات..."
                    : "اختار الوحدة الحزبية"
              }
              options={unitOptions}
              value={filters.partyUnit}
              onChange={(value) => updateFilter("partyUnit", value)}
              disabled={!filters.center || loadingUnits || partyUnits.length === 0}
            />
          </div>

          <button
            type="submit"
            disabled={searching || loadingGovernorates}
            className="geo-search-button bg-gold-gradient w-full min-[1100px]:w-auto min-[1100px]:min-w-32"
          >
            <Search aria-hidden="true" size={21} />
            <span>{searching ? "جاري البحث..." : "بحث"}</span>
          </button>
        </form>
      </Reveal>

      {(loadingGovernorates || loadingCenters || loadingUnits) && (
        <p className="mt-3 text-center text-sm text-muted" role="status">جاري تحميل الاختيارات المتاحة...</p>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div role="status" aria-live="polite" className="geo-result-card w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold-tint px-3 py-1 text-xs font-bold text-gold-dark">
                <Users className="size-3.5" /> الوحدة الحزبية
              </span>
              <h2 className="geo-result-title m-0 font-['Noto_Kufi_Arabic',sans-serif] text-[19px] font-black leading-[1.7] text-ink">
                {result.name_ar}
              </h2>
              <p className="geo-result-subtitle mt-1 mb-0 text-sm text-muted">
                {result.governorate?.name_ar} — {result.center?.name_ar} — {result.local_secretariat?.name_ar}
              </p>
            </div>
            <span className="rounded-xl border border-line bg-page px-3 py-2 text-xs font-bold text-muted">
              {result.people?.length ?? 0} مسؤول منشور
            </span>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <h3 className="mb-3 text-sm font-black text-ink">قيادات ومسؤولو الوحدة</h3>
            {result.people?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {result.people.map((person) => (
                  <article key={person.id} className="rounded-2xl border border-line bg-white p-4">
                    <h4 className="text-sm font-extrabold text-ink">{person.full_name}</h4>
                    <p className="mt-1 text-xs font-bold text-gold-dark">{person.position_title}</p>
                    {person.details && <p className="mt-2 whitespace-pre-line text-xs leading-6 text-muted">{person.details}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-page px-4 py-5 text-center text-sm text-muted">
                مفيش قيادات منشورة للوحدة دي حاليًا.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
