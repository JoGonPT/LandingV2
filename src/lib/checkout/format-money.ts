import type { BookingLocale } from "@/lib/transfercrm/types";

export function formatMoneyAmount(amount: number, currency: string, locale: BookingLocale): string {
  const tag = locale === "pt" ? "pt-PT" : "en-GB";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
