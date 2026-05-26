"use client";

import { useState, useMemo, useRef, useEffect } from "react";

// ============================================================================
// TYPES
// ============================================================================

type Lang = "pt" | "en";
type VehicleType = "berlina" | "van" | "doubleVan" | "onRequest";

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

interface ExtrasState {
  cadeiraBebe: number;
  cadeiraCrianca: number;
  assentoBooster: number;
}

// ============================================================================
// DICTIONARY — 100% bilingue, mercado de chauffeur e transferes executivos
// ============================================================================

const DICT = {
  pt: {
    switchLang: "Mudar para inglês",

    routeGroup:    "Rota",
    dateGroup:     "Data e Hora",
    capacityGroup: "Capacidade",
    extrasGroup:   "Extras",
    contactGroup:  "Dados de Contacto",

    pickup:   "Local de Recolha",
    dropoff:  "Local de Destino",
    date:     "Data de Recolha",
    time:     "Hora de Recolha",
    passengers: "Passageiros",
    luggage:    "Bagagem",
    name:     "Nome Completo",
    phone:    "Telefone / WhatsApp",
    email:    "Endereço de E-mail",

    pickupPlaceholder:  "Ex: Aeroporto de Lisboa (LIS)",
    dropoffPlaceholder: "Ex: Four Seasons Hotel, Lisboa",
    namePlaceholder:    "O seu nome completo",
    phonePlaceholder:   "+351 9XX XXX XXX",
    emailPlaceholder:   "o.seu@email.com",

    cadeiraBebe:       "Cadeira de Bebé",
    cadeiraBebeSub:    "0 – 9 kg",
    cadeiraCrianca:    "Cadeira de Criança",
    cadeiraCriancaSub: "9 – 18 kg",
    assentoBooster:    "Assento Elevatório",
    assentoBoosterSub: "Booster Seat · máx. 2",

    decrement: (label: string) => `Diminuir ${label}`,
    increment: (label: string) => `Aumentar ${label}`,

    vehicleLabel: "Veículo Sugerido",
    vehicles: {
      berlina: {
        name: "Berlina Executiva",
        capacity: "Até 4 passageiros · 3 malas",
      },
      van: {
        name: "Van Executiva",
        capacity: "Até 7 passageiros · 7 malas",
      },
      doubleVan: {
        name: "Duas Vans Executivas",
        note: "Em substituição de Minibus",
        capacity: "Até 14 passageiros · 14 malas",
      },
      onRequest: {
        name: "Sob Consulta",
        headline: "Grupo Grande ou Necessidades Especiais",
        body: "Para mais de 14 passageiros ou 14 volumes de bagagem, contacte-nos para uma proposta à medida.",
      },
    },

    submit:    "Solicitar Orçamento",
    submitting: "A enviar…",

    onRequestContact: "Para grupos ou serviços especiais, fale connosco:",
    onRequestEmail:   "geral@way2go.pt",

    successHeading: "Pedido Recebido",
    successBody:
      "Recebemos o seu pedido de orçamento. A nossa equipa entrará em contacto brevemente.",

    errorNetwork:
      "Sem ligação ao servidor. Verifique a sua rede e tente novamente.",
    errorServer:
      "Ocorreu um erro ao enviar o pedido. Por favor, tente novamente ou contacte-nos diretamente.",
  },

  en: {
    switchLang: "Switch to Portuguese",

    routeGroup:    "Route",
    dateGroup:     "Date & Time",
    capacityGroup: "Capacity",
    extrasGroup:   "Extras",
    contactGroup:  "Contact Details",

    pickup:   "Pick-up Location",
    dropoff:  "Drop-off Location",
    date:     "Pick-up Date",
    time:     "Pick-up Time",
    passengers: "Passengers",
    luggage:    "Luggage",
    name:     "Full Name",
    phone:    "Phone / WhatsApp",
    email:    "Email Address",

    pickupPlaceholder:  "e.g. Lisbon Airport (LIS)",
    dropoffPlaceholder: "e.g. Four Seasons Hotel, Lisbon",
    namePlaceholder:    "Your full name",
    phonePlaceholder:   "+351 9XX XXX XXX",
    emailPlaceholder:   "your@email.com",

    cadeiraBebe:       "Baby Seat",
    cadeiraBebeSub:    "0 – 9 kg",
    cadeiraCrianca:    "Child Seat",
    cadeiraCriancaSub: "9 – 18 kg",
    assentoBooster:    "Booster Seat",
    assentoBoosterSub: "Max. 2 per booking",

    decrement: (label: string) => `Decrease ${label}`,
    increment: (label: string) => `Increase ${label}`,

    vehicleLabel: "Suggested Vehicle",
    vehicles: {
      berlina: {
        name: "Executive Sedan",
        capacity: "Up to 4 passengers · 3 bags",
      },
      van: {
        name: "Executive Van",
        capacity: "Up to 7 passengers · 7 bags",
      },
      doubleVan: {
        name: "Two Executive Vans",
        note: "Instead of Minibus",
        capacity: "Up to 14 passengers · 14 bags",
      },
      onRequest: {
        name: "On Request",
        headline: "Large Group or Special Needs",
        body: "For more than 14 passengers or 14 pieces of luggage, please contact us for a tailored proposal.",
      },
    },

    submit:    "Request a Quote",
    submitting: "Sending…",

    onRequestContact: "For groups or special services, reach us at:",
    onRequestEmail:   "geral@way2go.pt",

    successHeading: "Request Received",
    successBody:
      "We've received your quote request. Our team will be in touch shortly.",

    errorNetwork:
      "Unable to reach the server. Please check your connection and try again.",
    errorServer:
      "Something went wrong while sending your request. Please try again or contact us directly.",
  },
} as const;

// ============================================================================
// VEHICLE LOGIC
// Limites revistos: Berlina ≤4pax/3 malas · Van ≤7/7 · 2 Vans ≤14/14 · Consulta >14
// ============================================================================

function inferVehicle(passengers: number, luggage: number): VehicleType {
  if (passengers > 14 || luggage > 14) return "onRequest";
  if (passengers > 7  || luggage > 7)  return "doubleVan";
  if (passengers > 4  || luggage > 3)  return "van";
  return "berlina";
}

// Lookup seguro sem indexação por tipo union — evita erros de TS com `as const`
function resolveVehicleDisplay(
  type: VehicleType,
  t: (typeof DICT)[Lang],
): { name: string; secondary: string | null } {
  switch (type) {
    case "berlina":
      return { name: t.vehicles.berlina.name, secondary: t.vehicles.berlina.capacity };
    case "van":
      return { name: t.vehicles.van.name, secondary: t.vehicles.van.capacity };
    case "doubleVan":
      return {
        name: t.vehicles.doubleVan.name,
        secondary: `${t.vehicles.doubleVan.note} · ${t.vehicles.doubleVan.capacity}`,
      };
    case "onRequest":
      return { name: t.vehicles.onRequest.name, secondary: null };
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// ── Language switcher ────────────────────────────────────────────────────────

function LangSwitcher({
  lang,
  onSwitch,
  ariaLabel,
}: {
  lang: Lang;
  onSwitch: (l: Lang) => void;
  ariaLabel: string;
}) {
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
            lang === l ? "bg-black text-white shadow-sm" : "text-neutral-500 hover:text-black",
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

// ── Text input class ─────────────────────────────────────────────────────────

const inputCls =
  "min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-black";

// ── Place autocomplete input ──────────────────────────────────────────────────
//
// Usa o proxy server-side /api/places/autocomplete (Google Places API v1)
// restrito a PT + ES via PLACES_COUNTRIES env var — a chave nunca é exposta
// ao cliente, pelo que não é necessário NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.

interface Suggestion {
  id: string;
  label: string;
}

interface PlaceInputProps {
  label: string;
  placeholder: string;
  value: string;
  locale: Lang;
  required?: boolean;
  onChange: (value: string) => void;
}

function PlaceInput({
  label,
  placeholder,
  value,
  locale,
  required = false,
  onChange,
}: PlaceInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: dispara fetch 300 ms após o utilizador parar de escrever
  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(q)}&locale=${locale}`,
        );
        const data = await res.json().catch(() => null) as
          | { success?: boolean; suggestions?: Suggestion[] }
          | null;
        if (data?.success && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          setOpen(data.suggestions.length > 0);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, locale]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        inputRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleSelect(s: Suggestion) {
    onChange(s.label);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <FieldLabel>{label}</FieldLabel>
      <input
        ref={inputRef}
        type="text"
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.trim().length < 3) setOpen(false);
        }}
        className={inputCls}
      />

      {/* Dropdown de sugestões */}
      {open && (suggestions.length > 0 || loading) && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-md"
        >
          {loading && (
            <p className="px-3 py-2.5 text-xs text-neutral-400">…</p>
          )}
          {!loading && (
            <ul className="max-h-52 overflow-auto">
              {suggestions.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    // onMouseDown previne que o blur do input feche o dropdown
                    // antes do click ser registado
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(s);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-black transition-colors hover:bg-neutral-50"
                  >
                    <svg
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Counter ──────────────────────────────────────────────────────────────────

interface CounterProps {
  label: string;
  subLabel?: string;
  value: number;
  min?: number;
  max?: number;
  ariaDecrement: string;
  ariaIncrement: string;
  onChange: (v: number) => void;
}

function Counter({
  label,
  subLabel,
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
      <div>
        <FieldLabel>{label}</FieldLabel>
        {subLabel && (
          <span className="-mt-1 mb-1 block text-[10px] leading-none text-neutral-400">
            {subLabel}
          </span>
        )}
      </div>
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

// ── Vehicle icons ─────────────────────────────────────────────────────────────
// berlina → sedan · van + doubleVan → minivan (o texto diferencia os casos)

function IconSedan() {
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

function IconVan() {
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

// ── Success ──────────────────────────────────────────────────────────────────

function SuccessMessage({ heading, body }: { heading: string; body: string }) {
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
// ENDPOINT
// ============================================================================

// Define NEXT_PUBLIC_WP_API_URL=https://wp.way2go.pt em .env.local / Vercel env vars
const WP_ENDPOINT =
  (process.env.NEXT_PUBLIC_WP_API_URL ?? "") + "/wp-json/way2go/v1/orcamento";

// ============================================================================
// MAIN EXPORT
// ============================================================================

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

  const [extras, setExtras] = useState<ExtrasState>({
    cadeiraBebe: 0,
    cadeiraCrianca: 0,
    assentoBooster: 0,
  });

  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);

  const t           = DICT[lang];
  const vehicleType = useMemo(() => inferVehicle(form.passengers, form.luggage), [form.passengers, form.luggage]);
  const isOnRequest = vehicleType === "onRequest";
  const todayISO    = new Date().toISOString().split("T")[0];

  // Informação de display calculada de forma type-safe
  const vehicleDisplay = useMemo(() => resolveVehicleDisplay(vehicleType, t), [vehicleType, t]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setExtra<K extends keyof ExtrasState>(key: K, value: number) {
    setExtras((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isOnRequest || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      // Rota e timing
      pickup:   form.pickup,
      dropoff:  form.dropoff,
      dateTime: `${form.date}T${form.time}`,   // "2025-06-15T14:30"
      // Capacidade
      passageiros: form.passengers,
      bagagem:     form.luggage,
      // Extras
      cadeiraBebe:    extras.cadeiraBebe,
      cadeiraCrianca: extras.cadeiraCrianca,
      assentoBooster: extras.assentoBooster,
      // Veículo sugerido — chave interna + label localizado
      veiculo:      vehicleType,
      veiculoLabel: vehicleDisplay.name,
      // Contacto
      name:  form.name,
      email: form.email,
      phone: form.phone,
      // Meta
      idioma: lang,
    };

    try {
      const res = await fetch(WP_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data?.message ?? `HTTP ${res.status}`);
      }

      setSubmitted(true);
    } catch (err) {
      const isNetworkFailure = err instanceof TypeError;
      setSubmitError(isNetworkFailure ? t.errorNetwork : t.errorServer);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <SuccessMessage heading={t.successHeading} body={t.successBody} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* ── Language switcher ──────────────────────────────────────────── */}
      <div className="flex justify-end">
        <LangSwitcher lang={lang} onSwitch={setLang} ariaLabel={t.switchLang} />
      </div>

      {/* ── Rota ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlaceInput
          label={t.pickup}
          placeholder={t.pickupPlaceholder}
          value={form.pickup}
          locale={lang}
          required
          onChange={(v) => setField("pickup", v)}
        />
        <PlaceInput
          label={t.dropoff}
          placeholder={t.dropoffPlaceholder}
          value={form.dropoff}
          locale={lang}
          required
          onChange={(v) => setField("dropoff", v)}
        />
      </div>

      {/* ── Data e Hora ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel>{t.date}</FieldLabel>
          <input
            type="date"
            required
            min={todayISO}
            value={form.date}
            onChange={(e) => setField("date", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <FieldLabel>{t.time}</FieldLabel>
          <input
            type="time"
            required
            value={form.time}
            onChange={(e) => setField("time", e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* ── Capacidade ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
          {t.capacityGroup}
        </p>
        <div className="grid grid-cols-2 gap-6">
          <Counter
            label={t.passengers}
            value={form.passengers}
            min={1}
            max={18}
            ariaDecrement={t.decrement(t.passengers)}
            ariaIncrement={t.increment(t.passengers)}
            onChange={(v) => setField("passengers", v)}
          />
          <Counter
            label={t.luggage}
            value={form.luggage}
            min={0}
            max={18}
            ariaDecrement={t.decrement(t.luggage)}
            ariaIncrement={t.increment(t.luggage)}
            onChange={(v) => setField("luggage", v)}
          />
        </div>
      </div>

      {/* ── Extras ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
          {t.extrasGroup}
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Counter
            label={t.cadeiraBebe}
            subLabel={t.cadeiraBebeSub}
            value={extras.cadeiraBebe}
            min={0}
            max={4}
            ariaDecrement={t.decrement(t.cadeiraBebe)}
            ariaIncrement={t.increment(t.cadeiraBebe)}
            onChange={(v) => setExtra("cadeiraBebe", v)}
          />
          <Counter
            label={t.cadeiraCrianca}
            subLabel={t.cadeiraCriancaSub}
            value={extras.cadeiraCrianca}
            min={0}
            max={4}
            ariaDecrement={t.decrement(t.cadeiraCrianca)}
            ariaIncrement={t.increment(t.cadeiraCrianca)}
            onChange={(v) => setExtra("cadeiraCrianca", v)}
          />
          <Counter
            label={t.assentoBooster}
            subLabel={t.assentoBoosterSub}
            value={extras.assentoBooster}
            min={0}
            max={2}
            ariaDecrement={t.decrement(t.assentoBooster)}
            ariaIncrement={t.increment(t.assentoBooster)}
            onChange={(v) => setExtra("assentoBooster", v)}
          />
        </div>
      </div>

      {/* ── Veículo Sugerido ──────────────────────────────────────────── */}
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
                {t.vehicles.onRequest.name} — {t.vehicles.onRequest.headline}
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                {t.vehicles.onRequest.body}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Ícone: berlina → sedan · van/doubleVan → minivan */}
            <div className="flex flex-shrink-0 items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black transition-all duration-300">
                {vehicleType === "berlina" ? <IconSedan /> : <IconVan />}
              </div>
              {vehicleType === "doubleVan" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black">
                  <IconVan />
                </div>
              )}
            </div>
            <div className="transition-all duration-200">
              <p className="font-semibold text-black">{vehicleDisplay.name}</p>
              {vehicleDisplay.secondary && (
                <p className="text-xs text-neutral-500">{vehicleDisplay.secondary}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dados de Contacto ─────────────────────────────────────────── */}
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
              onChange={(e) => setField("name", e.target.value)}
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
              onChange={(e) => setField("phone", e.target.value)}
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
            onChange={(e) => setField("email", e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {/* ── Submissão ─────────────────────────────────────────────────── */}
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

      {/* ── Nudge "Sob Consulta" ───────────────────────────────────────── */}
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
