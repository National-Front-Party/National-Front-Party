
"use client";

import { useEffect, useState } from "react";
import { Church, House, Landmark } from "lucide-react";
import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import ParliamentIllustration from "@/components/Home/ui/ParliamentIllustration";
import ParliamentaryModal from "@/components/Home/ui/ParliamentaryModal";
import SectionCard from "@/components/Home/ui/SectionCard";

const iconMap = {
  landmark: Landmark,
  church: Church,
  house: House,
};

export default function ParliamentaryUnit({ data }) {
  const [active, setActive] = useState(null);
  const [items, setItems] = useState(data || []);

  useEffect(() => {
    let ignore = false;
    async function loadParliamentaryData() {
      try {
        const response = await fetch("/api/content/parliamentary-unit");
        if (!response.ok) return;
        const result = await response.json();
        const rawItems = Array.isArray(result?.parliamentary_items)
          ? result.parliamentary_items
          : Array.isArray(result?.parliamentary_units)
            ? result.parliamentary_units
            : null;

        if (!ignore && Array.isArray(rawItems)) {
          setItems(
            rawItems.map((p, idx) => ({
              id: p.slug || (p.id ? `parl-${p.id}` : `parl-idx-${idx}`),
              title: p.title,
              subtitle: p.subtitle || "",
              icon: p.icon || "landmark",
              modal: {
                title: p.title,
                personName: p.head_name || null,
                personRole: p.head_role || null,
                paragraphs: p.body
                  ? p.body.split(/\r?\n+/).filter((line) => line.trim().length > 0)
                  : [],
                source: p.source_note || null,
              },
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load /api/content/parliamentary-unit:", error);
      }
    }

    loadParliamentaryData();
    return () => {
      ignore = true;
    };
  }, []);

  const activeItem = items.find((item) => item.id === active);

  return (
    <>
      <SectionCard
        title="الهيئة البرلمانية"
        footer={
          <NextArrowFooter
            onClick={() => setActive(items[0]?.id || "senate")}
            ariaLabel="عرض الهيئة البرلمانية"
          />
        }
      >
        <div className="flex h-full flex-1 flex-col">
          <ol className="shrink-0 pt-3">
            {items.map((item, index) => {
              const Icon = iconMap[item.icon] ?? Landmark;

              return (
                <li
                  key={item.id ? `parl-${item.id}` : `parl-idx-${index}`}
                  className="relative pb-11 animate-elem-fade-up motion-reduce:animate-none"
                  style={{ animationDelay: `${index * 90 + 120}ms` }}
                >
                  {/* Animated Dashed Line */}
                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none absolute
                      right-[31px] top-[32px]
                      z-0 h-[76px] w-[2px]
                      -translate-x-1/2
                      animate-dash-rain
                      motion-reduce:hidden
                    "
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, #c9a24b 0 6px, transparent 6px 12px)",
                      backgroundSize: "2px 12px",
                    }}
                  />

                  <button
                    type="button"
                    aria-label={`${item.title}، ${item.subtitle}`}
                    aria-haspopup="dialog"
                    onClick={() => setActive(item.id)}
                    className="
                      group/item relative z-10 flex w-full items-center gap-3
                      rounded-2xl border border-transparent
                      px-2 py-1.5 text-right
                      cursor-pointer
                      transition-all duration-300 ease-out
                      hover:-translate-x-1
                      hover:border-gold/70
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-gold/60
                      focus-visible:ring-offset-2
                      active:scale-[0.99]
                      motion-reduce:transition-none
                      motion-reduce:transform-none
                    "
                  >
                    {/* Icon Circle */}
                    <span
                      className="
                        relative z-10 flex size-12 shrink-0
                        items-center justify-center
                        rounded-full border border-gold/70
                        bg-white text-gold
                        shadow-sm
                        outline outline-[5px] outline-white
                        transition-all duration-300 ease-out
                        group-hover/item:border-gold
                        group-hover/item:bg-gold-gradient
                        group-hover/item:text-white
                        group-hover/item:shadow-md
                      "
                    >
                      <Icon
                        aria-hidden="true"
                        size={22}
                        strokeWidth={1.9}
                      />
                    </span>

                    {/* Text */}
                    <span className="min-w-0 flex-1">
                      <span
                        className="
                          block text-lg font-extrabold text-ink
                          transition-colors duration-300
                          group-hover/item:text-gold-dark
                        "
                      >
                        {item.title}
                      </span>

                      <span className="block text-xs text-muted">
                        {item.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Illustration */}
          <div className="mt-auto flex min-h-0 flex-1 items-end justify-center pt-2">
            <ParliamentIllustration />
          </div>
        </div>
      </SectionCard>

      {/* Modal */}
      <ParliamentaryModal
        open={Boolean(activeItem)}
        onClose={() => setActive(null)}
        title={activeItem?.modal.title ?? ""}
        personName={activeItem?.modal.personName ?? null}
        personRole={activeItem?.modal.personRole ?? null}
        paragraphs={activeItem?.modal.paragraphs ?? []}
        source={activeItem?.modal.source ?? null}
      />
    </>
  );
}
