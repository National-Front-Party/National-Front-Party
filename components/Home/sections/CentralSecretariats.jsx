"use client";

import Image from "next/image";
import { ArrowLeft, UserRound } from "lucide-react";
import { useState } from "react";
import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import SectionCard from "@/components/Home/ui/SectionCard";
import SecretariatsModal from "@/components/Home/ui/SecretariatsModal";
import SpeechModal from "@/components/Home/ui/SpeechModal";

const buttonBase =
  "group/item relative flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(201,162,74,0.55)] hover:brightness-110 hover:ring-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none";

export default function CentralSecretariats({ data }) {
  const [active, setActive] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  const activeSpeech =
    active === "president"
      ? data.president.speech
      : active === "vice"
        ? data.viceSpeech
        : active === "general"
          ? data.secretaryGeneralSpeech
          : null;

  const buttons = [
    {
      id: "president",
      label: data.president.speech.buttonLabel,
      style: "bg-ink text-gold-light",
      arrowStyle: "text-gold-light",
    },
    {
      id: "vice",
      label: data.viceSpeech.buttonLabel,
      style: "bg-gold text-ink",
      arrowStyle: "text-ink",
    },
    {
      id: "general",
      label: data.secretaryGeneralSpeech.buttonLabel,
      style: "bg-gold text-ink",
      arrowStyle: "text-ink",
    },
    {
      id: "secretariats",
      label: data.secretariats.buttonLabel,
      style: "bg-ink text-gold-light",
      arrowStyle: "text-gold-light",
    },
  ];

  return (
    <>
      <SectionCard
        title={data.secretariats.buttonLabel}
        footer={
          <NextArrowFooter
            onClick={() => setActive("secretariats")}
            ariaLabel="عرض الأمانات المركزية"
          />
        }
      >
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2.5 text-center sm:gap-3">
          <div className="group flex size-[120px] items-center justify-center overflow-hidden rounded-full border-4 border-gold bg-gold-tint p-1 shadow-[0_8px_24px_rgba(201,162,74,0.28)]">
            {!data.president.image || imageFailed ? (
              <UserRound
                aria-hidden="true"
                size={56}
                strokeWidth={1.5}
                className="text-gold transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
            ) : (
              <Image
                src={data.president.image}
                alt=""
                width={120}
                height={120}
                onError={() => setImageFailed(true)}
                className="size-full rounded-full object-cover transition-transform duration-500 hover:scale-105 motion-reduce:transition-none"
              />
            )}
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-ink">
              {data.president.name}
            </h3>
            <p className="text-sm text-muted">{data.president.title}</p>
          </div>

          <div className="mt-1 flex w-full flex-col gap-2.5">
            {buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                onClick={() => setActive(button.id)}
                className={`${buttonBase} ${button.style}`}
              >
                <span>{button.label}</span>
                <ArrowLeft
                  aria-hidden="true"
                  size={18}
                  className={`absolute left-4 opacity-0 transition-all duration-300 group-hover/item:-translate-x-1 group-hover/item:opacity-100 motion-reduce:transition-none ${button.arrowStyle}`}
                />
              </button>
            ))}
          </div>

          <section aria-labelledby="central-leadership-title" className="mt-1 w-full">
            <h3
              id="central-leadership-title"
              className="mb-1.5 text-center text-xl font-extrabold text-ink"
            >
              {data.leadership.title}
            </h3>
            <ul className="space-y-1 text-right">
              {data.leadership.leaders.map((leader) => (
                <li
                  key={leader.name}
                  className="flex items-center gap-3 rounded-2xl px-2 py-1.5"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-white text-sm font-extrabold text-ink">
                    {leader.badge}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">
                      {leader.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {leader.role}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SectionCard>

      <SpeechModal
        open={Boolean(activeSpeech)}
        onClose={() => setActive(null)}
        title={activeSpeech?.modalTitle ?? ""}
        personName={activeSpeech?.personName ?? ""}
        personRole={activeSpeech?.personRole ?? ""}
        paragraphs={activeSpeech?.paragraphs ?? []}
        note={activeSpeech?.note ?? null}
      />
      <SecretariatsModal
        open={active === "secretariats"}
        onClose={() => setActive(null)}
        title={data.secretariats.modalTitle}
        items={data.secretariats.items}
        footnote={data.secretariats.footnote}
      />
    </>
  );
}
