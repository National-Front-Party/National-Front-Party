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
      className="flex h-auto min-w-0 w-full flex-col gap-4 self-start"
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
