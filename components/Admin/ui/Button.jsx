"use client";

import { forwardRef } from "react";
import Spinner from "./Spinner";

const Button = forwardRef(function Button(
  {
    children,
    type = "button",
    variant = "primary",
    size = "md",
    loading = false,
    loadingText,
    disabled = false,
    className = "",
    icon: Icon,
    iconPosition = "start",
    ...props
  },
  ref,
) {
  const baseStyles =
    "relative inline-flex items-center justify-center font-bold transition-all duration-200 select-none overflow-hidden focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";

  const sizeStyles = {
    sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
    md: "h-12 px-5 text-sm rounded-2xl gap-2",
    lg: "h-14 px-7 text-base rounded-2xl gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-gold-gradient text-ink shadow-btn hover:brightness-105 active:scale-[0.99] hover:shadow-[0_10px_24px_rgba(201,162,74,0.35)] before:absolute before:inset-0 before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
    dark: "bg-ink text-white hover:bg-surface-dark active:scale-[0.99] shadow-sm",
    secondary:
      "border border-border bg-white text-ink hover:border-gold hover:bg-gold-tint/30 active:scale-[0.99]",
    ghost: "text-ink hover:bg-black/5 active:scale-[0.99]",
    danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.99] shadow-sm",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner
            size={size === "sm" ? "sm" : "md"}
            color={variant === "primary" ? "ink" : variant === "secondary" || variant === "ghost" ? "gold" : "white"}
          />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === "start" && <Icon className="size-4 shrink-0" aria-hidden="true" />}
          <span>{children}</span>
          {Icon && iconPosition === "end" && <Icon className="size-4 shrink-0" aria-hidden="true" />}
        </>
      )}
    </button>
  );
});

export default Button;
