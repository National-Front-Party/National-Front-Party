import IntroHeading from "@/components/Home/IntroHeading";
import HomeSections from "@/components/Home/HomeSections";

export default function HomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <IntroHeading />
      </div>
      <HomeSections />
    </div>
  );
}
