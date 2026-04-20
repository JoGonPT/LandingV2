"use client";

import { useState } from "react";
import BookingForm from "./BookingForm";

interface HeroSectionProps {
    dict: {
        badge: string;
        title: string;
        subtitle: string;
        cta: string;
    };
    bookingDict: {
        title: string;
        [key: string]: unknown;
    };
    locale: string;
}

export default function HeroSection({ dict, bookingDict, locale }: HeroSectionProps) {
    const isPT = locale === "pt";
    const [formPhase, setFormPhase] = useState<"form" | "vehicles" | "payment">("form");
    const bookingOnlyMode = formPhase !== "form";
    const mainTitle = isPT 
        ? "Transfers Privados Portugal — Conforto e Pontualidade"
        : dict.title;
    const mainSubtitle = isPT 
        ? "Serviço premium de transporte privado em Portugal. Viaje com elegância e tranquilidade."
        : dict.subtitle;

    return (
        <section
            className={`relative min-h-screen bg-white overflow-hidden ${
                bookingOnlyMode ? "px-4 py-10 pt-24 lg:px-6" : "px-6 py-20 pt-32"
            }`}
        >
            <div className={`relative mx-auto w-full ${bookingOnlyMode ? "max-w-6xl" : "max-w-7xl"}`}>
                <div
                    className={`flex flex-col items-stretch ${
                        bookingOnlyMode ? "gap-0 lg:items-center" : "gap-12 lg:flex-row lg:gap-20"
                    }`}
                >
                    
                    {/* LEFT: Title Area + Booking Form */}
                    <div className={`w-full flex flex-col justify-between ${bookingOnlyMode ? "max-w-6xl lg:w-full" : "lg:w-1/2"}`}>
                        <div>
                            {/* Unified Title */}
                            {!bookingOnlyMode ? (
                            <div className="mb-8 text-center lg:text-left">
                                <h1 
                                    className="font-bold text-black tracking-tight leading-tight"
                                    style={{ fontSize: "clamp(1.5rem, 6vw, 3.2rem)" }}
                                >
                                    {mainTitle}
                                </h1>
                                <p 
                                    className="mt-4 text-gray-700 font-medium"
                                    style={{ fontSize: "clamp(1rem, 3.5vw, 1.15rem)" }}
                                >
                                    {mainSubtitle}
                                </p>
                            </div>
                            ) : null}

                            {/* Booking Form Container */}
                            <div className={`relative w-full min-h-[550px] overflow-hidden bg-white ${bookingOnlyMode ? "lg:min-h-[520px]" : "lg:min-h-[600px]"}`}>
                                <BookingForm dict={bookingDict} locale={locale} onPhaseChange={setFormPhase} />
                            </div>
                        </div>

                        {/* Trustpilot Placeholder - Balanced at the bottom */}
                        {!bookingOnlyMode ? (
                        <div className="mt-8 flex justify-center lg:justify-start">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">EXCELLENT</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="bg-[#00B67A] p-0.5">
                                            <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 20 20">
                                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                            </svg>
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[#00B67A] font-medium text-sm flex items-center gap-1">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                    Trustpilot
                                </span>
                            </div>
                        </div>
                        ) : null}
                    </div>

                    {/* RIGHT: Visual panel (no missing static asset dependency) */}
                    {!bookingOnlyMode ? (
                    <div className="hidden lg:block w-full lg:w-1/2 relative">
                        <div className="relative h-full w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-600">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_46%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.18),transparent_48%)]" />
                            <div className="absolute inset-0 flex items-end p-10">
                                <p className="text-white/90 text-xl font-semibold leading-relaxed max-w-md">
                                    {isPT
                                        ? "Viagens premium com pontualidade e conforto."
                                        : "Premium rides with punctuality and comfort."}
                                </p>
                            </div>
                        </div>
                    </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
