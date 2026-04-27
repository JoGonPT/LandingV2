"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { BookingRoutePreview } from "@/components/booking/BookingRoutePreview";
import { BookingStickySummary } from "@/components/booking/BookingStickySummary";
import { VehicleClassSelector } from "@/components/booking/VehicleClassSelector";
import { CheckoutPaymentStep } from "@/components/CheckoutPaymentStep";
import { useDebouncedQuote } from "@/hooks/useDebouncedQuote";
import { useDebouncedRoutePreview } from "@/hooks/useDebouncedRoutePreview";
import { estimateDriveMinutesFromKm } from "@/lib/booking/drive-time-estimate";
import type { BookingRequestDto } from "@/lib/booking/book-public";
import type { QuoteRequestDto } from "@/lib/booking/quote-public";
import type { BookingPayload, BookingLocale, CheckoutCompleteSuccess, TransferCrmVehicleOption } from "@/lib/transfercrm/types";
import { clearB2CCheckoutIdempotencyKey, ensureB2CCheckoutIdempotencyKey } from "@/lib/checkout/b2c-checkout-idempotency";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { stripeMinorToMajorUnits } from "@/lib/checkout/stripe-money";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";

const CHECKOUT_STORAGE_KEY = "way2go_checkout_v1";

/** Sidebar + mobile sticky trip summary (off until UX is refined). */
const BOOKING_STICKY_SUMMARY_ENABLED = false;

type CheckoutSessionStored = {
  dto: BookingRequestDto;
  paymentIntentId: string;
};

interface BookingFormProps {
  dict: {
    title?: string;
    pickup?: string;
    dropoff?: string;
    date?: string;
    time?: string;
    passengers?: string;
    luggage?: string;
    distanceKm?: string;
    flight?: string;
    flightPlaceholder?: string;
    contactInfo?: string;
    childSeat?: string;
    name?: string;
    email?: string;
    whatsapp?: string;
    gdpr?: { text?: string };
    submit?: string;
    success?: { title?: string; message?: string; close?: string; orderLabel?: string; referenceHint?: string };
    errors?: { generic?: string; gdpr?: string; distanceRequired?: string; distancePending?: string };
    checkout?: {
      chooseVehicle?: string;
      vehicleStepTitle?: string;
      continueFromForm?: string;
      continueToPay?: string;
      loadingVehicles?: string;
      loadingCheckout?: string;
      totalToPay?: string;
      confirmPay?: string;
      processing?: string;
      back?: string;
      noVehicles?: string;
      stripeMissing?: string;
      breakdownTitle?: string;
      summary?: {
        title?: string;
        route?: string;
        when?: string;
        vehicle?: string;
        extras?: string;
        childSeat?: string;
        luggage?: string;
        seats?: string;
        total?: string;
        updating?: string;
        pendingPrice?: string;
        none?: string;
      };
      vehicles?: {
        businessClass?: string;
        firstClass?: string;
        businessVan?: string;
        businessHint?: string;
        firstHint?: string;
        vanHint?: string;
        seats?: string;
      };
      breakdown?: {
        baseFee?: string;
        perKm?: string;
        perMin?: string;
        vehicleMultiplier?: string;
        timeSurcharge?: string;
        minimumFare?: string;
      };
      routePreview?: {
        title?: string;
        loading?: string;
        suggested?: string;
        from?: string;
        distanceEta?: string;
        distanceOnly?: string;
        etaNote?: string;
        availabilityNote?: string;
      };
    };
    [key: string]: unknown;
  };
  locale: string;
  onPhaseChange?: (phase: Phase) => void;
}

type Phase = "form" | "vehicles" | "payment";

export default function BookingForm({ dict, locale, onPhaseChange }: BookingFormProps) {
  const bookingLocale: BookingLocale = locale === "pt" ? "pt" : "en";
  const ck = dict.checkout;

  const [phase, setPhase] = useState<Phase>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutCompleteSuccess | null>(null);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState<TransferCrmVehicleOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [checkoutSession, setCheckoutSession] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    currency: string;
    amountMinor: number;
  } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<BookingPayload | null>(null);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const [formData, setFormData] = useState({
    pickup: "",
    dropoff: "",
    date: "",
    time: "",
    passengers: 1,
    luggage: 0,
    flight: "",
    childSeat: false,
    name: "",
    email: "",
    phone: "",
    fiscalName: "",
    fiscalVat: "",
    notes: "",
  });

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  const quoteRequest = useMemo((): QuoteRequestDto | null => {
    if (!pendingPayload) return null;
    const r = pendingPayload.route;
    const pickup = r.pickup?.trim() ?? "";
    const dropoff = r.dropoff?.trim() ?? "";
    const date = r.date?.trim() ?? "";
    const time = r.time?.trim() ?? "";
    if (!pickup || !dropoff || !date || !time) return null;
    return {
      pickup,
      dropoff,
      datetime: `${date} ${time}`,
      passengers: pendingPayload.details.passengers,
      ...(selectedVehicle.trim() ? { vehicleType: selectedVehicle.trim() } : {}),
    };
  }, [pendingPayload, selectedVehicle]);

  const { quote: debouncedQuote, loading: quoteLoading } = useDebouncedQuote({
    request: quoteRequest,
    enabled:
      BOOKING_STICKY_SUMMARY_ENABLED && phase === "vehicles" && Boolean(quoteRequest && selectedVehicle.trim()),
  });

  const rp = ck?.routePreview;
  const routePreviewLabels = useMemo(
    () => ({
      title: rp?.title ?? "Route estimate",
      loading: rp?.loading ?? "Calculating…",
      suggested: rp?.suggested ?? "Suggested:",
      from: rp?.from ?? "From",
      distanceEta: rp?.distanceEta ?? "{km} km · ~{min} min",
      distanceOnly: rp?.distanceOnly ?? "{km} km",
      etaNote:
        rp?.etaNote ??
        "Drive time is indicative. Final price is confirmed when you choose a vehicle class.",
      availabilityNote:
        rp?.availabilityNote ?? "Indicative amount; exact price depends on the class you select.",
    }),
    [rp],
  );

  const { loading: routePreviewLoading, error: routePreviewError, data: routePreviewData } = useDebouncedRoutePreview({
    pickup: formData.pickup,
    dropoff: formData.dropoff,
    date: formData.date,
    time: formData.time,
    passengers: formData.passengers,
    enabled: phase === "form" || phase === "vehicles",
  });
  const previewDistanceReady =
    routePreviewData?.distanceKm != null &&
    Number.isFinite(Number(routePreviewData.distanceKm)) &&
    Number(routePreviewData.distanceKm) > 0;

  const summaryLabels = useMemo(
    () => ({
      title: ck?.summary?.title ?? "Your trip",
      route: ck?.summary?.route ?? "Route",
      when: ck?.summary?.when ?? "When",
      vehicle: ck?.summary?.vehicle ?? "Vehicle",
      extras: ck?.summary?.extras ?? "Extras",
      childSeat: ck?.summary?.childSeat ?? "Child seat",
      luggage: ck?.summary?.luggage ?? "{n} bags",
      seats: ck?.summary?.seats ?? "{n} seats",
      total: ck?.summary?.total ?? "Total",
      updating: ck?.summary?.updating ?? "Updating price…",
      pendingPrice: ck?.summary?.pendingPrice ?? "—",
      none: ck?.summary?.none ?? "—",
      businessClass: ck?.vehicles?.businessClass ?? "Business Class",
      firstClass: ck?.vehicles?.firstClass ?? "First Class",
      businessVan: ck?.vehicles?.businessVan ?? "Business Van",
    }),
    [ck?.summary, ck?.vehicles],
  );

  const vehicleSelectorLabels = useMemo(
    () => ({
      businessClass: ck?.vehicles?.businessClass ?? "Business Class",
      firstClass: ck?.vehicles?.firstClass ?? "First Class",
      businessVan: ck?.vehicles?.businessVan ?? "Business Van",
      businessHint: ck?.vehicles?.businessHint ?? "E-Class or similar",
      firstHint: ck?.vehicles?.firstHint ?? "S-Class or similar",
      vanHint: ck?.vehicles?.vanHint ?? "V-Class or similar",
      seats: ck?.vehicles?.seats ?? "{n} seats available",
    }),
    [ck?.vehicles],
  );

  function buildPayload(mode: "draft" | "checkout"): BookingPayload | null {
    const pickup = formData.pickup.trim();
    const dropoff = formData.dropoff.trim();
    const date = formData.date.trim();
    const time = formData.time.trim();
    if (!pickup || !dropoff || !date || !time) return null;
    if (mode === "checkout") {
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) return null;
      if (!gdprAccepted) return null;
    }

    const previewDistanceKm =
      routePreviewData?.distanceKm != null && Number.isFinite(Number(routePreviewData.distanceKm))
        ? Number(routePreviewData.distanceKm)
        : undefined;

    return {
      locale: bookingLocale,
      route: {
        pickup,
        dropoff,
        date,
        time,
        flightNumber: formData.flight.trim() || undefined,
        childSeat: formData.childSeat,
      },
      details: {
        passengers: Number(formData.passengers),
        luggage: Number(formData.luggage),
        notes: formData.notes.trim() || undefined,
        ...(previewDistanceKm !== undefined && previewDistanceKm > 0 ? { distanceKm: previewDistanceKm } : {}),
      },
      contact: {
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      },
      gdprAccepted: gdprAccepted,
    };
  }

  function buildBookingRequestDto(): BookingRequestDto | null {
    const pickup = formData.pickup.trim();
    const dropoff = formData.dropoff.trim();
    const date = formData.date.trim();
    const time = formData.time.trim();
    if (!pickup || !dropoff || !date || !time) return null;
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) return null;
    if (!gdprAccepted) return null;
    if (!selectedVehicle.trim()) return null;
    const previewDistanceKm =
      routePreviewData?.distanceKm != null && Number.isFinite(Number(routePreviewData.distanceKm))
        ? Number(routePreviewData.distanceKm)
        : undefined;
    return {
      pickup,
      dropoff,
      datetime: `${date} ${time}`,
      passengers: Number(formData.passengers),
      vehicleType: selectedVehicle.trim(),
      customer: {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      },
      ...(formData.fiscalName.trim() ? { fiscalName: formData.fiscalName.trim() } : {}),
      ...(formData.fiscalVat.trim() ? { fiscalVat: formData.fiscalVat.trim() } : {}),
      ...(previewDistanceKm !== undefined && previewDistanceKm > 0 ? { distanceKm: previewDistanceKm } : {}),
      locale: bookingLocale,
      ...(formData.flight.trim() ? { flightNumber: formData.flight.trim() } : {}),
      childSeat: formData.childSeat,
      luggage: Number(formData.luggage),
      ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
    };
  }

  function resetTripForm() {
    setFormData({
      pickup: "",
      dropoff: "",
      date: "",
      time: "",
      passengers: 1,
      luggage: 0,
      flight: "",
      childSeat: false,
      name: "",
      email: "",
      phone: "",
      fiscalName: "",
      fiscalVat: "",
      notes: "",
    });
    setGdprAccepted(false);
    setVehicleOptions([]);
    setSelectedVehicle("");
    setCheckoutSession(null);
    setPendingPayload(null);
    setPhase("form");
    clearB2CCheckoutIdempotencyKey();
  }

  function handlePaidSuccess(data: CheckoutCompleteSuccess) {
    setSuccessData(data);
    setShowSuccess(true);
    setCheckoutSession(null);
    resetTripForm();
    try {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  const handlePaidSuccessRef = useRef(handlePaidSuccess);
  handlePaidSuccessRef.current = handlePaidSuccess;

  /** After redirect-based payment methods, Stripe sends the user back with query params. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pi = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");
    if (!pi || redirectStatus !== "succeeded") return;

    let stored: CheckoutSessionStored | null = null;
    try {
      const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as CheckoutSessionStored;
    } catch {
      stored = null;
    }
    if (!stored || stored.paymentIntentId !== pi) {
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    (async () => {
      setIsLoading(true);
      setError("");
      try {
        let booking: CheckoutCompleteSuccess | null = null;
        let failed = false;
        for (let i = 0; i < 60; i++) {
          const res = await fetch(
            `/api/checkout/status?payment_intent=${encodeURIComponent(stored!.paymentIntentId)}`,
          );
          const data = (await res.json().catch(() => null)) as
            | { state?: string; message?: string; booking?: CheckoutCompleteSuccess }
            | null;
          if (data?.state === "ready" && data.booking?.success === true) {
            booking = data.booking;
            break;
          }
          if (data?.state === "failed") {
            setError(data.message ?? dict.errors?.generic ?? "Could not complete booking.");
            failed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        window.history.replaceState({}, "", window.location.pathname);
        sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
        if (booking) {
          handlePaidSuccessRef.current(booking);
        } else if (!failed) {
          setError(
            dict.errors?.generic ||
              "Confirmation is taking longer than expected. Please contact us if you were charged.",
          );
        }
      } catch {
        window.history.replaceState({}, "", window.location.pathname);
        setError(dict.errors?.generic || "Could not complete booking.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dict.errors?.generic]);

  async function loadVehicles(event: FormEvent) {
    event.preventDefault();
    setError("");

    const payload = buildPayload("draft");
    if (!payload) {
      setError(
        bookingLocale === "pt"
          ? "Preencha origem, destino, data e hora para continuar."
          : "Please fill pickup, dropoff, date, and time to continue.",
      );
      return;
    }
    if (!previewDistanceReady) {
      setError(
        dict.errors?.distancePending ||
          (bookingLocale === "pt"
            ? "A calcular distância… aguarde 1-2s."
            : "Calculating distance… please wait 1-2 seconds."),
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/booking/vehicles/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; vehicles?: TransferCrmVehicleOption[]; message?: string; code?: string }
        | null;

      if (!response.ok || !body || body.success !== true || !Array.isArray(body.vehicles)) {
        if (body?.code === "DISTANCE_REQUIRED") {
          setError(
            dict.errors?.distanceRequired ||
              (bookingLocale === "pt"
                ? "Não foi possível calcular a distância do trajeto. Ajuste origem/destino e tente novamente."
                : "Could not calculate route distance. Please adjust pickup/dropoff and try again."),
          );
        } else {
          setError(body?.message || dict.errors?.generic || "Could not load vehicles.");
        }
        return;
      }

      if (body.vehicles.length === 0) {
        setError(ck?.noVehicles || "No vehicles available for this trip. Try another time or contact us.");
        return;
      }

      setVehicleOptions(body.vehicles);
      setSelectedVehicle(body.vehicles[0]?.vehicleType ?? "");
      setPendingPayload(payload);
      setPhase("vehicles");
    } catch {
      setError(dict.errors?.generic || "Could not load vehicles.");
    } finally {
      setIsLoading(false);
    }
  }

  async function startPaymentIntent() {
    setError("");
    if (!selectedVehicle) {
      setError(ck?.vehicleStepTitle || "Please choose a vehicle.");
      return;
    }
    const dto = buildBookingRequestDto();
    if (!dto) {
      setError(
        bookingLocale === "pt"
          ? "Preencha contacto e aceite a política de privacidade para continuar."
          : "Please fill contact details and accept privacy policy to continue.",
      );
      return;
    }
    if (!publishableKey) {
      setError(ck?.stripeMissing || "Online payment is not configured.");
      return;
    }

    setIsLoading(true);
    try {
      const idempotencyKey = ensureB2CCheckoutIdempotencyKey();
      const response = await fetch("/api/checkout/intent/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(dto),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            clientSecret?: string;
            paymentIntentId?: string;
            currency?: string;
            amountMinor?: number;
            message?: string;
          }
        | null;

      if (
        !response.ok ||
        !body ||
        body.success !== true ||
        !body.clientSecret ||
        !body.paymentIntentId ||
        typeof body.amountMinor !== "number" ||
        !body.currency
      ) {
        setError(body?.message || dict.errors?.generic || "Could not start checkout.");
        return;
      }

      const checkoutPayload = buildPayload("checkout");
      setCheckoutSession({
        clientSecret: body.clientSecret,
        paymentIntentId: body.paymentIntentId,
        currency: body.currency,
        amountMinor: body.amountMinor,
      });
      if (checkoutPayload) {
        setPendingPayload(checkoutPayload);
      }
      try {
        sessionStorage.setItem(
          CHECKOUT_STORAGE_KEY,
          JSON.stringify({
            dto,
            paymentIntentId: body.paymentIntentId,
          } satisfies CheckoutSessionStored),
        );
      } catch {
        /* ignore */
      }
      setPhase("payment");
    } catch {
      setError(dict.errors?.generic || "Could not start checkout.");
    } finally {
      setIsLoading(false);
    }
  }

  const elementsAppearance = useMemo(
    (): StripeElementsOptions["appearance"] => ({
      theme: "stripe",
      variables: {
        colorPrimary: "#000000",
        colorBackground: "#ffffff",
        colorText: "#0a0a0a",
        colorDanger: "#b91c1c",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        borderRadius: "4px",
        spacingUnit: "3px",
      },
      rules: {
        ".Input": { borderColor: "#d4d4d4", boxShadow: "none" },
        ".Input:focus": { borderColor: "#000000", boxShadow: "0 0 0 1px #000000" },
      },
    }),
    [],
  );

  const quotePrice =
    checkoutSession != null
      ? formatMoneyAmount(
          stripeMinorToMajorUnits(checkoutSession.amountMinor, checkoutSession.currency),
          checkoutSession.currency,
          bookingLocale,
        )
      : null;

  const paymentQuoteSticky: QuoteResponse | null = checkoutSession
    ? ({
        price: stripeMinorToMajorUnits(checkoutSession.amountMinor, checkoutSession.currency),
        currency: checkoutSession.currency,
      } as QuoteResponse)
    : null;

  const summaryTrip = BOOKING_STICKY_SUMMARY_ENABLED ? pendingPayload : null;
  const showSticky = Boolean(summaryTrip) && (phase === "vehicles" || phase === "payment");
  const stickySelectedVehicle = phase === "vehicles" || phase === "payment" ? selectedVehicle : "";

  const summaryProps =
    BOOKING_STICKY_SUMMARY_ENABLED && summaryTrip
      ? {
          phase,
          pickup: summaryTrip.route.pickup,
          dropoff: summaryTrip.route.dropoff,
          date: summaryTrip.route.date,
          time: summaryTrip.route.time,
          selectedVehicleType: stickySelectedVehicle,
          vehicleOptions,
          childSeat: summaryTrip.route.childSeat,
          luggage: summaryTrip.details.luggage,
          debouncedQuote,
          quoteLoading,
          paymentQuote: paymentQuoteSticky,
          paymentCurrency: checkoutSession?.currency ?? "EUR",
          labels: summaryLabels,
          locale: bookingLocale,
        }
      : null;
  const stepIndex = phase === "form" ? 1 : phase === "vehicles" ? 2 : 3;

  return (
    <div className="relative w-full">
      {phase !== "form" ? (
        <div className="mb-6 grid grid-cols-3 gap-2">
          {(bookingLocale === "pt" ? ["Cotação", "Detalhes", "Pagamento"] : ["Quote", "Details", "Payment"]).map((label, idx) => {
            const i = idx + 1;
            const active = i <= stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                    active ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-500"
                  }`}
                >
                  {i}
                </span>
                <span className={`text-xs ${active ? "text-black" : "text-neutral-500"}`}>{label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className={`flex flex-col gap-6 lg:flex-row lg:items-start ${showSticky ? "pb-28 lg:pb-0" : ""}`}>
        <div className="min-w-0 flex-1">
          {phase === "form" ? (
            <form onSubmit={loadVehicles} className="min-h-[540px] space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AddressAutocompleteInput
                  label={dict.pickup || "Pickup"}
                  value={formData.pickup}
                  onChange={(pickup) => setFormData((s) => ({ ...s, pickup }))}
                  locale={bookingLocale}
                  required
                />
                <AddressAutocompleteInput
                  label={dict.dropoff || "Dropoff"}
                  value={formData.dropoff}
                  onChange={(dropoff) => setFormData((s) => ({ ...s, dropoff }))}
                  locale={bookingLocale}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label={dict.date || "Date"}
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(date) => setFormData((s) => ({ ...s, date }))}
                  required
                />
                <Input
                  label={dict.time || "Time"}
                  type="time"
                  value={formData.time}
                  onChange={(time) => setFormData((s) => ({ ...s, time }))}
                  required
                />
                <Input
                  label={dict.flight || "Flight number"}
                  placeholder={dict.flightPlaceholder}
                  value={formData.flight}
                  onChange={(flight) => setFormData((s) => ({ ...s, flight }))}
                />
              </div>

              {(routePreviewLoading ||
                routePreviewError ||
                routePreviewData?.distanceKm != null ||
                (routePreviewData?.price != null && routePreviewData?.currency)) && (
                <BookingRoutePreview
                  loading={routePreviewLoading}
                  error={routePreviewError}
                  distanceKm={routePreviewData?.distanceKm ?? undefined}
                  price={routePreviewData?.price ?? undefined}
                  currency={routePreviewData?.currency ?? undefined}
                  source={routePreviewData?.source}
                  locale={bookingLocale}
                  labels={routePreviewLabels}
                />
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectInput
                  label={dict.passengers || "Passengers"}
                  value={String(formData.passengers)}
                  onChange={(value) => setFormData((s) => ({ ...s, passengers: Number(value || 1) }))}
                  options={Array.from({ length: 14 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                />
                <SelectInput
                  label={dict.luggage || "Luggage"}
                  value={String(formData.luggage)}
                  onChange={(value) => setFormData((s) => ({ ...s, luggage: Number(value || 0) }))}
                  options={Array.from({ length: 15 }, (_, i) => ({ value: String(i), label: String(i) }))}
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={isLoading || routePreviewLoading || !previewDistanceReady}
                className="w-full min-h-[52px] rounded-xl bg-black text-sm font-semibold tracking-wide text-white disabled:opacity-50"
              >
                {isLoading || routePreviewLoading
                  ? ck?.loadingVehicles || "Loading…"
                  : ck?.continueFromForm ?? ck?.chooseVehicle ?? "Continue"}
              </button>
            </form>
          ) : null}

          {phase === "vehicles" ? (
            <div className="grid min-h-[560px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  {ck?.vehicleStepTitle || "Choose your vehicle"}
                </h3>
                <VehicleClassSelector
                  options={vehicleOptions}
                  selected={selectedVehicle}
                  onSelect={setSelectedVehicle}
                  locale={bookingLocale}
                  labels={vehicleSelectorLabels}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label={dict.name || "Name"} value={formData.name} onChange={(name) => setFormData((s) => ({ ...s, name }))} required />
                  <Input
                    label={dict.email || "Email"}
                    type="email"
                    value={formData.email}
                    onChange={(email) => setFormData((s) => ({ ...s, email }))}
                    required
                  />
                </div>
                <Input label={dict.whatsapp || "Phone"} value={formData.phone} onChange={(phone) => setFormData((s) => ({ ...s, phone }))} required />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label={bookingLocale === "pt" ? "Nome Fiscal (fatura)" : "Fiscal Name (invoice)"}
                    value={formData.fiscalName}
                    onChange={(fiscalName) => setFormData((s) => ({ ...s, fiscalName }))}
                  />
                  <Input
                    label={bookingLocale === "pt" ? "NIF / VAT" : "VAT / Tax ID"}
                    value={formData.fiscalVat}
                    onChange={(fiscalVat) => setFormData((s) => ({ ...s, fiscalVat }))}
                  />
                </div>
                <Input label={dict.flight || "Flight number"} value={formData.flight} onChange={(flight) => setFormData((s) => ({ ...s, flight }))} />
                <label className="flex items-center gap-3 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-400 text-black focus:ring-black"
                    checked={formData.childSeat}
                    onChange={(event) => setFormData((s) => ({ ...s, childSeat: event.target.checked }))}
                  />
                  {dict.childSeat || "Child seat"}
                </label>
                <Input label={bookingLocale === "pt" ? "Notas" : "Notes"} value={formData.notes} onChange={(notes) => setFormData((s) => ({ ...s, notes }))} />
                <label className="flex items-start gap-3 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-neutral-400 text-black focus:ring-black"
                    checked={gdprAccepted}
                    onChange={(event) => setGdprAccepted(event.target.checked)}
                  />
                  <span>{dict.gdpr?.text || "I accept the privacy policy."}</span>
                </label>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="min-h-[48px] rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-900"
                    onClick={() => {
                      setPhase("form");
                      setError("");
                    }}
                  >
                    {ck?.back || "Back"}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading || !selectedVehicle}
                    className="min-h-[52px] flex-1 rounded-xl bg-black text-sm font-semibold tracking-wide text-white disabled:opacity-50"
                    onClick={() => void startPaymentIntent()}
                  >
                    {isLoading ? ck?.loadingCheckout || "Preparing checkout…" : ck?.continueToPay || "Continue to payment"}
                  </button>
                </div>
              </div>
              <TripSideSummaryCard
                locale={bookingLocale}
                pickup={pendingPayload?.route.pickup ?? ""}
                dropoff={pendingPayload?.route.dropoff ?? ""}
                date={pendingPayload?.route.date ?? ""}
                time={pendingPayload?.route.time ?? ""}
                passengers={pendingPayload?.details.passengers ?? formData.passengers}
                luggage={pendingPayload?.details.luggage ?? formData.luggage}
                selectedVehicle={selectedVehicle}
                vehicleOptions={vehicleOptions}
                distanceKm={routePreviewData?.distanceKm ?? null}
              />
            </div>
          ) : null}

          {phase === "payment" && checkoutSession && pendingPayload && stripePromise ? (
            <div className="min-h-[560px] space-y-6 bg-white p-5 md:p-6">
              <div className="space-y-1 border-b border-neutral-200 pb-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                  {ck?.totalToPay || "Total to pay"}
                </p>
                <p className="text-3xl font-light tracking-tight text-black tabular-nums">{quotePrice}</p>
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: checkoutSession.clientSecret,
                  appearance: elementsAppearance,
                }}
                key={checkoutSession.clientSecret}
              >
                <CheckoutPaymentStep
                  paymentIntentId={checkoutSession.paymentIntentId}
                  fiscalName={formData.fiscalName}
                  fiscalVat={formData.fiscalVat}
                  labels={{
                    pay: ck?.confirmPay || "Confirm and pay",
                    processing: ck?.processing || "Processing…",
                    back: ck?.back || "Back",
                  }}
                  onSuccess={handlePaidSuccess}
                  onBack={() => {
                    setPhase("vehicles");
                    setCheckoutSession(null);
                    setError("");
                    try {
                      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
                    } catch {
                      /* ignore */
                    }
                    clearB2CCheckoutIdempotencyKey();
                  }}
                />
              </Elements>
            </div>
          ) : null}
        </div>

        {showSticky && summaryProps ? (
          <div className="hidden w-full shrink-0 lg:block lg:w-[min(100%,320px)]">
            <div className="lg:sticky lg:top-28">
              <BookingStickySummary variant="desktop" {...summaryProps} />
            </div>
          </div>
        ) : null}
      </div>

      {showSticky && summaryProps ? (
        <div className="fixed bottom-0 left-0 right-0 z-20 lg:hidden">
          <BookingStickySummary variant="mobile" {...summaryProps} />
        </div>
      ) : null}

      {showSuccess && successData ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-8 border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
                {dict.success?.title || "Thank you"}
              </p>
              {successData.orderReference ? (
                <div className="mt-6 border-y border-black py-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    {dict.success?.orderLabel || "Way2Go order number"}
                  </p>
                  <p className="mt-3 text-4xl font-light tracking-tight text-black">{successData.orderReference}</p>
                  {dict.success?.referenceHint ? (
                    <p className="mt-2 text-xs text-neutral-500">{dict.success.referenceHint}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-neutral-600">
              {dict.success?.message || "Your transfer is confirmed."}
            </p>
            {successData.totalPaidFormatted ? (
              <p className="text-sm font-medium tabular-nums text-black">{successData.totalPaidFormatted}</p>
            ) : null}
            <p className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 text-left text-xs text-neutral-600">
              {successData.trip.pickup} → {successData.trip.dropoff}
              <br />
              <span className="tabular-nums">
                {successData.trip.date} · {successData.trip.time}
              </span>
            </p>
            {successData.trackingUrl ? (
              <a
                href={successData.trackingUrl}
                className="inline-block text-sm text-black underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                {bookingLocale === "pt" ? "Ver estado do serviço" : "Track your ride"}
              </a>
            ) : null}
            <button
              type="button"
              className="w-full min-h-[48px] bg-black text-sm font-semibold tracking-wide text-white"
              onClick={() => {
                setShowSuccess(false);
                setSuccessData(null);
              }}
            >
              {dict.success?.close || "Close"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TripSideSummaryCard({
  locale,
  pickup,
  dropoff,
  date,
  time,
  passengers,
  luggage,
  selectedVehicle,
  vehicleOptions,
  distanceKm,
}: {
  locale: BookingLocale;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  selectedVehicle: string;
  vehicleOptions: TransferCrmVehicleOption[];
  distanceKm: number | null;
}) {
  const selected = vehicleOptions.find((v) => v.vehicleType === selectedVehicle) ?? null;
  const vehiclePrice =
    selected && Number.isFinite(selected.guestRetailPrice ?? selected.estimatedPrice)
      ? formatMoneyAmount(selected.guestRetailPrice ?? selected.estimatedPrice, selected.currency, locale)
      : null;
  const routeKm = distanceKm != null && Number.isFinite(Number(distanceKm)) ? Number(distanceKm) : null;
  const routeMin = routeKm != null ? estimateDriveMinutesFromKm(routeKm) : null;
  const mapsQuery = encodeURIComponent(`${pickup} to ${dropoff}`);

  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        {locale === "pt" ? "Resumo da viagem" : "Trip summary"}
      </p>
      <div className="mt-4 space-y-2 border-b border-neutral-200 pb-4 text-sm text-neutral-700">
        <p className="font-medium text-black">{pickup || (locale === "pt" ? "Origem" : "Pickup")}</p>
        <p>{dropoff || (locale === "pt" ? "Destino" : "Dropoff")}</p>
        <p className="text-xs tabular-nums text-neutral-500">
          {date || "--"} {time ? `· ${time}` : ""}
        </p>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-neutral-700">
        <li className="flex items-center justify-between">
          <span>{locale === "pt" ? "Passageiros" : "Passengers"}</span>
          <span className="tabular-nums">{passengers}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>{locale === "pt" ? "Malas" : "Luggage"}</span>
          <span className="tabular-nums">{luggage}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>{locale === "pt" ? "Viatura" : "Vehicle"}</span>
          <span className="text-right text-xs text-neutral-600">{selectedVehicle ? selectedVehicle.replace(/_/g, " ") : "—"}</span>
        </li>
      </ul>
      <div className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
        <span className="text-neutral-600">{locale === "pt" ? "Preço estimado" : "Estimated price"}: </span>
        <span className="font-semibold text-black tabular-nums">{vehiclePrice ?? "—"}</span>
      </div>
      <div className="mt-4 border-t border-neutral-200 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          {locale === "pt" ? "Rota" : "Route"}
        </p>
        <p className="mt-1 text-sm text-neutral-700 tabular-nums">
          {routeKm != null
            ? `${routeKm.toFixed(1)} km${routeMin != null ? ` / ~${routeMin} min` : ""}`
            : locale === "pt"
              ? "Distância a calcular"
              : "Distance pending"}
        </p>
        {pickup && dropoff ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
            <iframe
              title={locale === "pt" ? "Mapa da rota" : "Route map"}
              src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
              className="h-44 w-full pointer-events-none"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</span>
      <input
        className="min-h-[44px] w-full border border-neutral-300 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder?.trim() ? placeholder : undefined}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</span>
      <select
        className="min-h-[44px] w-full border border-neutral-300 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
