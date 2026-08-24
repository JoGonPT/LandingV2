import { getSetting } from "@/lib/site-settings/resolve";

/**
 * O modo de pagamento em vigor **agora**.
 *
 * `true` = a reserva nasce pendente e o link de pagamento é enviado à mão.
 * `false` = o Stripe cobra e a reserva confirma-se sozinha.
 *
 * Substitui a constante de módulo que aqui estava. Uma constante é avaliada
 * uma vez na importação, o que a tornava impossível de mudar sem um build novo
 * — e na Vercel nem sequer mudar a variável chegava, porque o deployment guarda
 * os valores de quando foi criado. Agora vem do painel, e faz efeito em segundos.
 *
 * Nunca lança: se a base de dados não responder, o resolvedor devolve o último
 * valor conhecido, e na pior das hipóteses o modo manual, que é o seguro.
 */
export async function isManualPayment(): Promise<boolean> {
  return (await getSetting("payments.stripe_automatic")) !== "on";
}

/**
 * Valor fixado no build, só para componentes de cliente.
 *
 * @deprecated Do lado do servidor usar `isManualPayment()`. No cliente, receber
 * o valor por propriedade a partir de um componente de servidor — isto aqui não
 * reflete o painel até haver um deploy novo.
 */
export const IS_MANUAL_PAYMENT =
  (process.env.MANUAL_PAYMENT_MODE?.trim() ??
    process.env.NEXT_PUBLIC_MANUAL_PAYMENT_MODE?.trim() ??
    "1") === "1";

export const MANUAL_PAYMENT_PENDING_NOTE =
  "[PAGAMENTO PENDENTE] Cliente aguarda envio de link Stripe manual";
