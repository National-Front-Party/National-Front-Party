export default function PageHeader({
  title,
  description,
  badge,
  actions,
  className = "",
}) {
  return (
    <div
      className={`mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
