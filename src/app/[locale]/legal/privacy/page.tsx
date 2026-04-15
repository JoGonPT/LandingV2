import Link from "next/link";
import { getDictionary } from "@/get-dictionaries";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LegalSection {
    title: string;
    content: string;
    list?: string[];
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
    const privacy = dict.legal.privacy;

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
                        {privacy.sections.map((section: LegalSection, idx: number) => (
                            <section key={idx}>
                                <h2 className="text-2xl font-medium text-gray-900 mb-4">
                                    {section.title}
                                </h2>
                                <p>{section.content}</p>
                                {section.list && (
                                    <ul className="list-disc pl-6 space-y-2 mt-4">
                                        {section.list.map((item: string, i: number) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}

                        <p className="text-sm text-gray-500 mt-8">
                            {privacy.updated.replace("{date}", new Date().toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US"))}
                        </p>
                    </div>
                </div>
            </main>
            <Footer dict={dict.footer} locale={locale} />
        </>
    );
}
