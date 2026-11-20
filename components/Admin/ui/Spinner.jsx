"use client";

export default function Spinner({ size = "md", className = "", color = "gold" }) {
  const sizeMap = {
    sm: "size-4 border-2",
    md: "size-6 border-2",
    lg: "size-8 border-3",
  };

  const colorMap = {
    gold: "border-gold/30 border-t-gold",
    white: "border-white/30 border-t-white",
    ink: "border-ink/20 border-t-ink",
  };

  return (
    <div
      role="status"
      aria-label="جارٍ التحميل"
      className={`inline-block shrink-0 animate-spin rounded-full ${
        sizeMap[size] ?? sizeMap.md
      } ${colorMap[color] ?? colorMap.gold} ${className}`}
    >
      <span className="sr-only">جارٍ التحميل...</span>
    </div>
  );
}
