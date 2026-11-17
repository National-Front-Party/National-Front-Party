import Link from "next/link";

export default function NextArrowFooter({ href }) {
  return (
    <Link
      href={href}
      aria-label="عرض المزيد"
      className="flex h-12 w-full items-center justify-center rounded-b-3xl bg-gold-gradient text-ink transition-[filter] duration-200 hover:brightness-110"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M19 12H5m0 0 7 7m-7-7 7-7" />
      </svg>
    </Link>
  );
}
