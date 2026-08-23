/**
 * O que existe, o que cada coisa faz, e o que é preciso escrever para a mudar.
 *
 * Este ficheiro é a fonte de verdade sobre os interruptores. O painel é gerado a
 * partir daqui — acrescentar uma definição é acrescentar uma entrada, e não
 * mexer na interface.
 *
 * Cada entrada declara também **a consequência em linguagem natural** e **a
 * frase de confirmação**. As frases dizem o que vai acontecer, de propósito: o
 * mecanismo de segurança é obrigar a ler, e uma frase genérica como "CONFIRMAR"
 * seria executada de cor ao fim da terceira vez.
 */

export type SettingValue = string;

export interface SettingOption {
    /** Valor guardado. */
    readonly value: SettingValue;
    /** Como aparece no painel. */
    readonly label: string;
    /** O que muda no site, em linguagem natural. Mostrado antes de confirmar. */
    readonly consequence: string;
    /**
     * O que é preciso escrever à mão para chegar a este estado.
     *
     * `null` quando o estado é o seguro e não exige confirmação — voltar a
     * ligar o modo manual de pagamento, por exemplo, não põe dinheiro em risco.
     */
    readonly confirmation: string | null;
}

export interface SettingDefinition {
    readonly key: string;
    readonly label: string;
    readonly description: string;
    /** Variável de ambiente equivalente, usada como recurso quando a BD não responde. */
    readonly envVar: string;
    /** Valor quando não há nem base de dados nem ambiente. Tem de ser o seguro. */
    readonly fallback: SettingValue;
    readonly options: readonly SettingOption[];
    /** Move dinheiro ou fecha o site. Realçado no painel. */
    readonly critical: boolean;
}

export const SETTINGS: readonly SettingDefinition[] = [
    {
        key: "payments.stripe_automatic",
        label: "Pagamento automático com Stripe",
        description:
            "Quando está ligado, o cliente paga com cartão no site e a reserva confirma-se sozinha. Quando está desligado, a reserva fica pendente e o link de pagamento é enviado à mão.",
        // Nota de tradução: a variável guarda o inverso — MANUAL_PAYMENT_MODE=1
        // significa Stripe automático DESLIGADO. A conversão é feita no
        // resolvedor para que o painel fale sempre em positivo.
        envVar: "MANUAL_PAYMENT_MODE",
        fallback: "off",
        critical: true,
        options: [
            {
                value: "off",
                label: "Desligado — pagamento manual",
                consequence:
                    "As reservas passam a nascer pendentes de pagamento. Ninguém é cobrado automaticamente e o link tem de ser enviado à mão.",
                confirmation: "DESLIGAR PAGAMENTO STRIPE",
            },
            {
                value: "on",
                label: "Ligado — cobrança automática",
                consequence:
                    "O site passa a cobrar cartões de imediato. Confirme que a chave do Stripe em uso é a de produção antes de ligar.",
                confirmation: "LIGAR COBRANCA AUTOMATICA",
            },
        ],
    },
    {
        key: "site.coming_soon",
        label: 'Página "Em breve"',
        description:
            "Fecha o site público atrás de um ecrã de espera. Quem tiver a password de pré-visualização continua a ver o site normalmente.",
        envVar: "SITE_COMING_SOON",
        fallback: "off",
        critical: true,
        options: [
            {
                value: "off",
                label: "Desligada — site aberto",
                consequence: "O site fica visível para toda a gente.",
                confirmation: null,
            },
            {
                value: "on",
                label: 'Ligada — site fechado',
                consequence:
                    "O site público desaparece e passa a mostrar o ecrã de espera. Sem SITE_PREVIEW_PASSWORD definida, ninguém consegue entrar — nem o João.",
                confirmation: "FECHAR O SITE PUBLICO",
            },
        ],
    },
    {
        key: "invoicing.vendus_live",
        label: "Faturação Vendus",
        description:
            "Em modo de ensaio emite documentos falsos VENDUS-MOCK-… . Em modo real emite faturas verdadeiras, com efeitos fiscais.",
        envVar: "VENDUS_MODE",
        fallback: "mock",
        critical: true,
        options: [
            {
                value: "mock",
                label: "Ensaio — documentos falsos",
                consequence: "Nenhuma fatura verdadeira é emitida.",
                confirmation: null,
            },
            {
                value: "live",
                label: "Real — faturas verdadeiras",
                consequence:
                    "Passa a emitir faturas com validade fiscal, comunicadas à Autoridade Tributária. Anular uma fatura emitida por engano não é trivial.",
                confirmation: "EMITIR FACTURAS REAIS",
            },
        ],
    },
    {
        key: "booking.ui_mode",
        label: "Formulário da página inicial",
        description:
            "Escolhe entre o formulário de pedido de orçamento, que envia email, e o funil completo com escolha de veículo e pagamento.",
        envVar: "BOOKING_UI_MODE",
        fallback: "quote",
        critical: true,
        options: [
            {
                value: "quote",
                label: "Pedido de orçamento",
                consequence: "A página inicial pede os dados e envia um email. Nada é escrito no CRM.",
                confirmation: null,
            },
            {
                value: "funnel",
                label: "Funil completo",
                consequence:
                    "A página de entrada do negócio passa a ser um checkout. Não ligar sem uma reserva de teste feita com um cartão de teste do Stripe.",
                confirmation: "TROCAR A PAGINA INICIAL",
            },
        ],
    },
] as const;

export type SettingKey = (typeof SETTINGS)[number]["key"];

const BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));

export function getDefinition(key: string): SettingDefinition | null {
    return BY_KEY.get(key) ?? null;
}

export function getOption(key: string, value: string): SettingOption | null {
    return getDefinition(key)?.options.find((o) => o.value === value) ?? null;
}

export function isKnownValue(key: string, value: string): boolean {
    return getOption(key, value) !== null;
}

/**
 * A comparação da frase escrita.
 *
 * Tolera espaços a mais nas pontas e no meio, porque isso é ruído de escrita e
 * não intenção. **Não** tolera maiúsculas trocadas nem acentos em falta: a
 * frase está à vista, e exigir que seja igual é metade do mecanismo.
 */
export function confirmationMatches(expected: string, typed: string): boolean {
    const normalise = (s: string) => s.trim().replace(/\s+/g, " ");
    return normalise(expected) === normalise(typed);
}
