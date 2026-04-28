"use client";

import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { CheckoutCompleteSuccess } from "@/lib/transfercrm/types";

export interface CheckoutPaymentLabels {
  pay: string;
  processing: string;
  back: string;
}

interface CheckoutPaymentStepProps {
  paymentIntentId: string;
  fiscalName?: string;
  fiscalVat?: string;
  labels: CheckoutPaymentLabels;
  onSuccess: (data: CheckoutCompleteSuccess) => void;
  onBack: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollCheckoutStatus(paymentIntentId: string): Promise<CheckoutCompleteSuccess | null> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `/api/checkout/status/?payment_intent=${encodeURIComponent(paymentIntentId)}`,
      { method: "GET" },
    );
    const data = (await res.json().catch(() => null)) as
      | { state?: string; message?: string; booking?: CheckoutCompleteSuccess }
      | null;

    if (!data || typeof data !== "object") {
      await sleep(1000);
      continue;
    }

    if (data.state === "failed") {
      return null;
    }

    if (data.state === "ready" && data.booking && data.booking.success === true) {
      return data.booking;
    }

    await sleep(1000);
  }
  return null;
}

export function CheckoutPaymentStep({
  paymentIntentId,
  fiscalName,
  fiscalVat,
  labels,
  onSuccess,
  onBack,
}: CheckoutPaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);

    if (!stripe || !elements || !paymentIntentId) {
      setMsg("Stripe checkout nao esta disponivel.");
      setBusy(false);
      return;
    }

    const returnUrl =
      typeof window !== "undefined"
        ? (() => {
            const first = window.location.pathname.split("/").filter(Boolean)[0];
            const locale = first === "pt" || first === "en" ? first : "pt";
            return `${window.location.origin}/${locale}/checkout/success/`;
          })()
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

    setMsg(labels.processing);
    const confirmed = await pollCheckoutStatus(paymentIntentId);
    if (!confirmed) {
      setMsg(
        "Payment received but confirmation is delayed. If the charge appears on your statement, contact us with your email and trip details.",
      );
      setBusy(false);
      return;
    }

    onSuccess(confirmed);
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Fiscal Name</span>
          <input
            type="text"
            value={fiscalName ?? ""}
            readOnly
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">NIF / VAT</span>
          <input
            type="text"
            value={fiscalVat ?? ""}
            readOnly
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
          />
        </label>
      </div>
      {/* <PaymentElement options={{ layout: "tabs" }} /> */}
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

interface ManualCheckoutPaymentStepProps {
  fiscalName?: string;
  fiscalVat?: string;
  labels: CheckoutPaymentLabels;
  onConfirm: () => Promise<CheckoutCompleteSuccess | null>;
  onSuccess: (data: CheckoutCompleteSuccess) => void;
  onBack: () => void;
}

export function ManualCheckoutPaymentStep({
  fiscalName,
  fiscalVat,
  labels,
  onConfirm,
  onSuccess,
  onBack,
}: ManualCheckoutPaymentStepProps) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const result = await onConfirm();
    if (!result) {
      setMsg("Nao foi possivel confirmar a reserva pendente.");
      setBusy(false);
      return;
    }
    onSuccess(result);
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Fiscal Name</span>
          <input
            type="text"
            value={fiscalName ?? ""}
            readOnly
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">NIF / VAT</span>
          <input
            type="text"
            value={fiscalVat ?? ""}
            readOnly
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
          />
        </label>
      </div>
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
          disabled={busy}
          className="sm:min-w-[200px] bg-black text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-60"
        >
          {busy ? labels.processing : "Confirmar Reserva"}
        </button>
      </div>
    </form>
  );
}
