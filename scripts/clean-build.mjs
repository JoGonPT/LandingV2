/**
 * Apaga `.next` antes de uma build de produção.
 *
 * **Porque é que uma limpeza parcial não chega.**
 * O Next não remove artefactos de rotas que deixaram de existir. Quando uma
 * página é apagada do código, o HTML pré-renderizado da build anterior
 * sobrevive em `.next/` (cache incremental), é copiado para `.next/standalone`
 * e continua a ser servido com `x-nextjs-cache: HIT`. Uma página apagada
 * permanece viva em produção, e os manifests da build já nem a conhecem —
 * pelo que nada denuncia o problema.
 *
 * Observado ao remover `src/app/apitest/`: os manifests estavam corretos, mas
 * `/apitest/` respondia 200 com conteúdo pré-renderizado. Limpar apenas
 * `.next/standalone` não resolveu — o `next build` seguinte voltava a repô-lo
 * a partir da cache. Só a remoção de `.next` inteiro elimina a rota.
 * Ver F0-6 em docs/TODO.md.
 *
 * Custo: perde-se a cache incremental, logo a build é mais lenta. É o
 * comportamento certo para deploy — em CI parte-se sempre de um estado limpo.
 * Para desenvolvimento use `npm run dev` ou `npm run build`, que a mantêm.
 */
import { rm, access } from "node:fs/promises";

const target = ".next";

try {
    await access(target);
} catch {
    console.log(`[clean-build] ${target} não existe — nada a limpar.`);
    process.exit(0);
}

function fail(detalhe) {
    console.error(
        `[clean-build] FALHOU: não consegui remover ${target}.\n` +
            `  ${detalhe}\n` +
            "  Causa habitual: um servidor standalone ainda a correr sobre o bundle.\n" +
            "  Pára-o e tenta de novo — continuar daqui produziria um bundle com rotas obsoletas.",
    );
    process.exit(1);
}

// No Windows, `rm` lança EBUSY se algum processo tiver handles abertos sobre a
// pasta. Melhor falhar aqui, alto e claro, do que construir sobre restos.
try {
    await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
} catch (erro) {
    fail(String(erro?.message ?? erro));
}

// `force: true` engole alguns erros em silêncio — confirmar que desapareceu mesmo.
try {
    await access(target);
    fail(`${target} ainda existe depois da remoção.`);
} catch {
    console.log(`[clean-build] ${target} limpo.`);
}
