import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import SectionCard from "@/components/Home/ui/SectionCard";

export default function ProgramCard({ data }) {
  return (
    <SectionCard
      title={data.title}
      variant="dark"
      scroll
      className="flex-1"
      footer={<NextArrowFooter href="/program" />}
    >
      <div className="min-h-12">
        {/* TODO: Add the book icon and program card content. */}
      </div>
    </SectionCard>
  );
}
