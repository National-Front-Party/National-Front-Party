import NextArrowFooter from "@/components/Home/ui/NextArrowFooter";
import SectionCard from "@/components/Home/ui/SectionCard";

export default function CentralSecretariats({ data }) {
  return (
    <SectionCard
      title={data.title}
      scroll
      footer={<NextArrowFooter href="/central-secretariats" />}
    >
      <div className="min-h-80">
        {/* TODO: Add president details, action buttons, and the leadership list. */}
      </div>
    </SectionCard>
  );
}
