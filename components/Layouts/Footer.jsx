"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

const subscribeToYear = () => () => { };
const getCurrentYear = () => String(new Date().getFullYear());
const getServerYear = () => "";

const quickLinks = [
    { label: "الرئيسية", href: "/" },
    { label: "الأمانات المركزية", href: "/central-secretariats" },
    { label: "أمانات المحافظات", href: "/governorates" },
    { label: "الوحدة البرلمانية", href: "/parliamentary-unit" },
    { label: "مع الحكومة والوزارات", href: "/government" },
    { label: "رؤية مصر 2030", href: "/vision-2030" },
    { label: "القرية", href: "/village" },
    { label: "العزبة", href: "/ezba" },
];

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

const contact = {
    location: {
        text: "[عنوان المقر الرئيسي]",
        Icon: LocationIcon,
    },
    phone: {
        text: "[رقم الهاتف]",
        href: "tel:...",
        Icon: PhoneIcon,
    },
    email: {
        text: "[البريد الإلكتروني]",
        href: "mailto:...",
        Icon: MailIcon,
    },
};

const socials = [
    {
        label: "فيسبوك",
        href: "https://www.facebook.com/ElgabhaElwatanya/",
        Icon: FacebookIcon,
    },
    {
        label: "إكس",
        href: "https://x.com/gabhaElwatanya",
        Icon: XIcon,
    },
    {
        label: "انستجرام",
        href: "https://www.instagram.com/elgabhaelwatanya",
        Icon: InstagramIcon,
    },
    {
        label: "تيك توك",
        href: "https://www.tiktok.com/@elgabhaelwatanya",
        Icon: TikTokIcon,
    },
];

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

    return (
        <footer dir="rtl" className="bg-ink text-on-dark">
            <div aria-hidden="true" className="h-[3px] bg-gold-gradient" />

            <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-5 py-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
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

                <nav aria-label="روابط التذييل">
                    <SectionHeading>روابط سريعة</SectionHeading>
                    <ul className="space-y-2">
                        {quickLinks.map(({ label, href }) => (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className="group relative inline-block py-1 text-on-dark/80 transition-colors duration-300 hover:text-white focus-visible:text-white motion-reduce:transition-none"
                                >
                                    {label}
                                    <LinkUnderline />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <section>
                    <SectionHeading>تواصل معنا</SectionHeading>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3 text-sm leading-7 text-on-dark/80">
                            <span className="mt-1 shrink-0 text-gold">
                                <contact.location.Icon />
                            </span>
                            <span>{contact.location.text}</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 shrink-0 text-gold">
                                <contact.phone.Icon />
                            </span>
                            <a
                                href={contact.phone.href}
                                dir="ltr"
                                className="group relative inline-block py-1 text-on-dark/80 transition-colors duration-300 hover:text-white focus-visible:text-white motion-reduce:transition-none"
                            >
                                {contact.phone.text}
                                <LinkUnderline />
                            </a>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 shrink-0 text-gold">
                                <contact.email.Icon />
                            </span>
                            <a
                                href={contact.email.href}
                                dir="ltr"
                                className="group relative inline-block py-1 text-on-dark/80 transition-colors duration-300 hover:text-white focus-visible:text-white motion-reduce:transition-none"
                            >
                                {contact.email.text}
                                <LinkUnderline />
                            </a>
                        </li>
                    </ul>
                </section>

                <section>
                    <SectionHeading>تابعنا</SectionHeading>
                    <div className="flex flex-wrap gap-3">
                        {socials.map(({ label, href, Icon }) => (
                            <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-line-dark text-white transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:bg-gold hover:text-ink motion-reduce:transition-none"
                            >
                                <Icon />
                            </a>
                        ))}
                    </div>
                </section>
            </div>

            <div className="border-t border-line-dark">
                <div className="mx-auto flex max-w-[1320px] justify-center px-5 py-5 text-sm text-on-dark/70">
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
