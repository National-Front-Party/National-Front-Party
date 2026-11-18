import { getRoleLabel } from "@/lib/admin/permissions";

const TONES = {
  gold: "bg-gold-tint border border-gold/40 text-gold-dark",
  ink: "bg-ink text-gold border border-gold/30",
  green: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  red: "bg-rose-50 border border-rose-200 text-rose-800",
  blue: "bg-sky-50 border border-sky-200 text-sky-800",
  gray: "bg-gray-100 border border-gray-200 text-gray-700",
  purple: "bg-purple-50 border border-purple-200 text-purple-800",
};

export default function Badge({
  children,
  tone = "gold",
  size = "sm",
  dot = false,
  className = "",
}) {
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold select-none ${
        TONES[tone] || TONES.gold
      } ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`size-1.5 rounded-full ${
            tone === "green"
              ? "bg-emerald-600"
              : tone === "red"
              ? "bg-rose-600"
              : tone === "blue"
              ? "bg-sky-600"
              : "bg-gold"
          }`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function RoleBadge({ role, className = "" }) {
  const roleTones = {
    super_admin: "ink",
    membership_officer: "blue",
    service_officer: "green",
    content_editor: "purple",
    news_editor: "gold",
    news_reviewer: "blue",
  };

  const label = getRoleLabel(role);
  const tone = roleTones[role] || "gray";

  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}
