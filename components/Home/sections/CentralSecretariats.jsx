"use client";

import Image from "next/image";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import SectionCard from "@/components/Home/ui/SectionCard";
import SecretariatsModal from "@/components/Home/ui/SecretariatsModal";
import SpeechModal from "@/components/Home/ui/SpeechModal";

const buttonBase =
  "group/item relative flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(201,162,74,0.55)] hover:brightness-110 hover:ring-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none";

export default function CentralSecretariats({ data }) {
  const [active, setActive] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [secData, setSecData] = useState(data);

  useEffect(() => {
    let ignore = false;
    async function loadPublicLeadership() {
      try {
        const [leadRes, secRes] = await Promise.all([
          fetch("/api/content/leadership"),
          fetch("/api/content/central-secretariats"),
        ]);
        if (!leadRes.ok && !secRes.ok) return;

        const leadJson = leadRes.ok ? await leadRes.json() : null;
        const secJson = secRes.ok ? await secRes.json() : null;
        if (ignore) return;

        setSecData((prev) => {
          const next = { ...prev };
          if (Array.isArray(secJson?.central_secretariats) && secJson.central_secretariats.length > 0) {
            next.secretariats = {
              ...next.secretariats,
              items: secJson.central_secretariats.map((s) => ({
                id: s.id,
                title: s.title,
                subtitle: s.subtitle,
                icon: s.icon,
                members: (s.people || []).map((p) => ({
                  name: p.full_name,
                  role: p.role_title,
                  photo: p.photo_url || "/avatars/avatar-fallback.svg",
                })),
              })),
            };
          }

          if (leadJson?.panels?.length > 0 || leadJson?.contents?.length > 0) {
            const panels = leadJson.panels || [];
            const contents = leadJson.contents || [];
            const panelWithLeaders = panels[0] || {};
            const leaders = panelWithLeaders.leaders || [];
            const headLeader = leaders.find((l) => l.is_head) || leaders[0];
            const otherLeaders = leaders.filter((l) => l !== headLeader);

            function findSpeech(slug, fallbackBtn, fallbackRole) {
              const item = contents.find((c) => c.slug === slug);
              return {
                buttonLabel: item?.button_label || fallbackBtn,
                modalTitle: item?.title || fallbackBtn,
                personName: item?.title || "",
                personRole: fallbackRole,
                paragraphs: item?.body ? item.body.split("\n\n") : [],
                note: item?.source_note || "",
              };
            }

            if (headLeader) {
              next.president = {
                ...next.president,
                name: headLeader.full_name,
                title: headLeader.role_title || "رئيس الحزب",
                image: headLeader.photo_url || "/president.jpg",
                speech: findSpeech(
                  "speech-president",
                  "كلمة رئيس الحزب",
                  "رئيس الحزب",
                ),
              };
            }

            next.viceSpeech = findSpeech(
              "speech-vice-president",
              "كلمة النائب الأول",
              "النائب الأول لرئيس الحزب والأمين العام",
            );
            next.secretaryGeneralSpeech = findSpeech(
              "speech-secretary-general",
              "كلمة نائب رئيس الحزب",
              "نائب رئيس الحزب",
            );
            next.leadership = {
              title: panelWithLeaders.leaders_heading || "قيادة الحزب",
              leaders: otherLeaders.map((l) => ({
                name: l.full_name,
                role: l.role_title || "",
                badge: l.badge_label || "",
              })),
            };
          }

          return next;
        });
      } catch (error) {
        console.error("Failed to load public leadership / secretariats:", error);
      }
    }

    loadPublicLeadership();
    return () => {
      ignore = true;
    };
  }, []);

  const activeSpeech =
    active === "president"
      ? secData.president.speech
      : active === "vice"
        ? secData.viceSpeech
        : active === "general"
          ? secData.secretaryGeneralSpeech
          : null;

  const buttons = [
    {
      id: "president",
      label: secData.president.speech.buttonLabel,
      style: "bg-ink text-gold-light",
      arrowStyle: "text-gold-light",
    },
    {
      id: "vice",
      label: secData.viceSpeech.buttonLabel,
      style: "bg-gold text-ink",
      arrowStyle: "text-ink",
    },
    {
      id: "general",
      label: secData.secretaryGeneralSpeech.buttonLabel,
      style: "bg-gold text-ink",
      arrowStyle: "text-ink",
    },
    {
      id: "secretariats",
      label: secData.secretariats.buttonLabel,
      style: "bg-ink text-gold-light",
      arrowStyle: "text-gold-light",
    },
  ];

  return (
    <>
      <SectionCard
        title={secData.secretariats.buttonLabel}
        footer={
          <NextArrowFooter
            onClick={() => setActive("secretariats")}
            ariaLabel="عرض الأمانات المركزية"
          />
        }
      >
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2.5 text-center sm:gap-3">
          <div className="group flex size-[120px] items-center justify-center overflow-hidden rounded-full border-4 border-gold bg-gold-tint p-1 shadow-[0_8px_24px_rgba(201,162,74,0.28)] animate-elem-scale-in motion-reduce:animate-none">
            {!secData.president.image || imageFailed ? (
              <UserRound
                aria-hidden="true"
                size={56}
                strokeWidth={1.5}
                className="text-gold transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
            ) : (
              <Image
                src={secData.president.image}
                alt=""
                width={120}
                height={120}
                onError={() => setImageFailed(true)}
                className="size-full rounded-full object-cover transition-transform duration-500 hover:scale-105 motion-reduce:transition-none"
              />
            )}
          </div>

          <div className="animate-elem-fade-up motion-reduce:animate-none" style={{ animationDelay: "80ms" }}>
            <h3 className="text-lg font-extrabold text-ink">
              {secData.president.name}
            </h3>
            <p className="text-sm text-muted">{secData.president.title}</p>
          </div>

          <div className="mt-1 flex w-full flex-col gap-2.5">
            {buttons.map((button, index) => (
              <button
                key={button.id}
                type="button"
                onClick={() => setActive(button.id)}
                className={`${buttonBase} ${button.style} animate-elem-fade-up motion-reduce:animate-none`}
                style={{ animationDelay: `${index * 60 + 160}ms` }}
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
              {secData.leadership.title}
            </h3>
            <ul className="space-y-1 text-right">
              {secData.leadership.leaders.map((leader, index) => (
                <li
                  key={leader.name}
                  className="flex items-center gap-3 rounded-2xl px-2 py-1.5 animate-elem-fade-up motion-reduce:animate-none"
                  style={{ animationDelay: `${index * 60 + 380}ms` }}
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
        title={secData.secretariats.modalTitle}
        items={secData.secretariats.items}
        footnote={secData.secretariats.footnote}
      />
    </>
  );
}
