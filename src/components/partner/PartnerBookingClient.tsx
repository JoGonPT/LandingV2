"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { PartnerCheckoutPaymentStep } from "@/components/partner/PartnerCheckoutPaymentStep";
import { VehicleClassSelector } from "@/components/booking/VehicleClassSelector";
import type {
  BookingPayload,
  BookingLocale,
  CheckoutCompleteSuccess,
  PartnerPricingSummary,
  TransferCrmVehicleOption,
} from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { formatMoneyAmount } from "@/lib/checkout/format-money";

const checkoutStorageKey = (slug: string) => `way2go_partner_checkout_v1_${slug}`;

type Phase = "form" | "vehicles" | "payment";

type CheckoutSessionStored = {
  payload: BookingPayload;
  vehicleType: string;
  paymentIntentId: string;
  internalReference: string;
  vipRequests: string;
};

type PartnerPricingWithCurrency = PartnerPricingSummary & { currency: string };

type AccountSuccess = {
  success: true;
  orderId: string;
  orderReference?: string;
  trackingUrl?: string;
  status?: string;
  trip: { pickup: string; dropoff: string; date: string; time: string };
  totalFormatted: string;
  totalRetailFormatted?: string;
  partnerEarningsFormatted?: string;
  partnerPricing?: PartnerPricingWithCurrency;
  billing?: "monthly_account";
};

export function PartnerBookingClient({ slug, displayName }: { slug: string; displayName: string }) {
  const bookingLocale: BookingLocale = "en";
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [phase, setPhase] = useState<Phase>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicleOptions, setVehicleOptions] = useState<TransferCrmVehicleOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [pendingPayload, setPendingPayload] = useState<BookingPayload | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    quote: QuoteResponse;
    currency: string;
    partnerPricing?: PartnerPricingWithCurrency;
  } | null>(null);

  const [payOnAccount, setPayOnAccount] = useState(false);
  const [internalReference, setInternalReference] = useState("");
  const [vipRequests, setVipRequests] = useState("");
  const [gdprAccepted, setGdprAccepted] = useState(false);

  const [creditInfo, setCreditInfo] = useState<{
    creditLimit: number;
    currentUsage: number;
    available: number;
    currency: string;
    totalCommissionsEarned?: number;
  } | null>(null);
  const [eligibility, setEligibility] = useState<{
    success: boolean;
    quote?: QuoteResponse;
    credit?: {
      creditLimit: number;
      currentUsage: number;
      available: number;
      currency: string;
      totalCommissionsEarned?: number;
    };
    canUseAccount?: boolean;
    accountBlockReason?: string | null;
    partnerPricing?: PartnerPricingWithCurrency;
  } | null>(null);
  const [eligLoading, setEligLoading] = useState(false);

  const [successCard, setSuccessCard] = useState<CheckoutCompleteSuccess | null>(null);
  const [successAccount, setSuccessAccount] = useState<AccountSuccess | null>(null);

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

  const vehicleLabels = useMemo(
    () => ({
      businessClass: "Business Class",
      firstClass: "First Class",
      businessVan: "Business Van",
      businessHint: "E-Class or similar",
      firstHint: "S-Class or similar",
      vanHint: "V-Class or similar",
      seats: "{n} seats available",
    }),
    [],
  );

  const refreshSession = useCallback(async () => {
    const res = await fetch(`/api/partner/session?slug=${encodeURIComponent(slug)}`);
    const data = (await res.json().catch(() => null)) as { authenticated?: boolean } | null;
    setAuthenticated(Boolean(data?.authenticated));
  }, [slug]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (authenticated !== true) {
      setCreditInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/partner/credit?slug=${encodeURIComponent(slug)}`);
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        credit?: {
          creditLimit: number;
          currentUsage: number;
          available: number;
          currency: string;
          totalCommissionsEarned?: number;
        };
      } | null;
      if (!cancelled && data?.success && data.credit) setCreditInfo(data.credit);
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, slug]);

  useEffect(() => {
    if (authenticated !== true || phase !== "vehicles" || !pendingPayload || !selectedVehicle) {
      setEligibility(null);
      setEligLoading(false);
      return;
    }
    let cancelled = false;
    setEligLoading(true);
    setError("");
    (async () => {
      const res = await fetch("/api/partner/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          payload: pendingPayload,
          vehicleType: selectedVehicle,
          internalReference: internalReference.trim() || undefined,
          vipRequests: vipRequests.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            quote?: QuoteResponse;
            credit?: {
              creditLimit: number;
              currentUsage: number;
              available: number;
              currency: string;
              totalCommissionsEarned?: number;
            };
            canUseAccount?: boolean;
            accountBlockReason?: string | null;
            partnerPricing?: PartnerPricingWithCurrency;
            message?: string;
          }
        | null;
      if (cancelled) return;
      setEligLoading(false);
      if (res.ok && data?.success) {
        setEligibility({ success: true, ...data });
        if (data.credit) {
          setCreditInfo({
            creditLimit: data.credit.creditLimit,
            currentUsage: data.credit.currentUsage,
            available: data.credit.available,
            currency: data.credit.currency,
            totalCommissionsEarned: data.credit.totalCommissionsEarned,
          });
        }
      } else {
        setEligibility(null);
        setError(
          data && typeof data.message === "string" ? data.message : "Could not verify quote and credit for this vehicle.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, phase, pendingPayload, selectedVehicle, slug, internalReference, vipRequests]);

  useEffect(() => {
    if (!eligibility?.success || !payOnAccount) return;
    if (!eligibility.canUseAccount) {
      setPayOnAccount(false);
      setError(
        eligibility.accountBlockReason === "NOT_EUR"
          ? "Pay on account is only available for EUR quotes. Use card payment."
          : "This transfer exceeds your available credit. Use card payment.",
      );
    }
  }, [eligibility, payOnAccount]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/partner/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, secret: secretInput }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      setAuthError(data?.message || "Access denied.");
      return;
    }
    setSecretInput("");
    await refreshSession();
  }

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

  function resetBookingUi() {
    setPhase("form");
    setVehicleOptions([]);
    setSelectedVehicle("");
    setPendingPayload(null);
    setCheckoutSession(null);
    setError("");
  }

  const handlePaidSuccessRef = useRef((data: CheckoutCompleteSuccess) => {
    setSuccessCard(data);
    setCheckoutSession(null);
    resetBookingUi();
    try {
      sessionStorage.removeItem(checkoutStorageKey(slug));
    } catch {
      /* ignore */
    }
  });

  handlePaidSuccessRef.current = (data: CheckoutCompleteSuccess) => {
    setSuccessCard(data);
    setCheckoutSession(null);
    resetBookingUi();
    try {
      sessionStorage.removeItem(checkoutStorageKey(slug));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pi = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");
    if (!pi || redirectStatus !== "succeeded") return;

    let stored: CheckoutSessionStored | null = null;
    try {
      const raw = sessionStorage.getItem(checkoutStorageKey(slug));
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
        const res = await fetch("/api/partner/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            payload: stored!.payload,
            vehicleType: stored!.vehicleType,
            paymentIntentId: stored!.paymentIntentId,
            internalReference: stored!.internalReference || undefined,
            vipRequests: stored!.vipRequests || undefined,
          }),
        });
        const data = (await res.json().catch(() => null)) as CheckoutCompleteSuccess | { message?: string } | null;
        window.history.replaceState({}, "", window.location.pathname);
        sessionStorage.removeItem(checkoutStorageKey(slug));
        if (res.ok && data && "success" in data && data.success === true) {
          handlePaidSuccessRef.current(data);
        } else {
          setError(
            data && typeof data === "object" && "message" in data && typeof data.message === "string"
              ? data.message
              : "Could not complete booking.",
          );
        }
      } catch {
        window.history.replaceState({}, "", window.location.pathname);
        setError("Could not complete booking.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [slug]);

  async function loadVehicles(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!gdprAccepted) {
      setError("Please accept the privacy policy.");
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      setError("Please fill pickup, dropoff, date, and time to continue.");
      return;
    }

    if (!payOnAccount && !publishableKey) {
      setError("Card payment is not configured. Use pay on account or contact Way2Go.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/partner/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, payload }),
      });
      const body = (await response.json().catch(() => null)) as
        | { success?: boolean; vehicles?: TransferCrmVehicleOption[]; message?: string }
        | null;

      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }

      if (!response.ok || !body || body.success !== true || !Array.isArray(body.vehicles)) {
        setError(body?.message || "Could not load vehicles.");
        return;
      }

      if (body.vehicles.length === 0) {
        setError("No vehicles available for this trip.");
        return;
      }

      setVehicleOptions(body.vehicles);
      setSelectedVehicle(body.vehicles[0]?.vehicleType ?? "");
      setPendingPayload(payload);
      setPhase("vehicles");
    } catch {
      setError("Could not load vehicles.");
    } finally {
      setIsLoading(false);
    }
  }

  async function continueFromVehicles() {
    setError("");
    if (!pendingPayload || !selectedVehicle) {
      setError("Please choose a vehicle.");
      return;
    }

    if (payOnAccount) {
      if (eligLoading || !eligibility?.success) {
        setError("Checking quote and credit… please wait.");
        return;
      }
      if (!eligibility.canUseAccount) {
        setError("Pay on account is not available for this trip. Use card payment.");
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch("/api/partner/book-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            payload: pendingPayload,
            vehicleType: selectedVehicle,
            internalReference: internalReference.trim() || undefined,
            vipRequests: vipRequests.trim() || undefined,
          }),
        });
        const data = (await res.json().catch(() => null)) as AccountSuccess | { message?: string; success?: boolean } | null;
        if (res.status === 401) {
          setAuthenticated(false);
          return;
        }
        if (res.status === 402) {
          setPayOnAccount(false);
        }
        if (!res.ok || !data || data.success !== true) {
          setError(
            data && typeof data === "object" && "message" in data && typeof data.message === "string"
              ? data.message
              : "Booking failed.",
          );
          return;
        }
        setSuccessAccount(data as AccountSuccess);
        resetBookingUi();
      } catch {
        setError("Booking failed.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!publishableKey) {
      setError("Stripe is not configured for card payment.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/partner/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          payload: pendingPayload,
          vehicleType: selectedVehicle,
          internalReference: internalReference.trim() || undefined,
          vipRequests: vipRequests.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            clientSecret?: string;
            paymentIntentId?: string;
            quote?: QuoteResponse;
            currency?: string;
            partnerPricing?: PartnerPricingWithCurrency;
            message?: string;
          }
        | null;

      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }

      if (
        !response.ok ||
        !body ||
        body.success !== true ||
        !body.clientSecret ||
        !body.paymentIntentId ||
        !body.quote
      ) {
        setError(body?.message || "Could not start checkout.");
        return;
      }

      setCheckoutSession({
        clientSecret: body.clientSecret,
        paymentIntentId: body.paymentIntentId,
        quote: body.quote,
        currency: body.currency ?? "EUR",
        partnerPricing: body.partnerPricing,
      });
      try {
        sessionStorage.setItem(
          checkoutStorageKey(slug),
          JSON.stringify({
            payload: pendingPayload,
            vehicleType: selectedVehicle,
            paymentIntentId: body.paymentIntentId,
            internalReference,
            vipRequests,
          }),
        );
      } catch {
        /* ignore */
      }
      setPhase("payment");
    } catch {
      setError("Could not start checkout.");
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
      },
      rules: {
        ".Input": { borderColor: "#d4d4d4", boxShadow: "none" },
        ".Input:focus": { borderColor: "#000000", boxShadow: "0 0 0 1px #000000" },
      },
    }),
    [],
  );

  const guestRetailDisplay =
    checkoutSession?.partnerPricing != null
      ? formatMoneyAmount(checkoutSession.partnerPricing.retailPrice, checkoutSession.partnerPricing.currency, bookingLocale)
      : checkoutSession?.quote.price != null && checkoutSession.quote.currency
        ? formatMoneyAmount(Number(checkoutSession.quote.price), checkoutSession.quote.currency, bookingLocale)
        : null;

  const checkoutEarningsDisplay =
    checkoutSession?.partnerPricing != null
      ? formatMoneyAmount(
          checkoutSession.partnerPricing.partnerEarnings,
          checkoutSession.partnerPricing.currency,
          bookingLocale,
        )
      : null;

  const bookingComplete = Boolean(successCard || successAccount);

  if (authenticated === null) {
    return <p className="text-sm text-neutral-500">Checking access…</p>;
  }

  if (!authenticated) {
    return (
      <form onSubmit={login} className="mx-auto max-w-md space-y-6 border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-black">Partner access</h2>
        <p className="text-sm text-neutral-600">
          Enter the access key for <strong>{displayName}</strong>. Contact Way2Go if you need a new key.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Access key</span>
          <input
            type="password"
            autoComplete="current-password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            className="min-h-[44px] w-full border border-neutral-300 px-3 text-black outline-none focus:border-black"
            required
          />
        </label>
        {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
        <button type="submit" className="w-full min-h-[48px] bg-black text-sm font-semibold text-white">
          Continue
        </button>
      </form>
    );
  }

  return (
    <div className="relative w-full">
      {creditInfo ? (
        <div className="mb-8 border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Account credit (EUR)</p>
          <p className="mt-2 text-xl font-light tabular-nums text-black">
            {formatMoneyAmount(creditInfo.available, creditInfo.currency, bookingLocale)} available
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Used {formatMoneyAmount(creditInfo.currentUsage, creditInfo.currency, bookingLocale)} of{" "}
            {formatMoneyAmount(creditInfo.creditLimit, creditInfo.currency, bookingLocale)}
          </p>
          {creditInfo.totalCommissionsEarned != null ? (
            <p className="mt-3 text-xs text-neutral-600">
              Total commissions earned:{" "}
              <span className="font-medium tabular-nums text-black">
                {formatMoneyAmount(creditInfo.totalCommissionsEarned, creditInfo.currency, bookingLocale)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {bookingComplete ? (
        <div className="mb-10 border border-neutral-200 bg-neutral-50 p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Booking confirmed</p>
          {(successCard?.orderReference || successAccount?.orderReference) && (
            <p className="mt-4 text-3xl font-light tracking-tight text-black">
              {successCard?.orderReference ?? successAccount?.orderReference}
            </p>
          )}
          {!successCard?.orderReference && !successAccount?.orderReference && (successCard?.orderId || successAccount?.orderId) && (
            <p className="mt-4 text-lg font-medium tabular-nums text-black">
              ID: {successCard?.orderId ?? successAccount?.orderId}
            </p>
          )}
          <p className="mt-2 text-sm text-neutral-600">
            {successAccount ? "Booked on monthly account — invoiced per your agreement." : "Payment received."}
          </p>
          {successCard?.partnerPricing || successAccount?.partnerPricing ? (
            <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Total retail (guest)</p>
                <p className="text-lg font-medium tabular-nums text-black">
                  {successAccount?.totalRetailFormatted ?? successCard?.totalPaidFormatted}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Your earnings</p>
                <p className="text-lg font-medium tabular-nums text-emerald-900">
                  {successAccount?.partnerEarningsFormatted ??
                    (successCard?.partnerPricing
                      ? formatMoneyAmount(
                          successCard.partnerPricing.partnerEarnings,
                          successCard.partnerPricing.currency,
                          bookingLocale,
                        )
                      : "")}
                </p>
              </div>
            </div>
          ) : (successCard?.totalPaidFormatted || successAccount?.totalFormatted) ? (
            <p className="mt-2 text-sm font-medium tabular-nums text-black">
              {successCard?.totalPaidFormatted ?? successAccount?.totalFormatted}
            </p>
          ) : null}
          {(successCard?.trackingUrl || successAccount?.trackingUrl) && (
            <a
              href={successCard?.trackingUrl ?? successAccount?.trackingUrl}
              className="mt-4 inline-block text-sm text-black underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Track booking
            </a>
          )}
          <button
            type="button"
            className="mt-6 min-h-[44px] border border-black px-4 text-sm font-medium text-black"
            onClick={() => {
              setSuccessCard(null);
              setSuccessAccount(null);
            }}
          >
            New booking
          </button>
        </div>
      ) : null}

      {!bookingComplete && phase === "form" ? (
        <form onSubmit={loadVehicles} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AddressAutocompleteInput
              label="Pickup"
              value={formData.pickup}
              onChange={(pickup) => setFormData((s) => ({ ...s, pickup }))}
              locale={bookingLocale}
              required
            />
            <AddressAutocompleteInput
              label="Dropoff"
              value={formData.dropoff}
              onChange={(dropoff) => setFormData((s) => ({ ...s, dropoff }))}
              locale={bookingLocale}
              required
            />
            <PartnerInput label="Date" type="date" min={today} value={formData.date} onChange={(v) => setFormData((s) => ({ ...s, date: v }))} required />
            <PartnerInput label="Time" type="time" value={formData.time} onChange={(v) => setFormData((s) => ({ ...s, time: v }))} required />
            <PartnerInput
              label="Passengers"
              type="number"
              min="1"
              value={String(formData.passengers)}
              onChange={(v) => setFormData((s) => ({ ...s, passengers: Number(v || 1) }))}
              required
            />
            <PartnerInput
              label="Luggage"
              type="number"
              min="0"
              value={String(formData.luggage)}
              onChange={(v) => setFormData((s) => ({ ...s, luggage: Number(v || 0) }))}
              required
            />
          </div>

          <PartnerInput label="Flight (optional)" value={formData.flight} onChange={(v) => setFormData((s) => ({ ...s, flight: v }))} />
          <PartnerInput label="Passenger name" value={formData.name} onChange={(v) => setFormData((s) => ({ ...s, name: v }))} required />
          <PartnerInput label="Email" type="email" value={formData.email} onChange={(v) => setFormData((s) => ({ ...s, email: v }))} required />
          <PartnerInput label="Phone" value={formData.phone} onChange={(v) => setFormData((s) => ({ ...s, phone: v }))} required />

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Internal reference</span>
            <input
              value={internalReference}
              onChange={(e) => setInternalReference(e.target.value)}
              placeholder="Your PMS / reservation ID"
              className="min-h-[44px] w-full border border-neutral-300 px-3 text-black outline-none focus:border-black"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">VIP / special requests</span>
            <textarea
              value={vipRequests}
              onChange={(e) => setVipRequests(e.target.value)}
              rows={3}
              className="w-full border border-neutral-300 px-3 py-2 text-black outline-none focus:border-black"
              placeholder="Preferences, meet & greet, amenities…"
            />
          </label>

          <PartnerInput
            label="Notes (optional)"
            value={formData.notes}
            onChange={(v) => setFormData((s) => ({ ...s, notes: v }))}
          />

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-400 text-black"
              checked={formData.childSeat}
              onChange={(e) => setFormData((s) => ({ ...s, childSeat: e.target.checked }))}
            />
            Child seat
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-400 text-black"
              checked={payOnAccount}
              onChange={(e) => setPayOnAccount(e.target.checked)}
            />
            <span>
              <span className="font-medium text-black">Pay on monthly account</span>
              <span className="mt-1 block text-xs text-neutral-600">No card charge now — booking confirmed at quoted rate, invoiced per agreement.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-neutral-400 text-black"
              checked={gdprAccepted}
              onChange={(e) => setGdprAccepted(e.target.checked)}
            />
            <span>I accept processing of passenger data for this booking.</span>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={isLoading} className="w-full min-h-[52px] bg-black text-sm font-semibold text-white disabled:opacity-50">
            {isLoading ? "Loading…" : "Continue to vehicles"}
          </button>
        </form>
      ) : null}

      {!bookingComplete && phase === "vehicles" ? (
        <div className="space-y-6">
          <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Choose vehicle class</h3>
          {eligLoading ? <p className="text-sm text-neutral-500">Verifying quote and account for this vehicle…</p> : null}
          {eligibility?.success && eligibility.quote?.price != null && eligibility.quote.currency ? (
            <div className="space-y-2 text-sm text-neutral-700">
              <p>
                Way2Go base (CRM):{" "}
                <span className="font-medium tabular-nums text-black">
                  {formatMoneyAmount(Number(eligibility.quote.price), eligibility.quote.currency, bookingLocale)}
                </span>
                {eligibility.canUseAccount ? (
                  <span className="ml-2 text-neutral-500">· Pay on account allowed</span>
                ) : (
                  <span className="ml-2 text-neutral-500">· Card payment only</span>
                )}
              </p>
              {eligibility.partnerPricing ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Guest-facing total</p>
                  <p className="text-xl font-light tabular-nums text-black">
                    {formatMoneyAmount(
                      eligibility.partnerPricing.retailPrice,
                      eligibility.partnerPricing.currency,
                      bookingLocale,
                    )}
                  </p>
                  <p className="mt-2 text-xs text-neutral-600">
                    Your earnings on this trip:{" "}
                    <span className="font-medium tabular-nums text-black">
                      {formatMoneyAmount(
                        eligibility.partnerPricing.partnerEarnings,
                        eligibility.partnerPricing.currency,
                        bookingLocale,
                      )}
                    </span>
                    <span className="text-neutral-500">
                      {" "}
                      · {eligibility.partnerPricing.pricingModel} · {eligibility.partnerPricing.commissionRatePercent}%
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <VehicleClassSelector
            options={vehicleOptions}
            selected={selectedVehicle}
            onSelect={setSelectedVehicle}
            locale={bookingLocale}
            labels={vehicleLabels}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="min-h-[44px] border border-neutral-300 px-4 text-sm"
              onClick={() => {
                setPhase("form");
                setError("");
              }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={isLoading || !selectedVehicle}
              className="min-h-[52px] flex-1 bg-black text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void continueFromVehicles()}
            >
              {isLoading
                ? "Processing…"
                : payOnAccount
                  ? "Confirm on account"
                  : "Continue to payment"}
            </button>
          </div>
        </div>
      ) : null}

      {!bookingComplete && phase === "payment" && checkoutSession && pendingPayload && stripePromise ? (
        <div className="space-y-6">
          <div className="border-b border-neutral-200 pb-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Total retail (guest pays)</p>
            <p className="text-3xl font-light tabular-nums text-black">{guestRetailDisplay}</p>
            {checkoutEarningsDisplay ? (
              <p className="mt-2 text-sm text-neutral-600">
                Your earnings: <span className="font-medium tabular-nums text-black">{checkoutEarningsDisplay}</span>
              </p>
            ) : null}
          </div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: checkoutSession.clientSecret,
              appearance: elementsAppearance,
            }}
            key={checkoutSession.clientSecret}
          >
            <PartnerCheckoutPaymentStep
              slug={slug}
              paymentIntentId={checkoutSession.paymentIntentId}
              payload={pendingPayload}
              vehicleType={selectedVehicle}
              internalReference={internalReference}
              vipRequests={vipRequests}
              labels={{ pay: "Pay now", processing: "Processing…", back: "Back" }}
              onSuccess={(data) => handlePaidSuccessRef.current(data)}
              onBack={() => {
                setPhase("vehicles");
                setCheckoutSession(null);
                setError("");
                try {
                  sessionStorage.removeItem(checkoutStorageKey(slug));
                } catch {
                  /* ignore */
                }
              }}
            />
          </Elements>
        </div>
      ) : null}
    </div>
  );
}

function PartnerInput({
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
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</span>
      <input
        className="min-h-[44px] w-full border border-neutral-300 px-3 text-black outline-none focus:border-black"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        min={min}
        step={step}
      />
    </label>
  );
}
