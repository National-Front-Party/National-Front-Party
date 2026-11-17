import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NextArrowFooter({ href }) {
  return (
    <Link
      href={href}
      aria-label="عرض المزيد"
      className="group flex h-12 w-full items-center justify-center rounded-b-3xl bg-gold-gradient text-ink transition-[filter] duration-200 hover:brightness-110"
    >
      <ArrowLeft
        aria-hidden="true"
        size={20}
        strokeWidth={2}
        className="transition-transform duration-300 group-hover:-translate-x-1.5"
      />
    </Link>
  );
}