import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import SectionCard from "@/components/Home/ui/SectionCard";

export default function ParliamentaryUnit({ data }) {
  return (
    <SectionCard
      title={data.title}
      scroll
      footer={<NextArrowFooter href="/parliamentary-unit" />}
    >
      <div className="min-h-80">
        {/* TODO: Add the parliamentary timeline and illustration. */}
      </div>
    </SectionCard>
  );
}
