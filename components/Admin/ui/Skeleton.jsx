export default function Skeleton({
  className = "",
  rounded = "rounded-xl",
  width,
  height,
}) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={`animate-pulse bg-line/80 motion-reduce:animate-none ${rounded} ${className}`}
    />
  );
}
