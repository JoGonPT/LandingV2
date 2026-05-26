"use client";

import { useState, useMemo } from "react";

// ============================================================================
// TYPES
// ============================================================================

type Lang = "pt" | "en";
type VehicleType = "berlina" | "minivan" | "onRequest";

interface FormState {
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  name: string;
  email: string;
  phone: string;
}

// ============================================================================
// DICTIONARY — 100% bilingual, executive chauffeur & transfer market register
// ============================================================================

const DICT = {
  pt: {
    // Language switcher aria
    switchLang: "Mudar para inglês",

    // Section header
    sectionEyebrow: "Transferes Executivos",
    sectionHeading: "Peça o seu Orçamento",
    sectionSubheading:
      "Serviço de chauffeur privado para aeroportos, hotéis e eventos corporativos em todo o território nacional.",

    // Form groups
    routeGroup: "Rota",
    dateGroup: "Data e Hora",
    capacityGroup: "Capacidade",
    contactGroup: "Dados de Contacto",

    // Fields — labels
    pickup: "Local de Recolha",
    dropoff: "Local de Destino",
    date: "Data de Recolha",
    time: "Hora de Recolha",
    passengers: "Passageiros",
    luggage: "Bagagem",
    name: "Nome Completo",
    phone: "Telefone / WhatsApp",
    email: "Endereço de E-mail",

    // Fields — placeholders
    pickupPlaceholder: "Ex: Aeroporto de Lisboa (LIS)",
    dropoffPlaceholder: "Ex: Four Seasons Hotel, Lisboa",
    namePlaceholder: "O seu nome completo",
    phonePlaceholder: "+351 9XX XXX XXX",
    emailPlaceholder: "o.seu@email.com",

    // Counter aria
    decrement: (label: string) => `Diminuir ${label}`,
    increment: (label: string) => `Aumentar ${label}`,

    // Vehicle card
    vehicleLabel: "Veículo Sugerido",
    vehicles: {
      berlina: {
        name: "Berlina Executiva",
        example: "Tesla Model S · Mercedes-Benz Classe E · BMW Série 5",
      },
      minivan: {
        name: "Minivan Executiva",
        example: "Mercedes-Benz Classe V · Vito · Volkswagen Caravelle",
      },
      onRequest: {
        name: "Sob Consulta",
        headline: "Grupo Grande ou Necessidades Especiais",
        body: "Para mais de 8 passageiros ou 8 volumes de bagagem, contacte-nos para uma proposta à medida.",
      },
    },

    // CTA
    submit: "Solicitar Orçamento",
    submitting: "A enviar…",

    // On-request contact nudge
    onRequestContact: "Para grupos ou serviços especiais, fale connosco:",
    onRequestEmail: "geral@way2go.pt",

    // Success state
    successHeading: "Pedido Recebido",
    successBody:
      "Recebemos o seu pedido de orçamento. A nossa equipa entrará em contacto brevemente.",

    // Estados de erro
    errorNetwork:
      "Sem ligação ao servidor. Verifique a sua rede e tente novamente.",
    errorServer:
      "Ocorreu um erro ao enviar o pedido. Por favor, tente novamente ou contacte-nos diretamente.",
  },

  en: {
    // Language switcher aria
    switchLang: "Switch to Portuguese",

    // Section header
    sectionEyebrow: "Executive Transfers",
    sectionHeading: "Request a Quote",
    sectionSubheading:
      "Private chauffeur service to airports, hotels and corporate events across Portugal.",

    // Form groups
    routeGroup: "Route",
    dateGroup: "Date & Time",
    capacityGroup: "Capacity",
    contactGroup: "Contact Details",

    // Fields — labels
    pickup: "Pick-up Location",
    dropoff: "Drop-off Location",
    date: "Pick-up Date",
    time: "Pick-up Time",
    passengers: "Passengers",
    luggage: "Luggage",
    name: "Full Name",
    phone: "Phone / WhatsApp",
    email: "Email Address",

    // Fields — placeholders
    pickupPlaceholder: "e.g. Lisbon Airport (LIS)",
    dropoffPlaceholder: "e.g. Four Seasons Hotel, Lisbon",
    namePlaceholder: "Your full name",
    phonePlaceholder: "+351 9XX XXX XXX",
    emailPlaceholder: "your@email.com",

    // Counter aria
    decrement: (label: string) => `Decrease ${label}`,
    increment: (label: string) => `Increase ${label}`,

    // Vehicle card
    vehicleLabel: "Suggested Vehicle",
    vehicles: {
      berlina: {
        name: "Executive Sedan",
        example: "Tesla Model S · Mercedes-Benz E-Class · BMW 5 Series",
      },
      minivan: {
        name: "Executive Minivan",
        example: "Mercedes-Benz V-Class · Vito · Volkswagen Caravelle",
      },
      onRequest: {
        name: "On Request",
        headline: "Large Group or Special Requirements",
        body: "For more than 8 passengers or 8 pieces of luggage, please contact us for a tailored proposal.",
      },
    },

    // CTA
    submit: "Request a Quote",
    submitting: "Sending…",

    // On-request contact nudge
    onRequestContact: "For groups or special services, reach us at:",
    onRequestEmail: "geral@way2go.pt",

    // Success state
    successHeading: "Request Received",
    successBody:
      "We've received your quote request. Our team will be in touch shortly.",

    // Error states
    errorNetwork:
      "Unable to reach the server. Please check your connection and try again.",
    errorServer:
      "Something went wrong while sending your request. Please try again or contact us directly.",
  },
} as const;

// ============================================================================
// VEHICLE LOGIC
// ============================================================================

function inferVehicle(passengers: number, luggage: number): VehicleType {
  if (passengers > 8 || luggage > 8) return "onRequest";
  if (passengers > 4 || luggage > 3) return "minivan";
  return "berlina";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// ── Language switcher ────────────────────────────────────────────────────────

interface LangSwitcherProps {
  lang: Lang;
  onSwitch: (l: Lang) => void;
  ariaLabel: string;
}

function LangSwitcher({ lang, onSwitch, ariaLabel }: LangSwitcherProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
    >
      {(["pt", "en"] as Lang[]).map((l, i) => (
        <button
          key={l}
          type="button"
          onClick={() => onSwitch(l)}
          aria-pressed={lang === l}
          className={[
            "min-w-[2.5rem] rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200",
            i === 0 ? "mr-0.5" : "",
            lang === l
              ? "bg-black text-white shadow-sm"
              : "text-neutral-500 hover:text-black",
          ].join(" ")}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
      {children}
    </span>
  );
}

// ── Text input ───────────────────────────────────────────────────────────────

const inputCls =
  "min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-black";

// ── Counter ──────────────────────────────────────────────────────────────────

interface CounterProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  ariaDecrement: string;
  ariaIncrement: string;
  onChange: (v: number) => void;
}

function Counter({
  label,
  value,
  min = 0,
  max = 12,
  ariaDecrement,
  ariaIncrement,
  onChange,
}: CounterProps) {
  const btnCls =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-lg font-medium text-black transition-colors hover:border-black hover:bg-neutral-50 active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={ariaDecrement}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={btnCls}
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-lg font-semibold tabular-nums text-black">
          {value}
        </span>
        <button
          type="button"
          aria-label={ariaIncrement}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={btnCls}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Vehicle icon ─────────────────────────────────────────────────────────────

function VehicleIcon({ type }: { type: Exclude<VehicleType, "onRequest"> }) {
  if (type === "minivan") {
    return (
      <svg
        className="h-5 w-5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 17h18M5 17V9l2-4h10l2 4v8M7 17a2 2 0 104 0M13 17a2 2 0 104 0M7 9h10"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 17h18M5 17v-5l2-5h10l2 5v5M7 17a2 2 0 104 0M13 17a2 2 0 104 0M6 12h12"
      />
    </svg>
  );
}

// ── Success ──────────────────────────────────────────────────────────────────

function SuccessMessage({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black">
        <svg
          className="h-7 w-7 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-black">{heading}</h3>
      <p className="text-sm leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

// URL base do WordPress — define NEXT_PUBLIC_WP_API_URL no ficheiro .env.local
// Exemplo: NEXT_PUBLIC_WP_API_URL=https://wp.way2go.pt
const WP_ENDPOINT =
  (process.env.NEXT_PUBLIC_WP_API_URL ?? "") +
  "/wp-json/way2go/v1/orcamento";

export function QuickQuoteForm() {
  const [lang, setLang] = useState<Lang>("pt");
  const [form, setForm] = useState<FormState>({
    pickup: "",
    dropoff: "",
    date: "",
    time: "",
    passengers: 1,
    luggage: 1,
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const t = DICT[lang];
  const vehicleType = useMemo(
    () => inferVehicle(form.passengers, form.luggage),
    [form.passengers, form.luggage],
  );
  const isOnRequest = vehicleType === "onRequest";
  const todayISO = new Date().toISOString().split("T")[0];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isOnRequest || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    // Payload enviado para o endpoint REST do WordPress
    const payload = {
      name:        form.name,
      email:       form.email,
      phone:       form.phone,
      pickup:      form.pickup,
      dropoff:     form.dropoff,
      dateTime:    `${form.date}T${form.time}`, // ISO-like: "2025-06-15T14:30"
      veiculo:     vehicleType,                  // "berlina" | "minivan"
      idioma:      lang,                         // "pt" | "en"
      passageiros: form.passengers,
      bagagem:     form.luggage,
    };

    try {
      const res = await fetch(WP_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        // Tenta extrair a mensagem de erro devolvida pelo WordPress
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data?.message ?? `HTTP ${res.status}`);
      }

      // Sucesso: muda para o estado de confirmação visual
      setSubmitted(true);
    } catch (err) {
      // TypeError indica falha de rede (sem internet, DNS, etc.)
      const isNetworkFailure = err instanceof TypeError;
      setSubmitError(isNetworkFailure ? t.errorNetwork : t.errorServer);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <SuccessMessage heading={t.successHeading} body={t.successBody} />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* ── Language switcher ──────────────────────────────────────────── */}
      <div className="flex justify-end">
        <LangSwitcher
          lang={lang}
          onSwitch={setLang}
          ariaLabel={t.switchLang}
        />
      </div>

      {/* ── Route ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel>{t.pickup}</FieldLabel>
          <input
            type="text"
            required
            placeholder={t.pickupPlaceholder}
            value={form.pickup}
            onChange={(e) => set("pickup", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <FieldLabel>{t.dropoff}</FieldLabel>
          <input
            type="text"
            required
            placeholder={t.dropoffPlaceholder}
            value={form.dropoff}
            onChange={(e) => set("dropoff", e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* ── Date & Time ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel>{t.date}</FieldLabel>
          <input
            type="date"
            required
            min={todayISO}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <FieldLabel>{t.time}</FieldLabel>
          <input
            type="time"
            required
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* ── Capacity counters ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="grid grid-cols-2 gap-6">
          <Counter
            label={t.passengers}
            value={form.passengers}
            min={1}
            max={12}
            ariaDecrement={t.decrement(t.passengers)}
            ariaIncrement={t.increment(t.passengers)}
            onChange={(v) => set("passengers", v)}
          />
          <Counter
            label={t.luggage}
            value={form.luggage}
            min={0}
            max={12}
            ariaDecrement={t.decrement(t.luggage)}
            ariaIncrement={t.increment(t.luggage)}
            onChange={(v) => set("luggage", v)}
          />
        </div>
      </div>

      {/* ── Vehicle output card ───────────────────────────────────────── */}
      <div
        className={[
          "rounded-2xl border p-4 transition-all duration-300",
          isOnRequest
            ? "border-amber-200 bg-amber-50"
            : "border-neutral-200 bg-white shadow-sm",
        ].join(" ")}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          {t.vehicleLabel}
        </p>

        {isOnRequest ? (
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div>
              <p className="font-semibold text-amber-800">
                {t.vehicles.onRequest.name} —{" "}
                {t.vehicles.onRequest.headline}
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                {t.vehicles.onRequest.body}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black transition-all duration-300">
              <VehicleIcon type={vehicleType} />
            </div>
            <div className="transition-all duration-200">
              <p className="font-semibold text-black">
                {t.vehicles[vehicleType].name}
              </p>
              <p className="text-xs text-neutral-500">
                {t.vehicles[vehicleType].example}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Contact details ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          {t.contactGroup}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>{t.name}</FieldLabel>
            <input
              type="text"
              required
              placeholder={t.namePlaceholder}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <FieldLabel>{t.phone}</FieldLabel>
            <input
              type="tel"
              required
              placeholder={t.phonePlaceholder}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        <label className="block">
          <FieldLabel>{t.email}</FieldLabel>
          <input
            type="email"
            required
            placeholder={t.emailPlaceholder}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* ── Submit ────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isOnRequest || submitting}
        className="w-full rounded-lg bg-black px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t.submitting : t.submit}
      </button>

      {/* ── Erro de submissão ─────────────────────────────────────────── */}
      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-xs leading-relaxed text-red-700">{submitError}</p>
        </div>
      )}

      {isOnRequest && (
        <p className="text-center text-xs leading-relaxed text-neutral-500">
          {t.onRequestContact}{" "}
          <a
            href={`mailto:${t.onRequestEmail}`}
            className="font-medium text-black underline underline-offset-2 hover:text-neutral-700"
          >
            {t.onRequestEmail}
          </a>
        </p>
      )}
    </form>
  );
}
