import ComingSoon from "@/components/ComingSoon";
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

    return <ComingSoon dict={dict.comingSoon} locale={locale} />;
}
