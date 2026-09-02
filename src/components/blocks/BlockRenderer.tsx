import CallToActionBlock from "@/components/blocks/CallToActionBlock";
import type { Bloco } from "@/lib/cms/blocks";

/**
 * Desenha o corpo de uma página, bloco a bloco.
 *
 * O corpo deixou de ser um texto único e passou a ser uma lista: blocos de
 * texto e chamadas para acção, na ordem em que quem escreve os pôs no painel.
 * É isso que permite um botão logo a seguir ao parágrafo que acabou de
 * explicar porque compensa, em vez de só no fim da página.
 *
 * ## Acrescentar um tipo de bloco
 *
 * Três sítios, por esta ordem: o bloco em `cms/src/blocks/`, registado na
 * coleção; a conversão em `@/lib/cms/blocks.ts`; e um caso aqui. O `switch` é
 * exaustivo — o TypeScript reclama se faltar um.
 */
export default function BlockRenderer({ blocos }: { blocos: Bloco[] }) {
    if (blocos.length === 0) return null;

    return (
        <>
            {blocos.map((bloco, i) => {
                switch (bloco.tipo) {
                    case "texto":
                        return (
                            /*
                             * O HTML vem do nosso próprio CMS, convertido lá a
                             * partir do texto rico, e só quem tem conta no
                             * painel o escreve. Não é conteúdo de terceiros
                             * nem de visitantes.
                             */
                            <div
                                key={i}
                                className="prose prose-neutral max-w-none text-gray-700
                                           prose-headings:font-medium prose-headings:text-gray-900
                                           prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                                           prose-p:leading-relaxed prose-li:marker:text-gray-400"
                                dangerouslySetInnerHTML={{ __html: bloco.html }}
                            />
                        );

                    case "cta":
                        return <CallToActionBlock key={i} bloco={bloco} />;
                }
            })}
        </>
    );
}
