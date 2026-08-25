/**
 * Qual formulário a página inicial mostra.
 *
 * São dois produtos comerciais diferentes, não duas variantes visuais:
 *
 * - **`quote`** (por omissão) — o `QuickQuoteForm`. O cliente pede orçamento e
 *   recebe-se um email e uma mensagem de Discord para tratar à mão. Nada é
 *   escrito no CRM.
 * - **`funnel`** — o `BookingForm`. Escolha de veículo com preço real por
 *   classe, pagamento, e reserva criada no CRM sem intervenção.
 *
 * A escolha é uma variável de ambiente e não um commit: voltar atrás é mudar
 * `BOOKING_UI_MODE` e **refazer o deploy** — não é preciso reverter código nem
 * abrir um PR. Isso importa porque isto é a porta de entrada do negócio: se o
 * funil correr mal, a alternativa é um clique em "Redeploy".
 *
 * O deploy é mesmo necessário. Um deployment já publicado guarda as variáveis
 * fixadas no momento em que foi criado — verificado na Vercel a 21 ago 2026,
 * removendo uma variável de um projeto e confirmando que a resposta não mudou.
 *
 * **O valor por omissão é `quote`**, o comportamento atual. Qualquer outro
 * valor, incluindo os antigos `way2go`/`transfercrm` que possam ter ficado
 * configurados, cai no mesmo sítio — ligar o funil tem de ser deliberado.
 */
export type BookingUiMode = "quote" | "funnel";

export function resolveBookingUiMode(raw: string | undefined): BookingUiMode {
    return raw?.trim().toLowerCase() === "funnel" ? "funnel" : "quote";
}

/**
 * Lê a configuração **no servidor**, onde o valor não fica gravado no bundle
 * que o browser descarrega.
 *
 * Aceita os dois nomes: `BOOKING_UI_MODE` é o correto, e
 * `NEXT_PUBLIC_BOOKING_UI_MODE` é aceite porque já existia configurado na
 * Vercel — órfão de um formulário removido em maio de 2026.
 */
export function getBookingUiMode(): BookingUiMode {
    return resolveBookingUiMode(
        process.env.BOOKING_UI_MODE ?? process.env.NEXT_PUBLIC_BOOKING_UI_MODE,
    );
}
