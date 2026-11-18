"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { ApiError } from "@/lib/admin/api";
import Field from "@/components/Admin/ui/Field";
import Spinner from "@/components/Admin/ui/Spinner";

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function LoginForm() {
  const { user, status, login } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = searchParams.get("next");
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [alertError, setAlertError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const passwordInputRef = useRef(null);

  // If already authenticated, redirect to /admin
  useEffect(() => {
    if (status === "authenticated" && user) {
      if (user.mustChangePassword) {
        router.replace("/admin/change-password");
      } else {
        const destination =
          nextUrl && nextUrl.startsWith("/admin") && nextUrl !== "/admin/login"
            ? nextUrl
            : "/admin";
        router.replace(destination);
      }
    }
  }, [status, user, nextUrl, router]);

  // Live countdown timer for lockout or rate limit
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAlertError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (countdown > 0 || isSubmitting) return;

    setAlertError("");
    const errors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "يرجى إدخال البريد الإلكتروني";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!password) {
      errors.password = "يرجى إدخال كلمة المرور";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await login({ email: trimmedEmail, password });
      setPassword("");

      if (res?.mustChangePassword) {
        router.push("/admin/change-password");
      } else {
        const destination =
          nextUrl && nextUrl.startsWith("/admin") && nextUrl !== "/admin/login"
            ? nextUrl
            : "/admin";
        router.push(destination);
      }
    } catch (err) {
      setPassword("");
      triggerShake();
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }

      if (err instanceof ApiError) {
        if (err.status === 423 || err.code === "ACCOUNT_LOCKED") {
          const seconds = err.retryAfterSeconds || 900;
          setCountdown(seconds);
          setAlertError(
            `تم قفل الحساب مؤقتًا بسبب تكرار المحاولات الخاطئة. يرجى الانتظار ${formatCountdown(
              seconds,
            )}`,
          );
        } else if (err.status === 429 || err.code === "RATE_LIMITED") {
          const seconds = err.retryAfterSeconds || 60;
          setCountdown(seconds);
          setAlertError(
            `تجاوزت الحد المسموح من المحاولات. حاول مرة أخرى بعد ${formatCountdown(
              seconds,
            )}`,
          );
        } else if (err.code === "INVALID_CREDENTIALS" || err.status === 401) {
          setAlertError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else {
          setAlertError(err.message);
        }
      } else {
        setAlertError("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى لاحقاً");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`relative w-full max-w-lg rounded-3xl border border-line border-t-[6px] border-t-gold bg-white p-7 sm:p-10 shadow-card transition-all duration-300 ${
        shake ? "animate-[shake_0.45s_ease-in-out] motion-reduce:animate-none" : ""
      }`}
    >
      {/* Brand Header matching Home Modals */}
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="relative mb-3 h-12 w-48">
          <Image
            src="/logo.png"
            alt="شعار حزب الجبهة الوطنية"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">
          لوحة التحكم
        </h1>
        <p className="mt-1 text-sm font-medium text-muted">
          تسجيل الدخول للموظفين وإدارة النظام
        </p>
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1 w-12 rounded-full bg-gold-gradient transition-all duration-500"
        />
      </div>

      {/* Session messages */}
      {reason === "expired" && !alertError && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-bold text-amber-900"
        >
          <svg className="size-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>انتهت الجلسة، سجل دخولك مرة أخرى</span>
        </div>
      )}

      {reason === "logout" && !alertError && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-900"
        >
          <svg className="size-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>تم تسجيل الخروج بنجاح</span>
        </div>
      )}

      {/* Alert Error Box */}
      {alertError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900 animate-elem-fade-up motion-reduce:animate-none"
        >
          <svg
            className="mt-0.5 size-4 shrink-0 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1">
            <p>{alertError}</p>
            {countdown > 0 && (
              <p className="mt-1 font-mono text-xs text-red-700">
                الوقت المتبقي: {formatCountdown(countdown)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Login Form matching RequestForm / JoinModal structure */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          id="login-email"
          name="email"
          type="email"
          label="البريد الإلكتروني"
          placeholder="example@nationalfrontparty.com"
          dir="ltr"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
          }}
          error={fieldErrors.email}
          disabled={isSubmitting || countdown > 0}
        />

        <Field
          ref={passwordInputRef}
          id="login-password"
          name="password"
          type="password"
          label="كلمة المرور"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
          }}
          error={fieldErrors.password}
          disabled={isSubmitting || countdown > 0}
        />

        <div className="pt-3">
          <button
            type="submit"
            disabled={countdown > 0 || isSubmitting}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-6 font-bold text-ink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" color="ink" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <>
                <span>
                  {countdown > 0
                    ? `محظور مؤقتاً (${formatCountdown(countdown)})`
                    : "تسجيل الدخول"}
                </span>
                {countdown <= 0 && (
                  <svg
                    className="size-4 rotate-180 text-ink/70 transition-transform duration-300 group-hover:-translate-x-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center bg-[#15171C] px-4 py-12"
      dir="rtl"
    >
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute top-1/4 right-1/4 size-96 rounded-full bg-gold/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-1/4 left-1/4 size-96 rounded-full bg-[#8c6a16]/10 blur-3xl"
        aria-hidden="true"
      />

      <Suspense
        fallback={
          <div className="w-full max-w-lg rounded-3xl border border-line border-t-[6px] border-t-gold bg-white p-8 text-center shadow-card">
            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            <p className="mt-3 text-xs text-muted">جارٍ تحميل النموذج...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
