import HeroSection from "@/components/HeroSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import Navbar from "@/components/Navbar";
import { getDictionary } from "@/get-dictionaries";

export function generateStaticParams() {
    return [{ locale: "pt" }, { locale: "en" }];
}

export default async function Home({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <main className="min-h-screen bg-white">
            <Navbar dict={dict.common} locale={locale} />
            <div id="booking">
                <HeroSection dict={dict.hero} bookingDict={dict.booking} locale={locale} />
            </div>
            <FAQSection dict={dict.faq} />
            <Footer dict={dict.footer} locale={locale} />
            <CookieConsent dict={dict.cookies} locale={locale} />
        </main>
    );
}
