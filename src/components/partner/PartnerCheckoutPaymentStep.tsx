"use client";

import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { BookingPayload, CheckoutCompleteSuccess } from "@/lib/transfercrm/types";

export interface PartnerCheckoutLabels {
  pay: string;
  processing: string;
  back: string;
}

interface PartnerCheckoutPaymentStepProps {
  slug: string;
  paymentIntentId: string;
  payload: BookingPayload;
  vehicleType: string;
  internalReference: string;
  vipRequests: string;
  labels: PartnerCheckoutLabels;
  onSuccess: (data: CheckoutCompleteSuccess) => void;
  onBack: () => void;
}

export function PartnerCheckoutPaymentStep({
  slug,
  paymentIntentId,
  payload,
  vehicleType,
  internalReference,
  vipRequests,
  labels,
  onSuccess,
  onBack,
}: PartnerCheckoutPaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function finalizeBooking(): Promise<boolean> {
    const res = await fetch("/api/partner/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        payload,
        vehicleType,
        paymentIntentId,
        internalReference: internalReference.trim() || undefined,
        vipRequests: vipRequests.trim() || undefined,
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | CheckoutCompleteSuccess
      | { success?: false; message?: string }
      | null;
    if (!res.ok || !data || !("success" in data) || data.success !== true) {
      const message =
        data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message
          : "We could not confirm your reservation. If you were charged, contact us.";
      setMsg(message);
      return false;
    }
    onSuccess(data);
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setMsg("");
    setBusy(true);

    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}?checkout=success`
        : "";

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: returnUrl || "https://way2go.pt",
      },
    });

    if (error) {
      setMsg(error.message ?? "Payment could not be completed.");
      setBusy(false);
      return;
    }

    const ok = await finalizeBooking();
    if (!ok) {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] border border-neutral-300 px-4 text-sm text-neutral-900"
          disabled={busy}
        >
          {labels.back}
        </button>
        <button
          type="submit"
          disabled={!stripe || busy}
          className="min-h-[48px] bg-black px-6 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? labels.processing : labels.pay}
        </button>
      </div>
    </form>
  );
}
