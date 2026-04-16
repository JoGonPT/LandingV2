"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { CheckoutPaymentStep } from "@/components/CheckoutPaymentStep";
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
    success?: { title?: string; message?: string; close?: string };
    errors?: { generic?: string; gdpr?: string };
    checkout?: {
      chooseVehicle?: string;
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
    distanceKm: "",
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

  function buildPayload(): BookingPayload | null {
    const distanceRaw = formData.distanceKm.trim();
    const distanceKm =
      distanceRaw !== "" && Number.isFinite(Number(distanceRaw)) ? Number(distanceRaw) : undefined;
    if (distanceKm === undefined) return null;

    return {
      locale: bookingLocale,
      route: {
        pickup: formData.pickup.trim(),
        dropoff: formData.dropoff.trim(),
        date: formData.date.trim(),
        time: formData.time.trim(),
        flightNumber: formData.flight.trim() || undefined,
        childSeat: formData.childSeat,
      },
      details: {
        passengers: Number(formData.passengers),
        luggage: Number(formData.luggage),
        notes: formData.notes.trim() || undefined,
        distanceKm,
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
      distanceKm: "",
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
          ? "Indique a distância do trajeto (km) para continuar."
          : "Please enter trip distance (km) to continue.",
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
      setError(ck?.chooseVehicle || "Please choose a vehicle.");
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
        colorText: "#111111",
        colorDanger: "#b91c1c",
        fontFamily: "system-ui, -apple-system, sans-serif",
        borderRadius: "6px",
        spacingUnit: "3px",
      },
      rules: {
        ".Input": { borderColor: "#e5e5e5", boxShadow: "none" },
        ".Input:focus": { borderColor: "#000000", boxShadow: "0 0 0 1px #000000" },
      },
    }),
    [],
  );

  const quotePrice =
    checkoutSession?.quote.price != null && checkoutSession.quote.currency
      ? formatMoneyAmount(Number(checkoutSession.quote.price), checkoutSession.quote.currency, bookingLocale)
      : null;

  return (
    <div className="w-full h-full relative">
      {phase === "form" ? (
        <form onSubmit={loadVehicles} className="w-full h-full bg-white p-5 md:p-6 space-y-4 min-h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <Input label={dict.date || "Date"} type="date" min={today} value={formData.date} onChange={(date) => setFormData((s) => ({ ...s, date }))} required />
            <Input label={dict.time || "Time"} type="time" value={formData.time} onChange={(time) => setFormData((s) => ({ ...s, time }))} required />
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
            <Input
              label={dict.distanceKm || "Trip distance (km)"}
              type="number"
              min="0"
              step="0.1"
              value={formData.distanceKm}
              onChange={(value) => setFormData((s) => ({ ...s, distanceKm: value }))}
              required
            />
          </div>

          <Input label={dict.flight || "Flight"} value={formData.flight} onChange={(flight) => setFormData((s) => ({ ...s, flight }))} />
          <Input label={dict.name || "Name"} value={formData.name} onChange={(name) => setFormData((s) => ({ ...s, name }))} required />
          <Input label={dict.email || "Email"} type="email" value={formData.email} onChange={(email) => setFormData((s) => ({ ...s, email }))} required />
          <Input label={dict.whatsapp || "Phone"} value={formData.phone} onChange={(phone) => setFormData((s) => ({ ...s, phone }))} required />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.childSeat}
              onChange={(event) => setFormData((s) => ({ ...s, childSeat: event.target.checked }))}
            />
            {dict.childSeat || "Child seat"}
          </label>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={gdprAccepted} onChange={(event) => setGdprAccepted(event.target.checked)} />
            <span>{dict.gdpr?.text || "I accept the privacy policy."}</span>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white rounded-lg py-3 font-semibold disabled:opacity-60"
          >
            {isLoading ? ck?.loadingVehicles || "Loading…" : ck?.chooseVehicle || "Continue"}
          </button>
        </form>
      ) : null}

      {phase === "vehicles" ? (
        <div className="w-full h-full bg-white p-5 md:p-6 space-y-4 min-h-[600px]">
          <h3 className="text-sm font-semibold text-black">{ck?.chooseVehicle || "Choose your vehicle"}</h3>
          <ul className="space-y-2">
            {vehicleOptions.map((v) => (
              <li key={v.vehicleType}>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="vehicle"
                    checked={selectedVehicle === v.vehicleType}
                    onChange={() => setSelectedVehicle(v.vehicleType)}
                  />
                  <span className="text-sm text-gray-900 capitalize flex-1">{v.vehicleType}</span>
                  <span className="text-sm text-gray-600">
                    {formatMoneyAmount(v.estimatedPrice, v.currency, bookingLocale)}
                    {v.seatsAvailable ? ` · ${v.seatsAvailable} seats` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
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
              className="flex-1 bg-black text-white rounded-lg py-3 font-semibold disabled:opacity-60"
              onClick={() => void startPaymentIntent()}
            >
              {isLoading ? ck?.loadingCheckout || "Preparing checkout…" : ck?.continueToPay || "Continue to payment"}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "payment" && checkoutSession && pendingPayload && stripePromise ? (
        <div className="w-full h-full bg-white p-5 md:p-6 space-y-4 min-h-[600px]">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{ck?.totalToPay || "Total to pay"}</p>
            <p className="text-2xl font-semibold text-black">{quotePrice}</p>
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

      {showSuccess && successData ? (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center p-5 z-10">
          <div className="text-center max-w-md space-y-3">
            <h3 className="text-lg font-bold text-black">{dict.success?.title || "Thank you!"}</h3>
            <p className="text-sm text-gray-600">
              {dict.success?.message || "Your transfer is confirmed."}
            </p>
            {successData.totalPaidFormatted ? (
              <p className="text-sm font-medium text-black">{successData.totalPaidFormatted}</p>
            ) : null}
            <p className="text-xs text-gray-500 text-left rounded-lg bg-gray-50 p-3">
              {successData.trip.pickup} → {successData.trip.dropoff}
              <br />
              {successData.trip.date} · {successData.trip.time}
            </p>
            {successData.trackingUrl ? (
              <a
                href={successData.trackingUrl}
                className="inline-block text-sm text-black underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {bookingLocale === "pt" ? "Ver estado do serviço" : "Track your ride"}
              </a>
            ) : null}
            <button
              className="px-4 py-2 rounded-md bg-black text-white w-full"
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
    <div className="border border-gray-200 rounded-lg p-3 text-sm space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title || "Price breakdown"}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between gap-4 text-gray-700">
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
      <span className="block text-sm text-gray-700 mb-1">{label}</span>
      <input
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
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
