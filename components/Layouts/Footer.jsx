"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import Reveal from "@/components/Home/ui/Reveal";
import { CONTACT, FOOTER_LINKS, SOCIAL_LINKS } from "@/data/mock/linksMock";

const subscribeToYear = () => () => { };
const getCurrentYear = () => String(new Date().getFullYear());
const getServerYear = () => "";

function LocationIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px] fill-none stroke-current"
            strokeWidth="1.8"
        >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    );
}

function PhoneIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px] fill-none stroke-current"
            strokeWidth="1.8"
        >
            <path d="M5 4h3l2 5-2 1.5a15 15 0 0 0 5.5 5.5L15 14l5 2v3c0 .6-.4 1-1 1C10.7 20 4 13.3 4 5c0-.6.4-1 1-1Z" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px] fill-none stroke-current"
            strokeWidth="1.8"
        >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3.5 7 8.5 6 8.5-6" />
        </svg>
    );
}

function FacebookIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5h1.7V3.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.8L5.2 22H2.05l7.24-8.28L1.8 2h6.4l4.42 7.22L18.9 2Zm-1.1 18h1.73L7.28 3.9H5.42L17.8 20Z" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current"
            strokeWidth="1.8"
        >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r=".75" className="fill-current stroke-none" />
        </svg>
    );
}

function TikTokIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M15.5 3c.4 2.1 1.8 3.4 4 3.6v3.2a9.3 9.3 0 0 1-4-1.3v6.2a6.1 6.1 0 1 1-5.3-6.1v3.3a2.8 2.8 0 1 0 2.1 2.7V3h3.2Z" />
        </svg>
    );
}

const socialIcons = {
    facebook: FacebookIcon,
    x: XIcon,
    instagram: InstagramIcon,
    tiktok: TikTokIcon,
};

const isPlaceholder = (val) => !val || val.trim().startsWith("[");

function SectionHeading({ children }) {
    return (
        <div className="mb-5">
            <h3 className="font-display text-base font-bold text-gold-light">{children}</h3>
            <span aria-hidden="true" className="mt-3 block h-[2px] w-8 bg-gold" />
        </div>
    );
}

function LinkUnderline() {
    return (
        <span
            aria-hidden="true"
            className="absolute right-0 bottom-0 h-[2px] w-full origin-right scale-x-0 bg-gold transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
        />
    );
}

function Footer() {
    const currentYear = useSyncExternalStore(
        subscribeToYear,
        getCurrentYear,
        getServerYear,
    );

    const handleAnchorClick = (e, link) => {
        if (link.href.startsWith("#")) {
            e.preventDefault();
            const id = link.href.slice(1);
            const target = document.getElementById(id);
            const focusElement = link.focus ? document.getElementById(link.focus) : null;

            const prefersReduced =
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            let isAlreadyAtTarget = false;
            if (target) {
                const rect = target.getBoundingClientRect();
                const readingLine = window.innerHeight * 0.3;
                if (rect.top <= readingLine && rect.bottom >= readingLine) {
                    isAlreadyAtTarget = true;
                }
            }

            const focusTarget = () => {
                if (focusElement) {
                    focusElement.focus({ preventScroll: true });
                } else if (target) {
                    target.focus({ preventScroll: true });
                }
            };

            window.history.replaceState(null, "", link.href);

            if (isAlreadyAtTarget) {
                focusTarget();
                return;
            }

            if (prefersReduced) {
                if (target) {
                    target.scrollIntoView({ behavior: "auto", block: "start" });
                }
                focusTarget();
                return;
            }

            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });

                let focused = false;
                const safeFocus = () => {
                    if (!focused) {
                        focused = true;
                        focusTarget();
                    }
                };

                if ("onscrollend" in window) {
                    const handleScrollEnd = () => {
                        window.removeEventListener("scrollend", handleScrollEnd);
                        safeFocus();
                    };
                    window.addEventListener("scrollend", handleScrollEnd, { once: true });
                    setTimeout(safeFocus, 800);
                } else {
                    setTimeout(safeFocus, 700);
                }
            }
        }
    };

    return (
        <footer dir="rtl" className="bg-ink text-on-dark">
            <div aria-hidden="true" className="h-[3px] bg-gold-gradient" />

            <div className="mx-auto grid max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] grid-cols-1 gap-10 px-5 py-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
                <Reveal direction="up" delay={0.05} duration={0.7}>
                    <section>
                        <div className="inline-flex max-w-full">
                            <Image
                                src="/logo2.png"
                                alt="شعار حزب الجبهة الوطنية"
                                width={2172}
                                height={724}
                                className="h-auto w-[240px] max-w-full object-contain"
                            />
                        </div>
                        <p className="mt-5 text-sm leading-7 text-on-dark/80">
                            كيان سياسي مصري يسعى لتعزيز قيم العدالة الاجتماعية والحرية وسيادة
                            القانون، مع التركيز على تمكين المشاركة الشعبية وبناء مستقبل مشرق لكل
                            أبناء الوطن.
                        </p>
                    </section>
                </Reveal>

                <Reveal direction="up" delay={0.15} duration={0.7}>
                    <nav aria-label="روابط التذييل">
                        <SectionHeading>روابط سريعة</SectionHeading>
                        <ul className="space-y-2">
                            {FOOTER_LINKS.map((link) => (
                                <li key={link.label}>
                                    <a
                                        href={link.href}
                                        onClick={(e) => handleAnchorClick(e, link)}
                                        className="group relative inline-block py-1 text-on-dark/80 transition-colors duration-300 hover:text-white focus-visible:text-white motion-reduce:transition-none"
                                    >
                                        {link.label}
                                        <LinkUnderline />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </Reveal>

                <Reveal direction="up" delay={0.25} duration={0.7}>
                    <section>
                        <SectionHeading>تواصل معنا</SectionHeading>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm leading-7 text-on-dark/80">
                                <span className="mt-1 shrink-0 text-gold">
                                    <LocationIcon />
                                </span>
                                <span>{CONTACT.address}</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 shrink-0 text-gold">
                                    <PhoneIcon />
                                </span>
                                {isPlaceholder(CONTACT.phone) ? (
                                    <span dir="ltr" className="py-1 text-on-dark/80">
                                        {CONTACT.phone}
                                    </span>
                                ) : (
                                    <a
                                        href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
                                        dir="ltr"
                                        className="group relative inline-block py-1 text-on-dark/80 transition-colors duration-300 hover:text-white focus-visible:text-white motion-reduce:transition-none"
                                    >
                                        {CONTACT.phone}
                                        <LinkUnderline />
                                    </a>
                                )}
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1 shrink-0 text-gold">
                                    <MailIcon />
                                </span>
                                {isPlaceholder(CONTACT.email) ? (
                                    <span dir="ltr" className="py-1 text-on-dark/80">
                                        {CONTACT.email}
                                    </span>
                                ) : (
                                    <a
                                        href={`mailto:${CONTACT.email.trim()}`}
                                        dir="ltr"
                                        className="group relative inline-block py-1 text-on-dark/80 transition-colors duration-300 hover:text-white focus-visible:text-white motion-reduce:transition-none"
                                    >
                                        {CONTACT.email}
                                        <LinkUnderline />
                                    </a>
                                )}
                            </li>
                        </ul>
                    </section>
                </Reveal>

                <Reveal direction="up" delay={0.35} duration={0.7}>
                    <section>
                        <SectionHeading>تابعنا</SectionHeading>
                        <div className="flex flex-wrap gap-3">
                            {SOCIAL_LINKS.map(({ id, label, href }) => {
                                const Icon = socialIcons[id] || FacebookIcon;
                                return (
                                    <a
                                        key={id}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="flex h-11 w-11 items-center justify-center rounded-full border border-line-dark text-white transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:bg-gold hover:text-ink motion-reduce:transition-none"
                                    >
                                        <Icon />
                                    </a>
                                );
                            })}
                        </div>
                    </section>
                </Reveal>
            </div>

            <div className="border-t border-line-dark">
                <div className="mx-auto flex max-w-[1320px] min-[1536px]:max-w-[1440px] min-[1920px]:max-w-[1600px] justify-center px-5 py-5 text-sm text-on-dark/70">
                    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                        <span>
                            جميع الحقوق محفوظة ©{" "}
                            <span className="inline-block min-w-[2.5em] text-center tabular-nums">
                                {currentYear}
                            </span>{" "}
                            حزب الجبهة الوطنية
                        </span>
                        <span className="rounded-full border border-gold px-2.5 py-0.5 text-xs text-gold-light">
                            نسخة Beta
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
