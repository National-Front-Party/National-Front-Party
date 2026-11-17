import CentralSecretariats from "@/components/Home/sections/CentralSecretariats";
import GovernmentMinistriesColumn from "@/components/Home/sections/GovernmentMinistriesColumn";
import GovernoratesSecretariats from "@/components/Home/sections/GovernoratesSecretariats";
import MainSection from "@/components/Home/sections/MainSection";
import ParliamentaryUnit from "@/components/Home/sections/ParliamentaryUnit";
import ProgramCard from "@/components/Home/sections/ProgramCard";
import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import SectionCard from "@/components/Home/ui/SectionCard";
import {
  governorates,
  mainLinks,
  partyProgram,
} from "@/data/mock/home";
import { centralSecretariats } from "@/data/mock/central-secretariats";
import { parliamentaryItems } from "@/data/mock/parliamentary";

export default function HomeSections() {
  return (
    <section
      aria-label="أقسام الصفحة الرئيسية"
      className="flex min-h-0 flex-none flex-col overflow-x-clip bg-page py-4 md:py-6 xl:flex-1"
    >
      <div className="mx-auto w-full max-w-[1320px] px-5">
        <div
          dir="rtl"
          className="grid min-w-0 grid-cols-1 items-stretch gap-4 overflow-visible md:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))] xl:h-full xl:min-h-0 xl:flex-1 xl:grid-rows-1"
        >
          <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
            <MainSection data={mainLinks} />
            <ProgramCard data={partyProgram} />
          </div>

          <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
            <CentralSecretariats data={centralSecretariats} />
          </div>

          <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
            <SectionCard
              title={governorates.title}
              scroll
              footer={<NextArrowFooter href="/governorates" />}
            >
              <GovernoratesSecretariats data={governorates} />
            </SectionCard>
          </div>

          <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
            <ParliamentaryUnit data={parliamentaryItems} />
          </div>

          <GovernmentMinistriesColumn />
        </div>
      </div>
    </section>
  );
}
