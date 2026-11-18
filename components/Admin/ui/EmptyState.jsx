export default function EmptyState({
  icon: Icon,
  title = "قريباً",
  description = "هذا القسم قيد التطوير وسيتم تفعيله في المراحل القادمة.",
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-white/60 p-12 text-center ${className}`}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gold-tint text-gold border border-gold/30">
        {Icon ? (
          <Icon className="size-8" aria-hidden="true" />
        ) : (
          <svg
            className="size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>

      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
