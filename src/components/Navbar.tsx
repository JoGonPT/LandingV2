"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

interface NavbarProps {
    dict: {
        reserve: string;
        faq: string;
        privacy: string;
        contact: string;
    };
    locale: string;
}

export default function Navbar({ dict, locale }: NavbarProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [langMenuOpen, setLangMenuOpen] = useState(false);
    const pathname = usePathname();

    const scrollToSection = (sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
            setMobileMenuOpen(false);
        }
    };

    const redirectedPathname = (targetLocale: string) => {
        if (!pathname) return "/";
        const segments = pathname.split("/");
        segments[1] = targetLocale;
        return segments.join("/");
    };

    return (
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href={`/${locale}`} className="flex items-center space-x-2 group">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center transition-all duration-300">
                            <span className="text-white font-bold text-lg">W</span>
                        </div>
                        <span className="text-xl font-bold text-black tracking-tight">
                            Way2Go
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        <button
                            onClick={() => scrollToSection("booking")}
                            className="text-gray-600 hover:text-black transition-colors font-medium"
                        >
                            {dict.reserve}
                        </button>
                        <button
                            onClick={() => scrollToSection("faq")}
                            className="text-gray-600 hover:text-black transition-colors font-medium"
                        >
                            {dict.faq}
                        </button>
                        <Link
                            href={`/${locale}/legal/privacy`}
                            className="text-gray-600 hover:text-black transition-colors font-medium"
                        >
                            {dict.privacy}
                        </Link>

                        {/* Language Switcher */}
                        <div className="relative">
                            <button
                                onClick={() => setLangMenuOpen(!langMenuOpen)}
                                className="flex items-center space-x-1 text-gray-500 hover:text-black transition-colors font-medium uppercase text-sm border border-gray-200 px-2 py-1 rounded"
                            >
                                <span>{locale}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {langMenuOpen && (
                                <div className="absolute right-0 mt-2 w-24 bg-white border border-gray-100 rounded-lg shadow-xl py-2">
                                    <Link
                                        href={redirectedPathname("pt")}
                                        onClick={() => setLangMenuOpen(false)}
                                        className={`block px-4 py-2 text-sm transition-colors ${locale === "pt" ? "text-black font-bold bg-gray-50" : "text-gray-600 hover:bg-gray-50 hover:text-black"}`}
                                    >
                                        PT
                                    </Link>
                                    <Link
                                        href={redirectedPathname("en")}
                                        onClick={() => setLangMenuOpen(false)}
                                        className={`block px-4 py-2 text-sm transition-colors ${locale === "en" ? "text-black font-bold bg-gray-50" : "text-gray-600 hover:bg-gray-50 hover:text-black"}`}
                                    >
                                        EN
                                    </Link>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => scrollToSection("booking")}
                            className="px-6 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-300"
                        >
                            {dict.contact}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center space-x-4 md:hidden">
                        <Link
                            href={redirectedPathname(locale === "pt" ? "en" : "pt")}
                            className="text-gray-500 font-medium uppercase text-sm border border-gray-200 px-2 py-1 rounded"
                        >
                            {locale === "pt" ? "EN" : "PT"}
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-black"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
                        <button onClick={() => scrollToSection("booking")} className="block w-full text-left px-4 py-2 text-gray-600 font-medium">{dict.reserve}</button>
                        <button onClick={() => scrollToSection("faq")} className="block w-full text-left px-4 py-2 text-gray-600 font-medium">{dict.faq}</button>
                        <Link href={`/${locale}/legal/privacy`} className="block px-4 py-2 text-gray-600 font-medium">{dict.privacy}</Link>
                        <button onClick={() => scrollToSection("booking")} className="block w-full px-4 py-2.5 bg-black text-white font-semibold rounded-lg text-center">{dict.contact}</button>
                    </div>
                )}
            </div>
        </nav>
    );
}
