import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NextArrowFooter({
  href,
  onClick,
  ariaLabel = "عرض المزيد",
}) {
  const className =
    "group flex h-12 w-full items-center justify-center rounded-b-3xl bg-gold-gradient text-ink transition-[filter] duration-200 hover:brightness-110";

  const icon = (
    <ArrowLeft
      aria-hidden="true"
      size={20}
      strokeWidth={2}
      className="transition-transform duration-300 group-hover:-translate-x-1.5"
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={className}
      >
        {icon}
      </button>
    );
  }

  return (
    <Link href={href || "#"} aria-label={ariaLabel} className={className}>
      {icon}
    </Link>
  );
}