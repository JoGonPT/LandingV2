import type { PublicQuoteResponse } from "@/lib/booking/quote-public";
import type { BookingLocale } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { inferVehicleBrandLane } from "@/lib/booking/vehicle-brand";
import type { TransferCrmVehicleOption } from "@/lib/transfercrm/types";

type Phase = "form" | "vehicles" | "payment";

export interface BookingStickySummaryLabels {
  title: string;
  route: string;
  when: string;
  vehicle: string;
  extras: string;
  childSeat: string;
  luggage: string;
  seats: string;
  total: string;
  updating: string;
  pendingPrice: string;
  none: string;
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function brandTitle(lane: ReturnType<typeof inferVehicleBrandLane>, v: BookingStickySummaryLabels & Record<string, string>): string {
  if (lane === "van") return v.businessVan ?? "Business Van";
  if (lane === "first") return v.firstClass ?? "First Class";
  return v.businessClass ?? "Business Class";
}

export function BookingStickySummary({
  variant,
  phase,
  pickup,
  dropoff,
  date,
  time,
  selectedVehicleType,
  vehicleOptions,
  childSeat,
  luggage,
  debouncedQuote,
  quoteLoading,
  paymentQuote,
  paymentCurrency,
  labels,
  locale,
}: {
  variant: "desktop" | "mobile";
  phase: Phase;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  selectedVehicleType: string;
  vehicleOptions: TransferCrmVehicleOption[];
  childSeat: boolean;
  luggage: number;
  debouncedQuote: PublicQuoteResponse | null;
  quoteLoading: boolean;
  paymentQuote: QuoteResponse | null;
  paymentCurrency: string;
  labels: BookingStickySummaryLabels & Record<string, string>;
  locale: BookingLocale;
}) {
  const lane = selectedVehicleType ? inferVehicleBrandLane(selectedVehicleType) : inferVehicleBrandLane("");
  const selectedOpt = vehicleOptions.find((v) => v.vehicleType === selectedVehicleType);

  let priceLabel: string | null = null;
  if (phase === "payment" && paymentQuote?.price != null && paymentCurrency) {
    priceLabel = formatMoneyAmount(Number(paymentQuote.price), paymentCurrency, locale);
  } else if (phase === "vehicles" && selectedOpt) {
    if (debouncedQuote?.price != null && debouncedQuote.currency) {
      priceLabel = formatMoneyAmount(Number(debouncedQuote.price), debouncedQuote.currency, locale);
    } else {
      priceLabel = formatMoneyAmount(selectedOpt.estimatedPrice, selectedOpt.currency, locale);
    }
  }

  const seatLabel = selectedOpt?.seatsAvailable
    ? (labels.seats || "{n} seats").replace(/\{n\}/g, String(selectedOpt.seatsAvailable))
    : null;

  const extras: string[] = [];
  if (childSeat) extras.push(labels.childSeat);
  if (luggage > 0) extras.push((labels.luggage || "{n} bags").replace(/\{n\}/g, String(luggage)));
  const extrasLine = extras.length ? extras.join(" · ") : labels.none;

  const wrap =
    variant === "desktop"
      ? "rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
      : "border-t border-black bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]";

  return (
    <aside className={wrap} aria-live="polite">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{labels.title}</p>
      <div className="mt-4 space-y-3 text-sm text-neutral-800">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">{labels.route}</p>
          <p className="mt-1 font-medium leading-snug">{truncate(pickup || "—", 42)}</p>
          <p className="text-neutral-500">→ {truncate(dropoff || "—", 42)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">{labels.when}</p>
          <p className="mt-1 tabular-nums">
            {date && time ? `${date} · ${time}` : "—"}
          </p>
        </div>
        {(phase === "vehicles" || phase === "payment") && selectedVehicleType ? (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">{labels.vehicle}</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-black">{brandTitle(lane, labels)}</p>
            <p className="text-xs text-neutral-500 capitalize">{selectedVehicleType.replace(/_/g, " ")}</p>
            {seatLabel ? <p className="mt-1 text-xs text-neutral-600">{seatLabel}</p> : null}
          </div>
        ) : null}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400">{labels.extras}</p>
          <p className="mt-1 text-neutral-700">{extrasLine}</p>
        </div>
      </div>

      <div className={`mt-6 flex items-end justify-between gap-4 ${variant === "mobile" ? "pt-1" : "border-t border-neutral-100 pt-5"}`}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{labels.total}</p>
          {quoteLoading && phase === "vehicles" ? (
            <p className="mt-1 text-sm text-neutral-500">{labels.updating}</p>
          ) : priceLabel ? (
            <p className="mt-1 text-2xl font-light tracking-tight text-black tabular-nums">{priceLabel}</p>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">{labels.pendingPrice}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
