"use client";

import ModalShell from "@/components/Home/ui/ModalShell";

export default function SpeechModal({
  open,
  onClose,
  title,
  personName,
  personRole,
  paragraphs,
  note,
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-[800px]"
    >
      <div dir="rtl" className="mt-5 text-right">
        <div className="flex flex-col gap-1 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3 className="text-lg font-extrabold text-ink">{personName}</h3>
          <p className="text-sm text-muted sm:text-left">{personRole}</p>
        </div>

        <div className="space-y-4 py-5 text-lg leading-loose text-ink">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{paragraph}</p>
          ))}
        </div>

        {note ? (
          <p className="border-t border-line pt-4 text-sm text-gray-500">
            {note}
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}
