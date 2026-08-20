import Link from "next/link";
import { getDictionary } from "@/get-dictionaries";
import { legalMetadata } from "@/lib/legal-metadata";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LegalSubsection {
    title: string;
    list?: string[];
    legalBasis?: string;
}

interface LegalSection {
    title: string;
    content?: string;
    list?: string[];
    subsections?: LegalSubsection[];
    footer?: string;
}

interface PrivacyDict {
    title: string;
    updated: string;
    intro?: string[];
    sections: LegalSection[];
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    return legalMetadata("privacy", locale);
}

export function generateStaticParams() {
    return [{ locale: "pt" }, { locale: "en" }];
}

export default async function PrivacyPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    const privacy = dict.legal.privacy as PrivacyDict;

    return (
        <>
            <Navbar dict={dict.common} locale={locale} />
            <main className="min-h-screen bg-white py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href={`/${locale}`}
                        className="inline-block mb-8 text-gray-600 hover:text-black transition-colors font-medium border-b border-black/10"
                    >
                        {dict.common.back}
                    </Link>

                    <h1 className="text-4xl md:text-5xl font-bold text-black mb-8 tracking-tight">
                        {privacy.title}
                    </h1>

                    <div className="prose prose-neutral max-w-none space-y-8 text-gray-700">

                        {/* Parágrafos introdutórios */}
                        {privacy.intro && (
                            <div className="space-y-4">
                                {privacy.intro.map((p: string, i: number) => (
                                    <p key={i} className="leading-relaxed">{p}</p>
                                ))}
                            </div>
                        )}

                        {/* Secções principais */}
                        {privacy.sections.map((section: LegalSection, idx: number) => (
                            <section key={idx}>
                                <h2 className="text-2xl font-medium text-gray-900 mb-4">
                                    {section.title}
                                </h2>

                                {section.content && (
                                    <p className="mb-3">{section.content}</p>
                                )}

                                {section.list && (
                                    <ul className="list-disc pl-6 space-y-2 mt-2 mb-3">
                                        {section.list.map((item: string, i: number) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                )}

                                {/* Sub-secções (ex.: A, B, C em Finalidades) */}
                                {section.subsections && (
                                    <div className="space-y-6 mt-4">
                                        {section.subsections.map((sub: LegalSubsection, si: number) => (
                                            <div key={si} className="pl-4 border-l-2 border-neutral-200">
                                                <h3 className="text-lg font-medium text-gray-800 mb-3">
                                                    {sub.title}
                                                </h3>
                                                {sub.list && (
                                                    <ul className="list-disc pl-6 space-y-2 mb-3">
                                                        {sub.list.map((item: string, i: number) => (
                                                            <li key={i}>{item}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {sub.legalBasis && (
                                                    <p className="text-sm text-gray-600 italic mt-2">
                                                        {sub.legalBasis}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Texto de rodapé da secção (ex.: como exercer direitos) */}
                                {section.footer && (
                                    <p className="mt-4">{section.footer}</p>
                                )}
                            </section>
                        ))}

                        <p className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
                            {privacy.updated}
                        </p>
                    </div>
                </div>
            </main>
            <Footer dict={dict.footer} locale={locale} />
        </>
    );
}
