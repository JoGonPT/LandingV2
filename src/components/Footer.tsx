import Link from "next/link";

interface FooterProps {
    dict: {
        contacts: string;
        legal: string;
        privacy: string;
        terms: string;
        cookies: string;
        about: string;
        aboutText: string;
        explore: string;
        airportTransfers: string;
        byTheHour: string;
        copyright: string;
    };
    locale: string;
}

const WHATSAPP_NUMBER = "351913281953";
const WHATSAPP_HREF   = `https://wa.me/${WHATSAPP_NUMBER}`;
/**
 * O endereço mostrado e o endereço de entrega são distintos **de propósito**,
 * e provisoriamente.
 *
 * A marca que o cliente vê é Way2Go. Mas a caixa `reservas@way2go.pt` ainda não
 * existe, e apontar o `mailto:` para uma caixa inexistente faz o email do
 * cliente ser devolvido — quem recebe um bounce raramente tenta outra via.
 * Até a caixa estar ativa, o link entrega em `reservas@vruum.pt`, que existe.
 *
 * Contrapartida assumida: o cliente que clicar vê `reservas@vruum.pt` no
 * destinatário do seu programa de email. É uma inconsistência de marca visível,
 * mas preferível a perder a mensagem.
 *
 * ➡️ Quando `reservas@way2go.pt` existir (caixa ou alias), apagar
 * `EMAIL_DELIVERY` e deixar o `mailto:` usar o `EMAIL_DISPLAY`.
 * O formulário do site não é afetado: entrega via `LEADS_INTERNAL_EMAIL`,
 * em `api/send-budget`. Ver F2-1 em docs/TODO.md.
 */
const EMAIL_DISPLAY   = "reservas@way2go.pt";
const EMAIL_DELIVERY  = "reservas@vruum.pt";

export default function Footer({ dict, locale }: FooterProps) {
    const year      = new Date().getFullYear();
    const copyright = dict.copyright.replace("{year}", String(year));

    return (
        <footer className="border-t border-gray-100 bg-white px-6 py-20 text-black">
            <div className="mx-auto max-w-7xl">
                <div className="mb-16 grid gap-12 md:grid-cols-4">

                    {/* ── Marca ───────────────────────────────────────────── */}
                    <div className="md:col-span-1">
                        <Link
                            href={`/${locale}`}
                            className="mb-6 flex items-center space-x-2"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
                                <span className="text-lg font-bold text-white">W</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Way2Go</span>
                        </Link>
                        <p className="max-w-xs text-sm leading-relaxed text-gray-500">
                            {dict.aboutText}
                        </p>
                    </div>

                    {/* ── Contactos ────────────────────────────────────────── */}
                    <div>
                        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest">
                            {dict.contacts}
                        </h3>
                        <div className="space-y-4 text-sm">
                            {/* Email */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400">Email</span>
                                <a
                                    href={`mailto:${EMAIL_DELIVERY}`}
                                    className="font-medium text-black transition-colors hover:text-gray-600"
                                >
                                    {EMAIL_DISPLAY}
                                </a>
                            </div>
                            {/* WhatsApp */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400">WhatsApp</span>
                                <a
                                    href={WHATSAPP_HREF}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-black transition-colors hover:text-gray-600"
                                >
                                    +351 913 281 953
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* ── Informação Legal ─────────────────────────────────── */}
                    <div>
                        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest">
                            {dict.legal}
                        </h3>
                        <div className="space-y-3">
                            <Link
                                href={`/${locale}/legal/privacy`}
                                className="block text-sm text-gray-600 transition-colors hover:text-black"
                            >
                                {dict.privacy}
                            </Link>
                            <Link
                                href={`/${locale}/legal/terms`}
                                className="block text-sm text-gray-600 transition-colors hover:text-black"
                            >
                                {dict.terms}
                            </Link>
                            <Link
                                href={`/${locale}/legal/cookies`}
                                className="block text-sm text-gray-600 transition-colors hover:text-black"
                            >
                                {dict.cookies}
                            </Link>
                        </div>
                    </div>

                    {/* ── Explore ──────────────────────────────────────────── */}
                    <div>
                        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest">
                            {dict.explore}
                        </h3>
                        <div className="space-y-3">
                            <a
                                href={`/${locale}#booking`}
                                className="block text-sm text-gray-600 transition-colors hover:text-black"
                            >
                                {dict.airportTransfers}
                            </a>
                            <a
                                href={`/${locale}#booking`}
                                className="block text-sm text-gray-600 transition-colors hover:text-black"
                            >
                                {dict.byTheHour}
                            </a>
                        </div>
                    </div>

                </div>

                {/* ── Copyright ────────────────────────────────────────────── */}
                <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-10 text-xs text-gray-400 md:flex-row">
                    <p>{copyright}</p>
                    <div className="flex gap-6">
                        <span>LinkedIn</span>
                        <span>Instagram</span>
                        <span>Facebook</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
