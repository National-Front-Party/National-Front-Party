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
import Reveal from "@/components/Home/ui/Reveal";
export default function HomeSections({ data = {} }) {
  const mainLinks = data.mainLinks || [];
  const partyProgram = data.partyProgram || { title: "برنامج الحزب", paragraphs: [], source: "" };
  const centralSecretariats = data.centralSecretariats;
  const parliamentaryItems = data.parliamentaryItems || [];
  const governorates = data.governorates;
  const requests = data.requests;
  const news = data.news;
  const vision = data.vision;

  return (
    <section
      aria-label="أقسام الصفحة الرئيسية"
      className="flex min-h-0 flex-none flex-col overflow-x-clip bg-page"
    >
      <div className="mx-auto w-full max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] px-[14px] pt-[16px] pb-[8px] min-[600px]:px-[20px] min-[600px]:pt-[22px] min-[600px]:pb-[10px]">
        <div
          dir="rtl"
          className="grid min-w-0 grid-cols-1 items-stretch gap-[14px] min-[600px]:grid-cols-2 min-[600px]:gap-[16px] min-[900px]:grid-cols-6 min-[1200px]:grid-cols-5"
        >
          <div
            id="c-home"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[900px]:col-span-2 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <Reveal direction="right" delay={0.08} duration={0.7} className="flex min-h-0 flex-1 flex-col">
              <MainSection data={mainLinks} />
            </Reveal>
            <Reveal direction="up" delay={0.18} duration={0.7} className="flex min-h-0 flex-none flex-col">
              <ProgramCard data={partyProgram} />
            </Reveal>
          </div>

          <div
            id="c-central"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[900px]:col-span-2 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <Reveal direction="up" delay={0.28} duration={0.7} className="flex h-full min-h-0 flex-1 flex-col">
              <CentralSecretariats data={centralSecretariats} />
            </Reveal>
          </div>

          <div
            id="c-govs"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[600px]:col-span-2 min-[900px]:col-span-2 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <Reveal direction="scale" delay={0.38} duration={0.7} className="flex h-full min-h-0 flex-1 flex-col">
              <GovernoratesSecretariats data={governorates} />
            </Reveal>
          </div>

          <div
            id="c-parl"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[600px]:col-span-1 min-[900px]:col-span-3 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <Reveal direction="up" delay={0.48} duration={0.7} className="flex h-full min-h-0 flex-1 flex-col">
              <ParliamentaryUnit data={parliamentaryItems} />
            </Reveal>
          </div>

          <div
            id="c-gov"
            tabIndex={-1}
            className="flex h-full min-h-0 min-w-0 flex-col gap-4 col-span-1 min-[600px]:col-span-1 min-[900px]:col-span-3 min-[1200px]:col-span-1 scroll-mt-28 focus:outline-none"
          >
            <GovernmentMinistriesColumn data={requests} />
          </div>
        </div>
      </div>
      <NewsSection data={news} />
      <GeographicSearch data={governorates} />
      <Vision2030 data={vision} />
      <PartyStats />
    </section>
  );
}
