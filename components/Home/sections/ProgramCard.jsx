"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import { useState } from "react";
import InfoModal from "@/components/Home/ui/InfoModal";
import { sectionCardHoverClassName } from "@/components/Home/ui/SectionCard";

export default function ProgramCard({ data }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`${sectionCardHoverClassName} flex w-full flex-none flex-col items-center justify-center gap-3 rounded-3xl bg-ink px-4 py-8 text-center text-white shadow-card focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.98]`}
      >
        <BookOpen
          aria-hidden="true"
          size={48}
          strokeWidth={1.5}
          className="text-gold-light transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:transform-none"
        />
        <span className="text-2xl font-extrabold text-white transition-colors duration-300 group-hover:text-gold-light motion-reduce:transition-none">
          {data.title}
        </span>
        <ArrowLeft
          aria-hidden="true"
          size={24}
          className="text-gold-light transition-transform duration-300 group-hover:-translate-x-2 motion-reduce:transition-none motion-reduce:transform-none"
        />
      </button>
      <InfoModal
        open={open}
        onClose={() => setOpen(false)}
        title={data.title}
        paragraphs={data.paragraphs}
        source={data.source}
      />
    </>
  );
}
