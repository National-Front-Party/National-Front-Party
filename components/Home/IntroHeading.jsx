import Reveal from "@/components/Home/ui/Reveal";

export default function IntroHeading() {
  return (
    <section className="bg-page px-5 pb-6 pt-10 text-center sm:pt-14">
      <div className="mx-auto max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px]">
        <Reveal direction="down" delay={0.06} duration={0.8}>
          <h1 className="font-display text-[clamp(1.75rem,3.2vw+0.75rem,3.25rem)] font-bold leading-snug text-ink text-balance">
            معا نبني مستقبلا مشرقا لمصر
          </h1>
        </Reveal>
        <Reveal direction="down" delay={0.18} duration={0.8}>
          <p className="mx-auto mt-3 max-w-3xl text-base leading-8 text-muted sm:text-lg min-[1920px]:max-w-4xl min-[1920px]:text-xl text-pretty">
            حزب سياسي مدني ديمقراطي، يحق لأي مصري الانتماء إلى عضويته دون تفرقة أو
            تمييز.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
