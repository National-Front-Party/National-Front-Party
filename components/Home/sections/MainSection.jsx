"use client";

import { Eye, MessageCircleQuestion, Send, Target, User } from "lucide-react";
import { useState } from "react";
import InfoModal from "@/components/Home/ui/InfoModal";
import SectionCard from "@/components/Home/ui/SectionCard";

const iconMap = {
  user: User,
  target: Target,
  eye: Eye,
  send: Send,
  message: MessageCircleQuestion,
};

export default function MainSection({ data }) {
  const [active, setActive] = useState(null);

  return (
    <>
      <SectionCard
        title="الرئيسية"
        className="h-full flex-1 min-h-0"
        headerClassName="bg-[linear-gradient(135deg,var(--color-gold),var(--color-gold-light),var(--color-gold))] bg-[length:200%_200%] bg-[position:0%_50%] py-6 transition-[background-position] duration-700 ease-out group-hover:bg-[position:100%_50%] motion-reduce:transition-none"
        showUnderline={false}
      >
        <ul className="flex flex-1 flex-col gap-1">
          {data.map((item, index) => {
            const Icon = iconMap[item.icon];
            const startsGold = index % 2 === 1;

            return (
              <li
                key={item.id}
                className="animate-fade-up border-b border-line last:border-b-0 motion-reduce:animate-none"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.currentTarget.focus();
                    setActive(item);
                  }}
                  className="group/row flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-right ring-1 ring-transparent transition-all duration-300 ease-out hover:bg-ink hover:shadow-lg hover:ring-gold focus-visible:relative focus-visible:z-10 focus-visible:bg-ink focus-visible:shadow-lg focus-visible:ring-gold active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none"
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ease-out group-hover/row:scale-110 group-hover/row:-rotate-6 group-focus-visible/row:scale-110 group-focus-visible/row:-rotate-6 motion-reduce:transition-none motion-reduce:transform-none ${
                      startsGold ? "bg-gold text-ink" : "bg-ink text-gold"
                    } group-hover/row:bg-gold group-hover/row:text-ink group-focus-visible/row:bg-gold group-focus-visible/row:text-ink`}
                  >
                    <Icon aria-hidden="true" size={20} strokeWidth={2} />
                  </span>
                  <span className="font-bold text-ink transition-all duration-300 ease-out group-hover/row:-translate-x-1 group-hover/row:text-white group-focus-visible/row:-translate-x-1 group-focus-visible/row:text-white motion-reduce:transition-none motion-reduce:transform-none">
                    {item.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <InfoModal
        open={!!active}
        onClose={() => setActive(null)}
        {...active}
      />
    </>
  );
}
