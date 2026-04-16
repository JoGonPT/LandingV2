"use client";

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
    const mainTitle = isPT 
        ? "Transfers Privados Portugal — Conforto e Pontualidade"
        : dict.title;
    const mainSubtitle = isPT 
        ? "Serviço premium de transporte privado em Portugal. Viaje com elegância e tranquilidade."
        : dict.subtitle;

    return (
        <section className="relative min-h-screen bg-white px-6 py-20 pt-32 overflow-hidden">
            <div className="relative max-w-7xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row items-stretch gap-12 lg:gap-20">
                    
                    {/* LEFT: Title Area + Booking Form */}
                    <div className="w-full lg:w-1/2 flex flex-col justify-between">
                        <div>
                            {/* Unified Title */}
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

                            {/* Booking Form Container */}
                            <div className="relative w-full rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[550px] lg:min-h-[600px]">
                                <BookingForm dict={bookingDict} locale={locale} />
                            </div>
                        </div>

                        {/* Trustpilot Placeholder - Balanced at the bottom */}
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
                    </div>

                    {/* RIGHT: Visual panel (no missing static asset dependency) */}
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
                </div>
            </div>
        </section>
    );
}
