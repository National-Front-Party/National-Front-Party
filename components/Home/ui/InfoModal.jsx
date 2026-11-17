"use client";

// this use the modalshell to show information in it 

import ModalShell from "@/components/Home/ui/ModalShell";

export default function InfoModal({ open, onClose, title, paragraphs, source }) {
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <div className="mt-6 space-y-4 text-right text-lg leading-loose text-ink">
        {(paragraphs ?? []).map((paragraph, index) => (
          <p key={`${index}-${paragraph}`}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-500">المصدر: {source}</p>
    </ModalShell>
  );
}