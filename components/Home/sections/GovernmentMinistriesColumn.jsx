"use client";

import { useState } from "react";
import GovernmentMinistries from "@/components/Home/sections/GovernmentMinistries";
import RequestForm from "@/components/Home/sections/RequestForm";
import { SectionCardHeader } from "@/components/Home/ui/SectionCard";
import { requestsMock } from "@/data/mock/requestsMock";

export default function GovernmentMinistriesColumn() {
  const [selected, setSelected] = useState("");

  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-4"
    >
      <GovernmentMinistries
        data={requestsMock}
        selected={selected}
        onSelect={setSelected}
      />
      <RequestForm
        data={requestsMock}
        selected={selected}
        onSelect={setSelected}
        header={
          <SectionCardHeader
            title={requestsMock.requestTitle}
            variant="dark"
          />
        }
      />
    </div>
  );
}
