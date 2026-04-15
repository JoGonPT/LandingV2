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
    };
    locale: string;
}

export default function Footer({ dict, locale }: FooterProps) {
    return (
        <footer className="bg-white border-t border-gray-100 text-black py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href={`/${locale}`} className="flex items-center space-x-2 mb-6">
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">W</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Way2Go</span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                            {dict.aboutText}
                        </p>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-6">{dict.contacts}</h3>
                        <div className="space-y-4 text-sm text-gray-600">
                            <p className="flex flex-col">
                                <span className="text-gray-400 text-xs">Email</span>
                                <span className="font-medium text-black">info@way2go.pt</span>
                            </p>
                            <p className="flex flex-col">
                                <span className="text-gray-400 text-xs">WhatsApp / Phone</span>
                                <span className="font-medium text-black">+351 XXX XXX XXX</span>
                            </p>
                        </div>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-6">{dict.legal}</h3>
                        <div className="space-y-3">
                            <Link href={`/${locale}/legal/privacy`} className="block text-sm text-gray-600 hover:text-black transition-colors">{dict.privacy}</Link>
                            <Link href={`/${locale}/legal/terms`} className="block text-sm text-gray-600 hover:text-black transition-colors">{dict.terms}</Link>
                            <Link href={`/${locale}/legal/cookies`} className="block text-sm text-gray-600 hover:text-black transition-colors">{dict.cookies}</Link>
                        </div>
                    </div>

                    {/* Quick navigation or social */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Explore</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <p className="cursor-pointer hover:text-black transition-colors">Airport Transfers</p>
                            <p className="cursor-pointer hover:text-black transition-colors">By the Hour</p>
                            <p className="cursor-pointer hover:text-black transition-colors">Company</p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-100 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-xs">
                    <p>© {new Date().getFullYear()} Way2Go. Reservados todos os direitos.</p>
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
