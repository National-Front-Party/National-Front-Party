import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LockKeyhole, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "يلزم تسجيل الدخول | حزب الجبهة الوطنية",
  description: "يلزم تسجيل الدخول للوصول إلى هذه الصفحة.",
};

export default function UnauthorizedPage() {
  return (
    <main
      className="relative flex h-dvh min-h-0 items-center justify-center overflow-hidden bg-ink px-4 py-4 text-white sm:py-6"
      dir="rtl"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 size-[28rem] rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-white/5 blur-3xl"
      />

      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-surface-dark/80 p-5 text-center shadow-2xl backdrop-blur sm:p-9">
        <div className="mx-auto mb-5 flex h-12 w-40 items-center justify-center sm:mb-6 sm:h-14 sm:w-44">
          <Image
            src="/logo.png"
            alt="حزب الجبهة الوطنية"
            width={192}
            height={64}
            className="h-full w-full object-contain"
            priority
          />
        </div>

        <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold sm:mb-5 sm:size-22">
          <div className="absolute inset-2 rounded-full border border-gold/15" />
          <LockKeyhole className="size-10" strokeWidth={1.6} aria-hidden="true" />
          <span className="absolute -bottom-1 -left-1 flex size-8 items-center justify-center rounded-full border-4 border-surface-dark bg-rose-500 text-white">
            <ShieldAlert className="size-4" aria-hidden="true" />
          </span>
        </div>

        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-gold">401 · يلزم التحقق</p>
        <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">
          يلزم تسجيل الدخول للمتابعة
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65 sm:text-base">
          انتهت صلاحية جلسة الدخول أو لم تسجّل الدخول بعد. سجّل الدخول إلى لوحة التحكم ثم أعد المحاولة.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/admin/login?next=%2Fadmin"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 text-sm font-extrabold text-ink shadow-btn transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            تسجيل الدخول
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-bold text-white/85 transition hover:border-gold/50 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            العودة إلى الموقع
          </Link>
        </div>

        <p className="mt-6 border-t border-white/10 pt-4 text-xs text-white/35">
          رمز الاستجابة: <span dir="ltr">UNAUTHENTICATED</span>
        </p>
      </section>
    </main>
  );
}
