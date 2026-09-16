import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

/**
 * Avisa a aplicação de reservas de que o conteúdo mudou.
 *
 * ## Porque é preciso
 *
 * A app guarda o que lê daqui: em memória na função, e na CDN da Vercel com
 * `s-maxage=3600`. Sem aviso, uma correção feita no painel demora **até uma
 * hora** a aparecer em app.vruum.pt — e quem a fez fica a olhar para o texto
 * antigo sem perceber porquê.
 *
 * ## Isto NUNCA pode impedir uma gravação
 *
 * O painel é de quem escreve. Se a app estiver em baixo, se a rede falhar, se o
 * segredo estiver errado — o autor tem de conseguir gravar na mesma. Um hook que
 * lança transforma uma indisponibilidade da app numa impossibilidade de
 * trabalhar no CMS, o que é trocar um problema pequeno por um grande.
 *
 * Por isso: apanha-se tudo, regista-se, e segue. O pior que acontece sem isto é
 * o atraso de uma hora que já existia.
 *
 * ## O tempo limite é curto de propósito
 *
 * Isto corre dentro do pedido de gravação, com o autor à espera do botão. Um
 * segundo e meio é o que se pode gastar sem que a gravação pareça lenta. A
 * revalidação não é crítica: falhar significa esperar pelo `s-maxage`.
 *
 * ## O segredo
 *
 * `APP_REVALIDATE_SECRET`, partilhado com a app. Sem ele o hook não faz nada e
 * não se queixa a cada gravação — não estar configurado é um estado legítimo,
 * por exemplo em desenvolvimento.
 */

const TEMPO_LIMITE_MS = 1500;

async function avisar(motivo: string): Promise<void> {
    const url = process.env.APP_REVALIDATE_URL?.trim();
    const segredo = process.env.APP_REVALIDATE_SECRET?.trim();

    // Não configurado é um estado legítimo. Silêncio, não aviso a cada gravação.
    if (!url || !segredo) return;

    // Aborta por tempo em vez de deixar a gravação pendurada à espera da rede.
    const relogio = new AbortController();
    const temporizador = setTimeout(() => relogio.abort(), TEMPO_LIMITE_MS);

    try {
        const resposta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-cms-secret": segredo },
            body: JSON.stringify({ reason: motivo }),
            signal: relogio.signal,
        });

        if (!resposta.ok) {
            // O segredo NUNCA entra no registo. Um segredo em log é um segredo perdido.
            console.warn(`[revalidar] ${motivo}: a app respondeu ${resposta.status}`);
        }
    } catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : String(erro);
        console.warn(`[revalidar] ${motivo}: não foi possível avisar a app (${detalhe})`);
    } finally {
        clearTimeout(temporizador);
    }
}

/** Para pôr em `hooks.afterChange` de uma coleção. */
export const revalidarAppAoMudar: CollectionAfterChangeHook = async ({ doc, collection }) => {
    await avisar(`${collection.slug}/${(doc as { slug?: string }).slug ?? doc.id}`);
    return doc;
};

/**
 * Para pôr em `hooks.afterDelete`.
 *
 * Apagar é o caso em que o aviso mais importa: sem ele, a app continua a servir
 * durante uma hora uma página que já não existe.
 */
export const revalidarAppAoApagar: CollectionAfterDeleteHook = async ({ doc, collection }) => {
    await avisar(`${collection.slug}/${(doc as { slug?: string }).slug ?? doc.id} (apagado)`);
    return doc;
};
