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
          className="mx-auto mt-2 h-1 w-12 rounded-full bg-gold-gradient"
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
  scroll = false,
}) {
  const isDark = variant === "dark";

  return (
    <section
      aria-label={title}
      className={`flex h-auto min-h-fit min-w-0 flex-1 flex-col overflow-hidden rounded-3xl shadow-card xl:h-full ${
        isDark ? "bg-ink text-white" : "bg-white text-ink"
      } ${scroll ? "xl:min-h-0" : ""} ${className}`}
    >
      <SectionCardHeader
        title={title}
        variant={variant}
        className={headerClassName}
        showUnderline={showUnderline}
      />
      <div
        className={`flex-1 min-h-fit overflow-visible p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          scroll ? "xl:min-h-0 xl:overflow-y-auto" : ""
        } ${
          isDark ? "text-white" : "text-ink"
        } ${contentClassName}`}
      >
        {children}
      </div>
      {footer ? <div className="mt-auto shrink-0">{footer}</div> : null}
    </section>
  );
}
