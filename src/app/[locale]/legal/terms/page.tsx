import Link from "next/link";
import { getDictionary } from "@/get-dictionaries";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface TermsSubsection {
    title: string;
    content?: string;
    list?: string[];
}

interface TermsSection {
    title: string;
    content?: string;
    list?: string[];
    subsections?: TermsSubsection[];
    afterList?: string[];
}

interface TermsPart {
    title: string;
    sections: TermsSection[];
}

interface TermsDict {
    title: string;
    updated: string;
    intro?: string[];
    parts: TermsPart[];
}

export function generateStaticParams() {
    return [{ locale: "pt" }, { locale: "en" }];
}

export default async function TermsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    const terms = dict.legal.terms as TermsDict;

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
                        {terms.title}
                    </h1>

                    <div className="prose prose-neutral max-w-none space-y-8 text-gray-700">

                        {terms.intro && (
                            <div className="space-y-4">
                                {terms.intro.map((p: string, i: number) => (
                                    <p key={i} className="leading-relaxed">{p}</p>
                                ))}
                            </div>
                        )}

                        {terms.parts.map((part: TermsPart, pi: number) => (
                            <div key={pi} className="space-y-6">
                                <h2 className="text-2xl font-bold text-black pt-6 border-t border-gray-200">
                                    {part.title}
                                </h2>

                                {part.sections.map((section: TermsSection, si: number) => (
                                    <section key={si}>
                                        <h3 className="text-xl font-medium text-gray-900 mb-3">
                                            {section.title}
                                        </h3>

                                        {section.content && (
                                            <p className="mb-3">{section.content}</p>
                                        )}

                                        {section.list && (
                                            <ul className="list-disc pl-6 space-y-2 mb-3">
                                                {section.list.map((item: string, i: number) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        )}

                                        {section.subsections && (
                                            <div className="space-y-4 mt-3">
                                                {section.subsections.map((sub: TermsSubsection, ssi: number) => (
                                                    <div key={ssi} className="pl-4 border-l-2 border-neutral-200">
                                                        <h4 className="text-base font-medium text-gray-800 mb-2">
                                                            {sub.title}
                                                        </h4>
                                                        {sub.content && (
                                                            <p className="mb-2">{sub.content}</p>
                                                        )}
                                                        {sub.list && (
                                                            <ul className="list-disc pl-6 space-y-1">
                                                                {sub.list.map((item: string, i: number) => (
                                                                    <li key={i}>{item}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {section.afterList && (
                                            <div className="space-y-3 mt-3">
                                                {section.afterList.map((p: string, i: number) => (
                                                    <p key={i}>{p}</p>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                ))}
                            </div>
                        ))}

                        <p className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
                            {terms.updated}
                        </p>
                    </div>
                </div>
            </main>
            <Footer dict={dict.footer} locale={locale} />
        </>
    );
}
