import SectionCard from "@/components/Home/ui/SectionCard";

export default function GovernmentMinistries({ data }) {
  return (
    <SectionCard title={data.title} scroll className="flex-1">
      <div className="min-h-48">
        {/* TODO: Add the government and ministries list. */}
      </div>
    </SectionCard>
  );
}
