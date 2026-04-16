import { formatMoneyAmount } from "@/lib/checkout/format-money";
import type { BookingLocale } from "@/lib/transfercrm/types";

/** Rough drive-time hint when the CRM does not return duration (~50 km/h blended average). */
export function estimateDriveMinutesFromKm(km: number): number {
  return Math.max(1, Math.round((km / 50) * 60));
}

export interface BookingRoutePreviewLabels {
  title: string;
  loading: string;
  suggested: string;
  from: string;
  distanceEta: string;
  distanceOnly: string;
  etaNote: string;
  availabilityNote: string;
}

export function BookingRoutePreview({
  loading,
  error,
  distanceKm,
  price,
  currency,
  source,
  locale,
  labels,
}: {
  loading: boolean;
  error: string | null;
  distanceKm: number | null | undefined;
  price: number | null | undefined;
  currency: string | null | undefined;
  source: "quote" | "availability" | undefined;
  locale: BookingLocale;
  labels: BookingRoutePreviewLabels;
}) {
  if (loading) {
    return (
      <div
        className="rounded-lg border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-sm text-violet-950"
        role="status"
        aria-live="polite"
      >
        {labels.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600" role="status">
        {error}
      </div>
    );
  }

  const hasDistance = distanceKm != null && Number.isFinite(Number(distanceKm));
  const hasPrice = price != null && Number.isFinite(Number(price)) && currency != null && currency.trim() !== "";

  if (!hasDistance && !hasPrice) {
    return null;
  }

  const distNum = hasDistance ? Number(distanceKm) : null;
  const etaMin = distNum != null ? estimateDriveMinutesFromKm(distNum) : null;

  const priceLine =
    hasPrice && currency
      ? source === "availability"
        ? `${labels.from} ${formatMoneyAmount(Number(price), currency, locale)}`
        : `${labels.suggested} ${formatMoneyAmount(Number(price), currency, locale)}`
      : null;

  const distanceLine =
    distNum != null && etaMin != null
      ? labels.distanceEta.replace("{km}", distNum.toFixed(1)).replace("{min}", String(etaMin))
      : distNum != null
        ? labels.distanceOnly.replace("{km}", distNum.toFixed(1))
        : null;

  return (
    <div className="rounded-lg border border-violet-200/80 bg-violet-50/90 px-4 py-3 text-sm text-violet-950 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-800/90">{labels.title}</p>
      {priceLine ? <p className="mt-2 text-base font-medium tabular-nums text-violet-950">{priceLine}</p> : null}
      {distanceLine ? <p className="mt-1 tabular-nums text-violet-900/95">{distanceLine}</p> : null}
      {distNum != null && etaMin != null ? (
        <p className="mt-2 text-xs leading-snug text-violet-800/80">{labels.etaNote}</p>
      ) : null}
      {source === "availability" && hasPrice ? (
        <p className="mt-2 text-xs leading-snug text-violet-800/80">{labels.availabilityNote}</p>
      ) : null}
    </div>
  );
}
