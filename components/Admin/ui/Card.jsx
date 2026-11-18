export default function Card({
  children,
  className = "",
  as: Component = "div",
  ...props
}) {
  return (
    <Component
      className={`rounded-3xl border border-[#E7E9EE] bg-white p-6 shadow-card transition-shadow duration-200 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = "" }) {
  return <div className={`mb-4 flex flex-col gap-1 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "", as: Component = "h3" }) {
  return (
    <Component className={`text-lg font-bold text-ink ${className}`}>
      {children}
    </Component>
  );
}

export function CardDescription({ children, className = "" }) {
  return <p className={`text-xs text-muted ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={`mt-5 flex items-center justify-end gap-3 border-t border-line pt-4 ${className}`}>
      {children}
    </div>
  );
}
