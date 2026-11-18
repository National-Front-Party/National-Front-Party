"use client";

import { useState } from "react";
import GovernmentMinistries from "@/components/Home/sections/GovernmentMinistries";
import RequestForm from "@/components/Home/sections/RequestForm";
import { SectionCardHeader } from "@/components/Home/ui/SectionCard";
import Reveal from "@/components/Home/ui/Reveal";
import { requestsMock } from "@/data/mock/requestsMock";

export default function GovernmentMinistriesColumn() {
  const [selected, setSelected] = useState("");

  return (
    <div
      dir="rtl"
      lang="ar"
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-4"
    >
      <Reveal direction="left" delay={0.56} duration={0.7} className="flex min-h-0 flex-none flex-col">
        <GovernmentMinistries
          data={requestsMock}
          selected={selected}
          onSelect={setSelected}
        />
      </Reveal>
      <Reveal direction="up" delay={0.66} duration={0.7} className="flex min-h-0 flex-1 flex-col">
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
      </Reveal>
    </div>
  );
}
