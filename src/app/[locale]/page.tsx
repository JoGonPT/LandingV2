import HeroSection from "@/components/HeroSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import DestinationsSection from "@/components/destinations/DestinationsSection";
import Navbar from "@/components/Navbar";
import { getDictionary } from "@/get-dictionaries";
import { getBookingUiMode } from "@/lib/booking/ui-mode";
import { listarDestinos } from "@/lib/cms/destinations";

export function generateStaticParams() {
    return [{ locale: "pt" }, { locale: "en" }];
}

export default async function Home({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // Em paralelo: os textos vêm de ficheiro e os destinos do CMS, e não há
    // razão para o segundo esperar pelo primeiro. `listarDestinos` nunca lança
    // — em caso de falha devolve lista vazia e a secção não aparece.
    const [dict, destinos] = await Promise.all([
        getDictionary(locale),
        listarDestinos(locale),
    ]);

    return (
        <main className="min-h-screen bg-white">
            <Navbar dict={dict.common} locale={locale} />
            <div id="booking">
                <HeroSection
                    dict={dict.hero}
                    bookingDict={dict.booking}
                    bookingUiMode={getBookingUiMode()}
                    locale={locale}
                />
            </div>
            <DestinationsSection destinos={destinos} locale={locale} />
            <FAQSection dict={dict.faq} />
            <Footer dict={dict.footer} locale={locale} />
            <CookieConsent dict={dict.cookies} locale={locale} />
        </main>
    );
}
