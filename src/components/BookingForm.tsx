"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { BookingStickySummary } from "@/components/booking/BookingStickySummary";
import { VehicleClassSelector } from "@/components/booking/VehicleClassSelector";
import { CheckoutPaymentStep } from "@/components/CheckoutPaymentStep";
import { useDebouncedQuote } from "@/hooks/useDebouncedQuote";
import type { BookingPayload, BookingLocale, CheckoutCompleteSuccess, TransferCrmVehicleOption } from "@/lib/transfercrm/types";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";

const CHECKOUT_STORAGE_KEY = "way2go_checkout_v1";

type CheckoutSessionStored = {
  payload: BookingPayload;
  vehicleType: string;
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
    childSeat?: string;
    name?: string;
    email?: string;
    whatsapp?: string;
    gdpr?: { text?: string };
    submit?: string;
    success?: { title?: string; message?: string; close?: string; orderLabel?: string; referenceHint?: string };
    errors?: { generic?: string; gdpr?: string };
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
    };
    [key: string]: unknown;
  };
  locale: string;
}

type Phase = "form" | "vehicles" | "payment";

export default function BookingForm({ dict, locale }: BookingFormProps) {
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
    quote: QuoteResponse;
    currency: string;
  } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<BookingPayload | null>(null);

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
    notes: "",
  });

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  const { quote: debouncedQuote, loading: quoteLoading } = useDebouncedQuote({
    payload: pendingPayload,
    vehicleType: selectedVehicle,
    enabled: phase === "vehicles" && Boolean(pendingPayload && selectedVehicle),
  });

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

  function buildPayload(): BookingPayload | null {
    const pickup = formData.pickup.trim();
    const dropoff = formData.dropoff.trim();
    const date = formData.date.trim();
    const time = formData.time.trim();
    if (!pickup || !dropoff || !date || !time) return null;

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
      },
      contact: {
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      },
      gdprAccepted: true,
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
      notes: "",
    });
    setGdprAccepted(false);
    setVehicleOptions([]);
    setSelectedVehicle("");
    setCheckoutSession(null);
    setPendingPayload(null);
    setPhase("form");
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
        const res = await fetch("/api/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: stored!.payload,
            vehicleType: stored!.vehicleType,
            paymentIntentId: stored!.paymentIntentId,
          }),
        });
        const data = (await res.json().catch(() => null)) as CheckoutCompleteSuccess | { message?: string } | null;
        window.history.replaceState({}, "", window.location.pathname);
        sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
        if (res.ok && data && "success" in data && data.success === true) {
          handlePaidSuccessRef.current(data);
        } else {
          setError(
            data && typeof data === "object" && "message" in data && typeof data.message === "string"
              ? data.message
              : dict.errors?.generic || "Could not complete booking.",
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

    if (!gdprAccepted) {
      setError(dict.errors?.gdpr || "Please accept privacy policy.");
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      setError(
        bookingLocale === "pt"
          ? "Preencha origem, destino, data e hora para continuar."
          : "Please fill pickup, dropoff, date, and time to continue.",
      );
      return;
    }

    if (!publishableKey) {
      setError(ck?.stripeMissing || "Online payment is not configured.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/booking/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; vehicles?: TransferCrmVehicleOption[]; message?: string }
        | null;

      if (!response.ok || !body || body.success !== true || !Array.isArray(body.vehicles)) {
        setError(body?.message || dict.errors?.generic || "Could not load vehicles.");
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
    if (!pendingPayload || !selectedVehicle) {
      setError(ck?.vehicleStepTitle || "Please choose a vehicle.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: pendingPayload, vehicleType: selectedVehicle }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            clientSecret?: string;
            paymentIntentId?: string;
            quote?: QuoteResponse;
            currency?: string;
            message?: string;
          }
        | null;

      if (
        !response.ok ||
        !body ||
        body.success !== true ||
        !body.clientSecret ||
        !body.paymentIntentId ||
        !body.quote
      ) {
        setError(body?.message || dict.errors?.generic || "Could not start checkout.");
        return;
      }

      setCheckoutSession({
        clientSecret: body.clientSecret,
        paymentIntentId: body.paymentIntentId,
        quote: body.quote,
        currency: body.currency ?? "EUR",
      });
      try {
        sessionStorage.setItem(
          CHECKOUT_STORAGE_KEY,
          JSON.stringify({
            payload: pendingPayload,
            vehicleType: selectedVehicle,
            paymentIntentId: body.paymentIntentId,
          }),
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
    checkoutSession?.quote.price != null && checkoutSession.quote.currency
      ? formatMoneyAmount(Number(checkoutSession.quote.price), checkoutSession.quote.currency, bookingLocale)
      : null;

  const summaryTrip = pendingPayload;
  const showSticky = Boolean(summaryTrip) && (phase === "vehicles" || phase === "payment");
  const stickySelectedVehicle = phase === "vehicles" || phase === "payment" ? selectedVehicle : "";

  const summaryProps = summaryTrip
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
        paymentQuote: checkoutSession?.quote ?? null,
        paymentCurrency: checkoutSession?.currency ?? "EUR",
        labels: summaryLabels,
        locale: bookingLocale,
      }
    : null;

  return (
    <div className="relative w-full">
      <div className={`flex flex-col gap-8 lg:flex-row lg:items-start ${showSticky ? "pb-28 lg:pb-0" : ""}`}>
        <div className="min-w-0 flex-1">
          {phase === "form" ? (
            <form onSubmit={loadVehicles} className="min-h-[560px] space-y-5 bg-white p-5 md:p-6">
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
                  label={dict.passengers || "Passengers"}
                  type="number"
                  min="1"
                  value={String(formData.passengers)}
                  onChange={(value) => setFormData((s) => ({ ...s, passengers: Number(value || 1) }))}
                  required
                />
                <Input
                  label={dict.luggage || "Luggage"}
                  type="number"
                  min="0"
                  value={String(formData.luggage)}
                  onChange={(value) => setFormData((s) => ({ ...s, luggage: Number(value || 0) }))}
                  required
                />
              </div>

              <Input label={dict.flight || "Flight"} value={formData.flight} onChange={(flight) => setFormData((s) => ({ ...s, flight }))} />
              <Input label={dict.name || "Name"} value={formData.name} onChange={(name) => setFormData((s) => ({ ...s, name }))} required />
              <Input
                label={dict.email || "Email"}
                type="email"
                value={formData.email}
                onChange={(email) => setFormData((s) => ({ ...s, email }))}
                required
              />
              <Input label={dict.whatsapp || "Phone"} value={formData.phone} onChange={(phone) => setFormData((s) => ({ ...s, phone }))} required />

              <label className="flex items-center gap-3 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-400 text-black focus:ring-black"
                  checked={formData.childSeat}
                  onChange={(event) => setFormData((s) => ({ ...s, childSeat: event.target.checked }))}
                />
                {dict.childSeat || "Child seat"}
              </label>

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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[52px] bg-black text-sm font-semibold tracking-wide text-white disabled:opacity-50"
              >
                {isLoading ? ck?.loadingVehicles || "Loading…" : ck?.continueFromForm ?? ck?.chooseVehicle ?? "Continue"}
              </button>
            </form>
          ) : null}

          {phase === "vehicles" ? (
            <div className="min-h-[560px] space-y-6 bg-white p-5 md:p-6">
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
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="min-h-[48px] border border-neutral-300 px-4 text-sm font-medium text-neutral-900"
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
                  className="min-h-[52px] flex-1 bg-black text-sm font-semibold tracking-wide text-white disabled:opacity-50"
                  onClick={() => void startPaymentIntent()}
                >
                  {isLoading ? ck?.loadingCheckout || "Preparing checkout…" : ck?.continueToPay || "Continue to payment"}
                </button>
              </div>
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

              <PriceBreakdown
                quote={checkoutSession.quote}
                labels={ck?.breakdown}
                title={ck?.breakdownTitle}
                locale={bookingLocale}
              />

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
                  payload={pendingPayload}
                  vehicleType={selectedVehicle}
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

function PriceBreakdown({
  quote,
  labels,
  title,
  locale,
}: {
  quote: QuoteResponse;
  labels?: {
    baseFee?: string;
    perKm?: string;
    perMin?: string;
    vehicleMultiplier?: string;
    timeSurcharge?: string;
    minimumFare?: string;
  };
  title?: string;
  locale: BookingLocale;
}) {
  const b = quote.breakdown;
  if (!b) return null;

  const rows: { label: string; value: string }[] = [];
  const cur = quote.currency ?? "EUR";
  if (b.base_fee != null) {
    rows.push({ label: labels?.baseFee ?? "Base fee", value: formatMoneyAmount(b.base_fee, cur, locale) });
  }
  if (b.per_km_rate != null) {
    rows.push({ label: labels?.perKm ?? "Per km", value: formatMoneyAmount(b.per_km_rate, cur, locale) });
  }
  if (b.per_min_rate != null) {
    rows.push({ label: labels?.perMin ?? "Per minute", value: formatMoneyAmount(b.per_min_rate, cur, locale) });
  }
  if (b.vehicle_multiplier != null) {
    rows.push({
      label: labels?.vehicleMultiplier ?? "Vehicle multiplier",
      value: `×${b.vehicle_multiplier}`,
    });
  }
  if (b.time_surcharge != null) {
    rows.push({
      label: labels?.timeSurcharge ?? "Time surcharge",
      value: formatMoneyAmount(b.time_surcharge, cur, locale),
    });
  }
  if (b.minimum_fare != null) {
    rows.push({
      label: labels?.minimumFare ?? "Minimum fare",
      value: formatMoneyAmount(b.minimum_fare, cur, locale),
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="border border-neutral-200 p-4 text-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{title || "Price breakdown"}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between gap-4 text-neutral-700">
            <span>{r.label}</span>
            <span className="tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
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
      />
    </label>
  );
}
