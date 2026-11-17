"use client";

export default function RequestForm({ data, header }) {
  return (
    <section
      aria-label={data.title}
      className="flex min-h-fit min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-card xl:min-h-0"
    >
      {header}
      <div className="min-h-fit flex-1 overflow-visible p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:min-h-0 xl:overflow-y-auto">
        {/* TODO: Add the request fields, sector selection, and submit action. */}
      </div>
    </section>
  );
}
