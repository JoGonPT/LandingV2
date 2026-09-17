import { getPayload } from "payload";

import config from "../../payload.config";

/**
 * Tira dos destinos a frase sobre meios de pagamento.
 *
 * Corre-se uma vez: `npm run corrigir:pagamento`.
 *
 * ## Porquê
 *
 * O texto dizia «Aceitamos numerário, cartões de débito e crédito, MB Way e
 * transferência bancária antecipada.» — e a aplicação de reservas, que passou a
 * servir estas páginas em app.vruum.pt, cobra **tudo online no momento da
 * reserva**. Está escrito nos termos dela, em `content/legal/pt.ts`.
 *
 * Não é uma redação divergente como as quatro cópias da política de
 * cancelamento. É uma promessa de meios de pagamento que não existem: quem
 * lesse a página e aparecesse com dinheiro não podia pagar.
 *
 * ## O que fica
 *
 * A segunda frase do parágrafo — «O preço fecha-se na reserva e não muda com o
 * trânsito nem com o tempo de espera.» — é verdade e é útil, e fica. Sai só a
 * enumeração dos meios.
 *
 * Com a enumeração fora, o título «Pagamento e cancelamento» deixa de descrever
 * o que está por baixo: o que resta é preço e cancelamento. Muda em
 * conformidade.
 *
 * ## Porque isto é um script e não uma edição no painel
 *
 * A frase está em quatro sítios — Porto e Guimarães, em português e em inglês —
 * e vai passar a estar em dez quando as traduções entrarem. Corrigir à mão é
 * como se perde um deles.
 */

/** As substituições, por idioma. A chave é o texto a encontrar. */
const SUBSTITUICOES: Record<string, Array<{ de: string; para: string }>> = {
    pt: [
        {
            de: "Aceitamos numerário, cartões de débito e crédito, MB Way e transferência bancária antecipada. ",
            para: "",
        },
        { de: "Pagamento e cancelamento", para: "Preço e cancelamento" },
    ],
    en: [
        {
            de: "We accept cash, debit and credit cards, MB Way and advance bank transfer. ",
            para: "",
        },
        { de: "Payment and cancellation", para: "Price and cancellation" },
    ],
};

const IDIOMAS = Object.keys(SUBSTITUICOES);

/**
 * Percorre a árvore do Lexical e aplica as substituições aos nós de texto.
 *
 * Devolve a árvore nova e quantas substituições fez. Não altera a original: uma
 * função que muda o que recebe torna impossível comparar antes e depois.
 */
function aplicar(no: unknown, regras: Array<{ de: string; para: string }>): [unknown, number] {
    if (Array.isArray(no)) {
        let total = 0;
        const saida = no.map((x) => {
            const [novo, n] = aplicar(x, regras);
            total += n;
            return novo;
        });
        return [saida, total];
    }

    if (!no || typeof no !== "object") return [no, 0];

    const o = no as Record<string, unknown>;
    let total = 0;
    const saida: Record<string, unknown> = {};

    for (const [chave, valor] of Object.entries(o)) {
        if (chave === "text" && typeof valor === "string") {
            let texto = valor;
            for (const r of regras) {
                if (texto.includes(r.de)) {
                    texto = texto.split(r.de).join(r.para);
                    total += 1;
                }
            }
            saida[chave] = texto;
            continue;
        }
        const [novo, n] = aplicar(valor, regras);
        saida[chave] = novo;
        total += n;
    }

    return [saida, total];
}

/*
 * Sem `main()`: o `payload run` carrega o módulo e sai. Uma promessa devolvida
 * por uma função chamada no fim do ficheiro nunca chega a ser esperada, e o
 * processo termina com código 0 sem ter feito nada — foi o que aconteceu à
 * primeira. O `exemplo-porto.ts` usa `await` de topo, e é essa a convenção.
 */
const payload = await getPayload({ config });

for (const locale of IDIOMAS) {
    const regras = SUBSTITUICOES[locale];

    const { docs } = await payload.find({
        collection: "destinations",
        locale: locale as "pt",
        limit: 100,
        depth: 0,
        // Sem isto vem a versão publicada e perdia-se qualquer rascunho por cima.
        draft: true,
    });

    for (const doc of docs) {
        const [corpo, mudancas] = aplicar(doc.body, regras);

        if (mudancas === 0) {
            console.log(`  ${locale}/${doc.slug}: nada a mudar`);
            continue;
        }

        await payload.update({
            collection: "destinations",
            id: doc.id,
            locale: locale as "pt",
            data: {
                body: corpo as never,
                // Com rascunhos ligados, uma atualização sem isto fica por publicar —
                // e a correção não chegava a quem lê.
                _status: "published",
            },
        });

        console.log(`  ${locale}/${doc.slug}: ${mudancas} substituição(ões), publicado`);
    }
}

console.log("Feito.");
process.exit(0);
