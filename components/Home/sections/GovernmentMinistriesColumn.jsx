"use client";

import { useEffect, useState } from "react";
import GovernmentMinistries from "@/components/Home/sections/GovernmentMinistries";
import RequestForm from "@/components/Home/sections/RequestForm";
import { SectionCardHeader } from "@/components/Home/ui/SectionCard";
import Reveal from "@/components/Home/ui/Reveal";

const defaultRequests = {
  ministriesTitle: "مع الحكومة والوزارات",
  requestTitle: "تقديم طلب",
  fields: {
    name: "الاسم",
    phone: "رقم الموبايل",
    phonePlaceholder: "01xxxxxxxxx",
    sector: "القطاع",
    entity: "الجهة التابع لها:",
    submit: "أرسل الطلب",
    success: "تم استلام طلبك",
  },
  ministries: [],
  sectorOptions: [{ value: "", label: "طبي / هندسي / توظيف" }],
  entityNames: { "": "اختر الوزارة من القائمة أعلاه" },
};

export default function GovernmentMinistriesColumn({ data }) {
  const [selectedMinistry, setSelectedMinistry] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [ministryError, setMinistryError] = useState("");
  const [currentRequests, setCurrentRequests] = useState(data || defaultRequests);

  useEffect(() => {
    let ignore = false;
    async function loadPublicCatalogs() {
      try {
        const [minRes, secRes] = await Promise.all([
          fetch("/api/ministries"),
          fetch("/api/request-sectors"),
        ]);
        if (!minRes.ok || !secRes.ok) return;

        const [minJson, secJson] = await Promise.all([
          minRes.json(),
          secRes.json(),
        ]);
        if (ignore) return;

        const ministriesList = Array.isArray(minJson?.ministries)
          ? minJson.ministries.map((m) => ({
              id: m.slug || String(m.id),
              label: m.name_ar,
              dbId: m.id,
            }))
          : [];

        const sectorList = Array.isArray(secJson?.request_sectors)
          ? secJson.request_sectors.map((s) => ({
              value: s.code || String(s.id),
              label: s.name_ar,
              dbId: s.id,
            }))
          : [];

        const entityNamesMap = { "": "اختر الوزارة من القائمة أعلاه" };
        for (const m of ministriesList) {
          if (m.id) entityNamesMap[m.id] = m.label;
        }

        setCurrentRequests((prev) => ({
          ...prev,
          ministries: ministriesList.length > 0 ? ministriesList : prev.ministries,
          sectorOptions: [
            { value: "", label: "طبي / هندسي / توظيف" },
            ...sectorList,
          ],
          entityNames: entityNamesMap,
        }));
      } catch (error) {
        console.error("Failed to fetch public catalogs:", error);
      }
    }

    loadPublicCatalogs();
    return () => {
      ignore = true;
    };
  }, []);

  function handleMinistrySelect(id) {
    setSelectedMinistry(id);
    if (ministryError) setMinistryError("");
  }

  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-4"
    >
      <Reveal direction="left" delay={0.56} duration={0.7} className="flex min-h-0 flex-none flex-col">
        <GovernmentMinistries
          data={currentRequests}
          selected={selectedMinistry}
          onSelect={handleMinistrySelect}
          hasError={Boolean(ministryError)}
        />
      </Reveal>
      <Reveal direction="up" delay={0.66} duration={0.7} className="flex min-h-0 flex-1 flex-col">
        <RequestForm
          data={currentRequests}
          selectedMinistry={selectedMinistry}
          onSelectMinistry={handleMinistrySelect}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
          ministryError={ministryError}
          onMinistryErrorChange={setMinistryError}
          header={
            <SectionCardHeader
              title={currentRequests.requestTitle}
              variant="dark"
            />
          }
        />
      </Reveal>
    </div>
  );
}
