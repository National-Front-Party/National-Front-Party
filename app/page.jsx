import { Suspense } from "react";
import IntroHeading from "@/components/Home/IntroHeading";
import HomeSections from "@/components/Home/HomeSections";
import { getHomePageData, getDefaultHomeData } from "@/lib/home-data";

async function HomeSectionsServer() {
  const homeData = await getHomePageData();
  return <HomeSections data={homeData} />;
}

export default function HomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <IntroHeading />
      </div>
      <Suspense fallback={<HomeSections data={getDefaultHomeData()} />}>
        <HomeSectionsServer />
      </Suspense>
    </div>
  );
}
