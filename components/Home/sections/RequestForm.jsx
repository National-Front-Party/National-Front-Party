"use client";

import { sectionCardHoverClassName } from "@/components/Home/ui/SectionCard";

export default function RequestForm({ data, header }) {
  return (
    <section
      aria-label={data.title}
      className={`flex min-h-fit min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-card xl:min-h-0 ${sectionCardHoverClassName}`}
    >
      {header}
      <div className="min-h-fit flex-1 overflow-visible p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:min-h-0 xl:overflow-y-auto [&_input]:transition [&_input:focus]:border-gold [&_input:focus]:ring-2 [&_input:focus]:ring-gold/30 [&_select]:transition [&_select:focus]:border-gold [&_select:focus]:ring-2 [&_select:focus]:ring-gold/30 [&_textarea]:transition [&_textarea:focus]:border-gold [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-gold/30 [&_button]:transition [&_button:hover]:brightness-110 [&_button:hover]:-translate-y-0.5">
        {/* TODO: Add the request fields, sector selection, and submit action. */}
      </div>
    </section>
  );
}
