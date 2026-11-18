"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import JoinButton from "@/components/JoinButton";
import { NAV_LINKS, SOCIAL_LINKS } from "@/data/mock/linksMock";

function NavigationLinks({
    activeHash,
    setActiveHash,
    onNavigate,
    isMobile = false,
    isMenuOpen = false,
}) {
    const handleAnchorClick = (e, href) => {
        if (onNavigate) {
            onNavigate();
        }
        if (href.startsWith("#")) {
            e.preventDefault();
            const id = href.slice(1);
            const target = document.getElementById(id);
            if (target) {
                const prefersReduced =
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                target.scrollIntoView({
                    behavior: prefersReduced ? "auto" : "smooth",
                    block: "start",
                });
                target.focus({ preventScroll: true });
                window.history.pushState(null, "", href);
                if (setActiveHash) {
                    setActiveHash(href);
                }
            }
        }
    };

    return (
        <ul className={isMobile ? "flex w-full flex-col" : "flex flex-wrap justify-center gap-1"}>
            {NAV_LINKS.map(({ label, href }, index) => {
                const isActive = activeHash === href || (!activeHash && href === "#c-home");

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
                                        : `${(NAV_LINKS.length - index) * 25}ms`,
                                }
                                : undefined
                        }
                    >
                        <a
                            href={href}
                            onClick={(e) => handleAnchorClick(e, href)}
                            aria-current={isActive ? "page" : undefined}
                            className={`relative flex min-h-12 items-center border-b-[3px] border-transparent px-3 text-[15px] font-extrabold whitespace-nowrap transition-colors hover:text-gold-dark after:absolute after:right-0 after:bottom-[-3px] after:h-[3px] after:w-0 after:bg-gold after:content-[''] after:transition-[width] after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:w-full ${isActive
                                    ? "text-gold-dark after:w-full"
                                    : "text-ink"
                                } ${isMobile ? "w-full justify-start" : ""}`}
                        >
                            {label}
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}

function FacebookLink() {
    const facebook = SOCIAL_LINKS.find((s) => s.id === "facebook");

    return (
        <a
            href={facebook?.href || "https://www.facebook.com/ElgabhaElwatanya/"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="فيسبوك حزب الجبهة الوطنية"
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
    const [activeHash, setActiveHash] = useState("");
    const [menuState, setMenuState] = useState(() => ({
        pathname,
        isMenuOpen: false,
    }));

    useEffect(() => {
        const updateHash = () => {
            setActiveHash(window.location.hash || "#c-home");
        };
        updateHash();
        window.addEventListener("hashchange", updateHash);
        return () => window.removeEventListener("hashchange", updateHash);
    }, []);

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
                    <JoinButton
                        className="min-h-12 rounded-btn bg-ink px-5 font-extrabold text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-gold-dark hover:shadow-card active:translate-y-0 active:scale-[0.99] active:shadow-btn motion-reduce:transition-none sm:px-7"
                    />
                </div>
            </div>

            <nav
                aria-label="القائمة الرئيسية"
                className="hidden border-t border-line min-[992px]:block"
            >
                <div className="mx-auto max-w-[1320px] px-5">
                    <NavigationLinks
                        activeHash={activeHash}
                        setActiveHash={setActiveHash}
                    />
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
                                activeHash={activeHash}
                                setActiveHash={setActiveHash}
                                onNavigate={() => setIsMenuOpen(false)}
                                isMobile
                                isMenuOpen={isMenuOpen}
                            />
                        </div>
                        <div className="flex justify-center border-t border-line px-5 py-4">
                            <JoinButton
                                className="min-h-12 w-full max-w-[420px] rounded-btn bg-ink px-7 font-extrabold text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-gold-dark hover:shadow-card active:translate-y-0 active:scale-[0.99] active:shadow-btn motion-reduce:transition-none"
                                style={{
                                    opacity: isMenuOpen ? 1 : 0,
                                    transform: `translateX(${isMenuOpen ? 0 : 30}px)`,
                                    transitionDelay: isMenuOpen ? `${NAV_LINKS.length * 25}ms` : "0ms",
                                }}
                            />
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}