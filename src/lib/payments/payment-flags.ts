export const IS_MANUAL_PAYMENT =
  (process.env.MANUAL_PAYMENT_MODE?.trim() ??
    process.env.NEXT_PUBLIC_MANUAL_PAYMENT_MODE?.trim() ??
    "1") === "1";

export const MANUAL_PAYMENT_PENDING_NOTE =
  "[PAGAMENTO PENDENTE] Cliente aguarda envio de link Stripe manual";
