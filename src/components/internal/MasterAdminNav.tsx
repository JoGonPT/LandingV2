"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação entre os painéis de administração.
 *
 * Existia um painel só, e chegava-se lá pelo login, que levava sempre ao mesmo
 * sítio. Com mais do que um, quem entrasse aterrava no crédito de parceiros sem
 * qualquer indicação de que havia outra coisa — e o painel de controlo
 * operacional era, na prática, invisível a quem não soubesse o endereço de cor.
 */
const PAGINAS = [
    { href: "/master-admin/finance/", label: "Crédito de parceiros" },
    { href: "/master-admin/settings/", label: "Controlo operacional" },
] as const;

export function MasterAdminNav() {
    const pathname = usePathname();

    // Na página de entrada não há sessão, e oferecer atalhos para páginas que
    // vão devolver ao login é ruído.
    if (pathname.startsWith("/master-admin/login")) return null;

    return (
        <nav
            aria-label="Painéis de administração"
            className="border-b border-neutral-800 bg-neutral-950"
        >
            <ul className="mx-auto flex max-w-[1200px] gap-1 px-4 md:px-8">
                {PAGINAS.map((p) => {
                    // A password é uma subpágina do controlo operacional e deve
                    // manter esse separador aceso.
                    const ativo = pathname.startsWith(p.href.replace(/\/$/, ""));
                    return (
                        <li key={p.href}>
                            <Link
                                href={p.href}
                                aria-current={ativo ? "page" : undefined}
                                className={`inline-block border-b-2 px-3 py-3 text-sm transition-colors ${
                                    ativo
                                        ? "border-white font-semibold text-white"
                                        : "border-transparent text-neutral-500 hover:text-neutral-200"
                                }`}
                            >
                                {p.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
