"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import InfoModal from "@/components/Home/ui/InfoModal";
import { sectionCardHoverClassName } from "@/components/Home/ui/SectionCard";

export default function ProgramCard({ data }) {
  const [open, setOpen] = useState(false);
  const [program, setProgram] = useState(
    data || {
      title: "برنامج الحزب",
      paragraphs: ["نص برنامج الحزب ومحاوره يضاف هنا بعد اعتماده."],
      source: "الموقع الرسمي للحزب",
    },
  );

  useEffect(() => {
    let ignore = false;
    async function loadPartyProgram() {
      try {
        const response = await fetch("/api/content/party-program");
        if (!response.ok) return;
        const result = await response.json();
        if (!ignore && result?.party_program) {
          setProgram({
            title: result.party_program.title || "برنامج الحزب",
            paragraphs:
              result.party_program.paragraphs ||
              (result.party_program.body
                ? result.party_program.body.split(/\r?\n+/)
                : ["نص برنامج الحزب ومحاوره يضاف هنا بعد اعتماده."]),
            source:
              result.party_program.source_note || "الموقع الرسمي للحزب",
          });
        }
      } catch (error) {
        console.error("Failed to load /api/content/party-program:", error);
      }
    }

    loadPartyProgram();
    return () => {
      ignore = true;
    };
  }, []);

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
          {program.title}
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
        title={program.title}
        paragraphs={program.paragraphs}
        source={program.source}
      />
    </>
  );
}
