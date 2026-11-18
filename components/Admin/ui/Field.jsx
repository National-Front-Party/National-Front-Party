"use client";

import { forwardRef, useState } from "react";

export const inputClass =
  "h-14 w-full rounded-2xl border border-border bg-white px-4 text-ink placeholder:text-muted/60 shadow-none transition-all duration-300 ease-in-out hover:border-gold focus:!border-transparent focus:!outline-none focus:!ring-0 focus:!shadow-[0_2px_5px_rgba(201,162,74,0.45)] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none";

const Field = forwardRef(function Field(
  {
    id,
    name,
    label,
    type = "text",
    value,
    defaultValue,
    onChange,
    onBlur,
    placeholder,
    hint,
    error,
    required = false,
    disabled = false,
    dir,
    autoComplete,
    className = "",
    inputClassName = "",
    children,
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (showPassword ? "text" : "password") : type;
  const errorId = error ? `${id || name}-error` : undefined;
  const hintId = hint ? `${id || name}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id || name}
          className="mb-2 block text-sm font-bold text-ink"
        >
          <span>
            {label}
            {required && <span aria-hidden="true" className="mr-1 text-gold">*</span>}
          </span>
          {hint && !error && (
            <span id={hintId} className="mr-2 text-xs font-normal text-muted">
              {hint}
            </span>
          )}
        </label>
      )}

      {children ? (
        children
      ) : (
        <div className="relative">
          <input
            ref={ref}
            id={id || name}
            name={name}
            type={effectiveType}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            dir={dir}
            autoComplete={autoComplete}
            aria-required={required ? "true" : undefined}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`${inputClass} ${isPassword ? "pl-12" : ""} ${
              error
                ? "border-[#C0392B] focus:!border-[#C0392B] focus:!ring-2 focus:!ring-[#C0392B]/20 focus:!shadow-[0_0_0_3px_rgba(192,57,43,0.16)]"
                : ""
            } ${inputClassName}`}
            style={error ? { borderColor: "#C0392B" } : undefined}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink focus:outline-none"
            >
              {showPassword ? (
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="request-error-enter mt-1.5 flex items-center gap-1 text-xs text-red-600 animate-elem-fade-up motion-reduce:animate-none"
        >
          <svg
            className="size-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

export default Field;
