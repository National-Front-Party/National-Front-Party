export const sectionCardHoverClassName =
  "group relative border border-transparent transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none hover:border-gold hover:-translate-y-1 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--color-gold)_35%,transparent)]";

export function SectionCardHeader({
  title,
  variant = "light",
  className = "",
  showUnderline = true,
}) {
  const isDark = variant === "dark";

  return (
    <header
      className={`shrink-0 p-4 text-center ${
        isDark ? "bg-ink text-white" : "text-ink"
      } ${className}`}
    >
      <h2 className="text-xl font-bold">{title}</h2>
      {showUnderline ? (
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-gold-gradient transition-all duration-500 group-hover:w-20 motion-reduce:transition-none"
        />
      ) : null}
    </header>
  );
}

export default function SectionCard({
  title,
  children,
  footer,
  className = "",
  contentClassName = "",
  headerClassName = "",
  showUnderline = true,
  variant = "light",
}) {
  const isDark = variant === "dark";

  return (
    <section
      aria-label={title}
      className={`flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl shadow-card ${sectionCardHoverClassName} ${
        isDark ? "bg-ink text-white" : "bg-white text-ink"
      } ${className}`}
    >
      <SectionCardHeader
        title={title}
        variant={variant}
        className={headerClassName}
        showUnderline={showUnderline}
      />
      <div
        className={`flex-1 min-h-0 overflow-visible p-4 flex flex-col ${
          isDark ? "text-white" : "text-ink"
        } ${contentClassName}`}
      >
        {children}
      </div>
      {footer ? <div className="mt-auto shrink-0">{footer}</div> : null}
    </section>
  );
}
