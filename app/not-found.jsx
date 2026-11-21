import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Compass } from "lucide-react";

export const metadata = {
  title: "الصفحة غير موجودة | حزب الجبهة الوطنية",
  description: "عذرًا، الصفحة التي تبحث عنها غير موجودة.",
};

export default function NotFound() {
  return (
    <main
      className="not-found-screen fixed inset-0 z-[100] flex h-dvh items-center justify-center overflow-hidden bg-ink px-4 py-4 text-white sm:py-6"
      dir="rtl"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 size-[28rem] rounded-full bg-gold/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-white/5 blur-3xl" />

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

        <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold sm:mb-5">
          <div className="absolute inset-2 rounded-full border border-gold/15" />
          <Compass className="size-10" strokeWidth={1.6} aria-hidden="true" />
        </div>

        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-gold">404 · خطأ في العنوان</p>
        <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">
          هذه الصفحة غير موجودة
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65 sm:text-base">
          ربما نُقلت الصفحة أو أن الرابط الذي استخدمته غير صحيح. يمكنك العودة إلى الصفحة الرئيسية ومتابعة التصفح.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 text-sm font-extrabold text-ink shadow-btn transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          العودة إلى الرئيسية
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
