"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
    { label: "الرئيسية", href: "/" },
    { label: "الأمانات المركزية", href: "/central-secretariats" },
    { label: "أمانات المحافظات", href: "/governorates" },
    { label: "الوحدة البرلمانية", href: "/parliamentary-unit" },
    { label: "مع الحكومة والوزارات", href: "/government" },
    { label: "رؤية مصر 2030", href: "/vision-2030" },
    { label: "القرية", href: "/village" },
    { label: "العزبة", href: "/ezba" },
];

function isActiveLink(pathname, href) {
    return href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({
    pathname,
    onNavigate,
    isMobile = false,
    isMenuOpen = false,
}) {
    return (
        <ul className={isMobile ? "flex w-full flex-col" : "flex flex-wrap justify-center gap-1"}>
            {links.map(({ label, href }, index) => {
                const isActive = isActiveLink(pathname, href);

                return (
                    <li
                        key={href}
                        className={
                            isMobile
                                ? "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                : undefined
                        }
                        style={
                            isMobile
                                ? {
                                    opacity: isMenuOpen ? 1 : 0,
                                    transform: `translateX(${isMenuOpen ? 0 : 30}px)`,
                                    transitionDelay: isMenuOpen
                                        ? `${index * 25}ms`
                                        : `${(links.length - index) * 25}ms`,
                                }
                                : undefined
                        }
                    >
                        <Link
                            href={href}
                            onClick={onNavigate}
                            aria-current={isActive ? "page" : undefined}
                            className={`relative flex min-h-12 items-center border-b-[3px] border-transparent px-3 text-[15px] font-extrabold whitespace-nowrap transition-colors hover:text-gold-dark after:absolute after:right-0 after:bottom-[-3px] after:h-[3px] after:w-0 after:bg-gold after:content-[''] after:transition-[width] after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:w-full ${isActive
                                    ? "text-gold-dark after:w-full"
                                    : "text-ink"
                                } ${isMobile ? "w-full justify-start" : ""}`}
                        >
                            {label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

function FacebookLink() {
    return (
        <a
            href="https://www.facebook.com/ElgabhaElwatanya/"
            target="_blank"
            rel="noopener"
            aria-label="صفحة حزب الجبهة الوطنية على فيسبوك"
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-border text-ink shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:scale-[1.03] hover:bg-ink hover:text-white hover:shadow-card active:translate-y-0 active:scale-[0.98] active:shadow-sm motion-reduce:transition-none"
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-current"
            >
                <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5h1.7V3.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
            </svg>
        </a>
    );
}

export default function Navbar() {
    const pathname = usePathname();

    return <NavbarContent pathname={pathname} />;
}

function NavbarContent({ pathname }) {
    const [menuState, setMenuState] = useState(() => ({
        pathname,
        isMenuOpen: false,
    }));

    if (menuState.pathname !== pathname) {
        setMenuState({ pathname, isMenuOpen: false });
    }

    const isMenuOpen = menuState.isMenuOpen;
    const setIsMenuOpen = (nextState) => {
        setMenuState((current) => ({
            pathname,
            isMenuOpen:
                typeof nextState === "function"
                    ? nextState(current.isMenuOpen)
                    : nextState,
        }));
    };

    return (
        <header
            dir="rtl"
            className="sticky top-0 z-50 border-b border-line bg-white/90 shadow-sm backdrop-blur"
        >
            <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-y-2 px-5 py-3 max-[991px]:flex-wrap max-[479px]:py-2">
                <Link
                    href="/"
                    className="flex min-w-0 items-center gap-3 max-[991px]:flex-1"
                    aria-label="حزب الجبهة الوطنية - الرئيسية"
                >
                    <Image
                        src="/logo.png"
                        alt="شعار حزب الجبهة الوطنية"
                        width={2172}
                        height={724}
                        loading="eager"
                        className="h-auto w-[150px] shrink-0 object-contain min-[480px]:w-[180px] min-[992px]:w-[186px]"
                    />
                    {/* <span className="text-[13px] font-bold text-muted max-[520px]:hidden">
                        الموقع الإلكتروني الرسمي
                    </span> */}
                </Link>

                <div className="flex shrink-0 items-center gap-2 min-[992px]:hidden">
                    <FacebookLink />
                    <button
                        type="button"
                        aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-primary-navigation"
                        onClick={() => setIsMenuOpen((open) => !open)}
                        className="flex h-[46px] w-[46px] items-center justify-center rounded-btn border border-border text-ink"
                    >
                        <span aria-hidden="true" className="relative h-5 w-5">
                            <span
                                className="absolute left-0 right-0 top-1/2 h-0.5 origin-center rounded-full bg-current transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{
                                    transform: isMenuOpen
                                        ? "translateY(-50%) rotate(45deg)"
                                        : "translateY(calc(-50% - 6px))",
                                }}
                            />
                            <span
                                className="absolute left-0 right-0 top-1/2 h-0.5 origin-center rounded-full bg-current transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{
                                    opacity: isMenuOpen ? 0 : 1,
                                    transform: `translateY(-50%) scaleX(${isMenuOpen ? 0 : 1})`,
                                }}
                            />
                            <span
                                className="absolute left-0 right-0 top-1/2 h-0.5 origin-center rounded-full bg-current transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                style={{
                                    transform: isMenuOpen
                                        ? "translateY(-50%) rotate(-45deg)"
                                        : "translateY(calc(-50% + 6px))",
                                }}
                            />
                        </span>
                    </button>
                </div>

                <div className="hidden shrink-0 items-center gap-2 min-[992px]:flex">
                    <FacebookLink />
                    <button
                        type="button"
                        className="min-h-12 rounded-btn bg-ink px-5 font-extrabold text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-gold-dark hover:shadow-card active:translate-y-0 active:scale-[0.99] active:shadow-btn motion-reduce:transition-none sm:px-7"
                    >
                        انضم للحزب
                    </button>
                </div>
            </div>

            <nav
                aria-label="القائمة الرئيسية"
                className="hidden border-t border-line min-[992px]:block"
            >
                <div className="mx-auto max-w-[1320px] px-5">
                    <NavigationLinks pathname={pathname} />
                </div>
            </nav>

            <div
                id="mobile-primary-navigation"
                aria-hidden={!isMenuOpen}
                inert={!isMenuOpen}
                className="absolute inset-x-0 top-full z-[60] overflow-x-clip min-[992px]:hidden"
            >
                <div
                    className={`max-h-[calc(100dvh-6rem)] overflow-y-auto border-t border-line bg-white/95 shadow-card backdrop-blur transition-[opacity,transform] ease-[cubic-bezier(0.16,1,0.3,1)] ${isMenuOpen
                        ? "duration-300 translate-x-0 opacity-100"
                        : "pointer-events-none duration-500 translate-x-4 opacity-0"
                        }`}
                >
                    <nav aria-label="القائمة الرئيسية">
                        <div className="mx-auto max-w-[1320px] px-5 py-2">
                            <NavigationLinks
                                pathname={pathname}
                                onNavigate={() => setIsMenuOpen(false)}
                                isMobile
                                isMenuOpen={isMenuOpen}
                            />
                        </div>
                        <div className="flex justify-center border-t border-line px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(false)}
                                className="min-h-12 w-full max-w-[420px] rounded-btn bg-ink px-7 font-extrabold text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-gold-dark hover:shadow-card active:translate-y-0 active:scale-[0.99] active:shadow-btn motion-reduce:transition-none"
                                style={{
                                    opacity: isMenuOpen ? 1 : 0,
                                    transform: `translateX(${isMenuOpen ? 0 : 30}px)`,
                                    transitionDelay: isMenuOpen ? `${links.length * 25}ms` : "0ms",
                                }}
                            >
                                انضم للحزب
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}