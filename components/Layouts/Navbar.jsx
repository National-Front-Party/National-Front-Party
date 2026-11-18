"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import JoinButton from "@/components/JoinButton";
import { NAV_LINKS, SOCIAL_LINKS } from "@/data/mock/linksMock";

function NavigationLinks({
    activeKey,
    onLinkClick,
    linkRefs,
    isMobile = false,
    isMenuOpen = false,
}) {
    return (
        <ul
            className={
                isMobile
                    ? "flex w-full flex-col"
                    : "flex items-center min-[1200px]:justify-center justify-start gap-1 min-w-max"
            }
        >
            {NAV_LINKS.map((link, index) => {
                const { label, href } = link;
                const isActive = activeKey === label;

                return (
                    <li
                        key={label}
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
                            ref={(el) => {
                                if (linkRefs) {
                                    if (el && !isMobile) {
                                        linkRefs.current.set(label, el);
                                    } else if (!isMobile) {
                                        linkRefs.current.delete(label);
                                    }
                                }
                            }}
                            href={href}
                            onClick={(e) => onLinkClick(e, link)}
                            aria-current={isActive ? "location" : undefined}
                            data-active={isActive ? "true" : undefined}
                            className={`relative flex min-h-12 items-center border-b-[3px] border-transparent px-3 text-[15px] font-extrabold whitespace-nowrap transition-colors hover:text-gold-dark after:absolute after:right-0 after:bottom-[-3px] after:h-[3px] after:w-0 after:bg-gold after:content-[''] after:transition-[width] after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:w-full ${
                                isActive
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
    const [activeKey, setActiveKey] = useState("الرئيسية");
    const [menuState, setMenuState] = useState(() => ({
        pathname,
        isMenuOpen: false,
    }));

    const logoRef = useRef(null);
    const linkRefs = useRef(new Map());
    const isClickScrollingRef = useRef(false);
    const lastClickedHrefRef = useRef(null);
    const lastClickedGeoFieldRef = useRef(null);

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

    // Scroll-spy listener
    useEffect(() => {
        let ticking = false;

        const updateActiveLinkFromScroll = () => {
            if (isClickScrollingRef.current) return;

            const scrollY = window.scrollY || window.pageYOffset;

            // At the very top of the page (scrollY within 80px of 0), "الرئيسية" is active.
            if (scrollY <= 80) {
                setActiveKey("الرئيسية");
                lastClickedGeoFieldRef.current = null;
                return;
            }

            // Near the very bottom of the page (the footer), keep the last active link.
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            if (scrollY + clientHeight >= scrollHeight - 60) {
                return;
            }

            const readingLine = window.innerHeight * 0.3;

            // Find sections whose bounding box contains the reading line
            const uniqueHrefs = Array.from(new Set(NAV_LINKS.map((l) => l.href)));
            const matchingHrefs = [];

            for (const href of uniqueHrefs) {
                if (!href.startsWith("#")) continue;
                const el = document.getElementById(href.slice(1));
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= readingLine && rect.bottom >= readingLine) {
                        matchingHrefs.push(href);
                    }
                }
            }

            // If reading line is in a section with no navbar link (e.g. news, stats), keep previous active link.
            if (matchingHrefs.length === 0) {
                return;
            }

            let targetHref = null;
            if (matchingHrefs.length === 1) {
                targetHref = matchingHrefs[0];
            } else {
                // If several contain it, choose by priority:
                // 1. Most recently clicked while still at reading line
                // 2. Otherwise "الرئيسية" (#c-home)
                const lastClicked = lastClickedHrefRef.current;
                if (lastClicked && matchingHrefs.includes(lastClicked)) {
                    targetHref = lastClicked;
                } else if (matchingHrefs.includes("#c-home")) {
                    targetHref = "#c-home";
                } else {
                    targetHref = matchingHrefs[0];
                }
            }

            if (targetHref === "#geo") {
                // Both point to geo section: clicking "القرية" -> القرية, clicking "العزبة" -> العزبة.
                // If reached by scrolling without click, "القرية" is active.
                if (lastClickedGeoFieldRef.current === "geo-ezba") {
                    setActiveKey("العزبة");
                } else {
                    setActiveKey("القرية");
                }
            } else {
                lastClickedGeoFieldRef.current = null;
                const match = NAV_LINKS.find((l) => l.href === targetHref);
                if (match) {
                    setActiveKey(match.label);
                }
            }
        };

        const onScroll = () => {
            if (isClickScrollingRef.current) return;
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateActiveLinkFromScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Initial load with hash in URL
    useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            const match = NAV_LINKS.find((l) => l.href === hash);
            if (match) {
                lastClickedHrefRef.current = match.href;
                if (match.focus) {
                    lastClickedGeoFieldRef.current = match.focus;
                }
                window.requestAnimationFrame(() => {
                    setActiveKey(match.label);
                });
                const target = document.getElementById(hash.slice(1));
                if (target) {
                    target.scrollIntoView({ behavior: "auto", block: "start" });
                    if (match.focus) {
                        const focusEl = document.getElementById(match.focus);
                        if (focusEl) focusEl.focus({ preventScroll: true });
                    } else {
                        target.focus({ preventScroll: true });
                    }
                }
            }
        }
    }, []);

    // Horizontal navbar scroll when active link changes
    useEffect(() => {
        const activeEl = linkRefs.current.get(activeKey);
        if (activeEl) {
            const prefersReduced =
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            activeEl.scrollIntoView({
                inline: "center",
                block: "nearest",
                behavior: prefersReduced ? "auto" : "smooth",
            });
        }
    }, [activeKey]);

    const handleLinkClick = (e, link) => {
        setIsMenuOpen(false);

        if (!link.href.startsWith("#")) return;
        e.preventDefault();

        const targetId = link.href.slice(1);
        const target = document.getElementById(targetId);
        const focusElement = link.focus ? document.getElementById(link.focus) : null;

        // Immediately highlight the clicked link without flicker
        setActiveKey(link.label);
        lastClickedHrefRef.current = link.href;
        if (link.href === "#geo") {
            lastClickedGeoFieldRef.current = link.focus || "geo-village";
        } else {
            lastClickedGeoFieldRef.current = null;
        }

        window.history.replaceState(null, "", link.href);

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

        if (isAlreadyAtTarget) {
            focusTarget();
            return;
        }

        isClickScrollingRef.current = true;

        if (prefersReduced) {
            if (target) {
                target.scrollIntoView({ behavior: "auto", block: "start" });
            }
            focusTarget();
            isClickScrollingRef.current = false;
            return;
        }

        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });

            let finished = false;
            const onFinish = () => {
                if (!finished) {
                    finished = true;
                    isClickScrollingRef.current = false;
                    focusTarget();
                }
            };

            if ("onscrollend" in window) {
                const handleScrollEnd = () => {
                    window.removeEventListener("scrollend", handleScrollEnd);
                    onFinish();
                };
                window.addEventListener("scrollend", handleScrollEnd, { once: true });
                setTimeout(onFinish, 800);
            } else {
                setTimeout(onFinish, 750);
            }
        } else {
            isClickScrollingRef.current = false;
        }
    };

    const handleLogoClick = (e) => {
        if (pathname === "/" || pathname === "") {
            e.preventDefault();
            const prefersReduced =
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            window.scrollTo({
                top: 0,
                behavior: prefersReduced ? "auto" : "smooth",
            });

            window.history.replaceState(null, "", window.location.pathname);
            setActiveKey("الرئيسية");
            lastClickedHrefRef.current = "#c-home";
            lastClickedGeoFieldRef.current = null;

            if (logoRef.current) {
                logoRef.current.focus({ preventScroll: true });
            }
        }
    };

    return (
        <header
            dir="rtl"
            className="sticky top-0 z-50 border-b border-line bg-white/90 shadow-sm backdrop-blur"
        >
            <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-y-2 px-5 py-3 max-[991px]:flex-wrap max-[479px]:py-2">
                <Link
                    ref={logoRef}
                    href="/"
                    onClick={handleLogoClick}
                    className="flex min-w-0 items-center gap-3 max-[991px]:flex-1 cursor-pointer focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-gold focus-visible:outline-offset-[3px]"
                    aria-label="العودة إلى أعلى الصفحة"
                >
                    <Image
                        src="/logo.png"
                        alt="شعار حزب الجبهة الوطنية"
                        width={2172}
                        height={724}
                        loading="eager"
                        className="h-auto w-[150px] shrink-0 object-contain min-[480px]:w-[180px] min-[992px]:w-[186px]"
                    />
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
                <div className="mx-auto max-w-[1320px] px-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <NavigationLinks
                        activeKey={activeKey}
                        onLinkClick={handleLinkClick}
                        linkRefs={linkRefs}
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
                    className={`max-h-[calc(100dvh-6rem)] overflow-y-auto border-t border-line bg-white/95 shadow-card backdrop-blur transition-[opacity,transform] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isMenuOpen
                            ? "duration-300 translate-x-0 opacity-100"
                            : "pointer-events-none duration-500 translate-x-4 opacity-0"
                    }`}
                >
                    <nav aria-label="القائمة الرئيسية">
                        <div className="mx-auto max-w-[1320px] px-5 py-2">
                            <NavigationLinks
                                activeKey={activeKey}
                                onLinkClick={handleLinkClick}
                                linkRefs={linkRefs}
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
