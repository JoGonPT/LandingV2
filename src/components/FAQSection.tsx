"use client";

import { useState } from "react";

interface FAQSectionProps {
    dict: {
        title: string;
        items: Array<{
            question: string;
            answer: string;
        }>;
    };
}

export default function FAQSection({ dict }: FAQSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="py-24 px-6 bg-white">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-4xl font-bold text-black text-center mb-16 tracking-tight">
                    {dict.title}
                </h2>
                <div className="space-y-4">
                    {dict.items.map((faq, index) => (
                        <div
                            key={index}
                            className="border-b border-gray-100 transition-colors"
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full py-6 text-left flex justify-between items-center hover:text-black transition-colors group"
                            >
                                <h3 className="text-xl font-medium text-gray-900 group-hover:text-black">
                                    {faq.question}
                                </h3>
                                <svg
                                    className={`w-5 h-5 text-gray-400 group-hover:text-black transition-transform ${openIndex === index ? "rotate-180" : ""
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>
                            {openIndex === index && (
                                <div className="pb-8 overflow-hidden animate-fadeIn">
                                    <p className="text-gray-500 leading-relaxed text-lg">
                                        {faq.answer}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
