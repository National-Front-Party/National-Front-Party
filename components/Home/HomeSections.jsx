import CentralSecretariats from "@/components/Home/sections/CentralSecretariats";
import GovernmentMinistriesColumn from "@/components/Home/sections/GovernmentMinistriesColumn";
import GovernoratesSecretariats from "@/components/Home/sections/GovernoratesSecretariats";
import MainSection from "@/components/Home/sections/MainSection";
import ParliamentaryUnit from "@/components/Home/sections/ParliamentaryUnit";
import ProgramCard from "@/components/Home/sections/ProgramCard";
import NewsSection from "@/components/Home/sections/NewsSection";
import GeographicSearch from "@/components/Home/sections/GeographicSearch";
import Vision2030 from "@/components/Home/sections/Vision2030";
import PartyStats from "@/components/Home/sections/PartyStats";
import {
  mainLinks,
  partyProgram,
} from "@/data/mock/home";
import { centralSecretariats } from "@/data/mock/central-secretariats";
import { parliamentaryItems } from "@/data/mock/parliamentary";

export default function HomeSections() {
  return (
    <section
      aria-label="أقسام الصفحة الرئيسية"
      className="flex min-h-0 flex-none flex-col overflow-x-clip bg-page"
    >
      <div className="mx-auto w-full max-w-[1320px] px-[14px] pt-[16px] pb-[8px] min-[600px]:px-[20px] min-[600px]:pt-[22px] min-[600px]:pb-[10px]">
        <div
          dir="rtl"
          className="grid min-w-0 grid-cols-1 items-stretch gap-[14px] min-[600px]:grid-cols-2 min-[600px]:gap-[16px] min-[900px]:grid-cols-6 min-[1200px]:grid-cols-5"
        >
          <div
            id="c-home"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[900px]:col-span-2 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <MainSection data={mainLinks} />
            <ProgramCard data={partyProgram} />
          </div>

          <div
            id="c-central"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[900px]:col-span-2 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <CentralSecretariats data={centralSecretariats} />
          </div>

          <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[600px]:col-span-2 min-[900px]:col-span-2 min-[1200px]:col-span-1">
            <GovernoratesSecretariats />
          </div>

          <div
            id="c-parl"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[600px]:col-span-1 min-[900px]:col-span-3 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <ParliamentaryUnit data={parliamentaryItems} />
          </div>

          <div
            id="c-gov"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[600px]:col-span-1 min-[900px]:col-span-3 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <GovernmentMinistriesColumn />
          </div>
        </div>
      </div>
      <NewsSection />
      <GeographicSearch />
      <Vision2030 />
      <PartyStats />
    </section>
  );
}
