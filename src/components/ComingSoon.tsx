"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface ComingSoonDict {
    tagline: string;
    headline: string;
    subheadline: string;
    description: string;
    notifyLabel: string;
    notifyPlaceholder: string;
    notifyButton: string;
    notifySuccess: string;
    copyright: string;
}

interface Props {
    dict: ComingSoonDict;
    locale: string;
}

export default function ComingSoon({ dict, locale }: Props) {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((d) => (d.length >= 3 ? "" : d + "."));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const otherLocale = locale === "pt" ? "en" : "pt";
    const otherLocaleLabel = locale === "pt" ? "EN" : "PT";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (email) setSubmitted(true);
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-neutral-950 text-white">
            {/* Background image with overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/hero-main.webp"
                    alt="Way2Go"
                    fill
                    className="object-cover opacity-20"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/60 via-neutral-950/80 to-neutral-950" />
            </div>

            {/* Language toggle */}
            <div className="absolute top-6 right-6 z-10">
                <Link
                    href={`/${otherLocale}`}
                    className="text-sm font-semibold tracking-widest text-neutral-400 hover:text-white transition-colors border border-neutral-700 hover:border-neutral-400 px-3 py-1.5 rounded-full"
                >
                    {otherLocaleLabel}
                </Link>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
                {/* Logo */}
                <div className="mb-10">
                    <span className="text-4xl font-black tracking-tight text-white">
                        Way<span className="text-amber-400">2</span>Go
                    </span>
                </div>

                {/* Tagline */}
                <p className="text-xs font-semibold tracking-[0.3em] text-amber-400 uppercase mb-4">
                    {dict.tagline}
                </p>

                {/* Headline */}
                <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-none mb-4">
                    {dict.headline}
                    <span className="text-amber-400 inline-block w-8 text-left">{dots}</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl font-medium text-neutral-300 mb-4">
                    {dict.subheadline}
                </p>

                {/* Description */}
                <p className="text-sm text-neutral-500 leading-relaxed mb-10 max-w-md">
                    {dict.description}
                </p>

                {/* Notify form */}
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={dict.notifyPlaceholder}
                            className="flex-1 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 text-sm rounded-full px-5 py-3 focus:outline-none focus:border-amber-400 transition-colors"
                        />
                        <button
                            type="submit"
                            className="bg-amber-400 hover:bg-amber-300 text-neutral-950 text-sm font-bold rounded-full px-6 py-3 transition-colors whitespace-nowrap"
                        >
                            {dict.notifyButton}
                        </button>
                    </form>
                ) : (
                    <p className="text-amber-400 font-semibold text-sm">{dict.notifySuccess}</p>
                )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 z-10 text-center">
                <p className="text-xs text-neutral-700">
                    {dict.copyright.replace("{year}", String(new Date().getFullYear()))}
                </p>
            </div>
        </div>
    );
}
