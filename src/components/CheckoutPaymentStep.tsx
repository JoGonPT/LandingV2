"use client";

import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { BookingPayload, CheckoutCompleteSuccess } from "@/lib/transfercrm/types";
export interface CheckoutPaymentLabels {
  pay: string;
  processing: string;
  back: string;
}

interface CheckoutPaymentStepProps {
  paymentIntentId: string;
  payload: BookingPayload;
  vehicleType: string;
  labels: CheckoutPaymentLabels;
  onSuccess: (data: CheckoutCompleteSuccess) => void;
  onBack: () => void;
}

export function CheckoutPaymentStep({
  paymentIntentId,
  payload,
  vehicleType,
  labels,
  onSuccess,
  onBack,
}: CheckoutPaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function finalizeBooking(): Promise<boolean> {
    const res = await fetch("/api/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, vehicleType, paymentIntentId }),
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
      typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}${window.location.search}` : "";

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
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
          disabled={busy}
        >
          {labels.back}
        </button>
        <button
          type="submit"
          disabled={!stripe || busy}
          className="sm:min-w-[200px] bg-black text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-60"
        >
          {busy ? labels.processing : labels.pay}
        </button>
      </div>
    </form>
  );
}
