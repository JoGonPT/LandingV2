import type { FiscalIssueInvoiceInput, FiscalIssueInvoiceResult, IFiscalProvider } from "@/modules/booking-engine/services/fiscal.service";

type VendusMode = "PRODUCTION" | "MOCK";
type VendusDocumentType = "FR" | "FT";

interface VendusDocumentItem {
  reference: string;
  title: string;
  qty: number;
  gross_price: number;
  tax_exemption_reason?: string;
}

interface VendusDocumentPayload {
  external_id: string;
  type: VendusDocumentType;
  date: string;
  due_date?: string;
  client: {
    name: string;
    email: string;
    fiscal_id?: string;
  };
  items: VendusDocumentItem[];
  payments: Array<{
    date: string;
    value: number;
    method: string;
  }>;
  currency: string;
  observations?: string;
}

function getVendusMode(): VendusMode {
  const raw = String(process.env.VENDUS_MODE ?? "MOCK")
    .trim()
    .toUpperCase();
  return raw === "PRODUCTION" ? "PRODUCTION" : "MOCK";
}

function getApiKey(): string {
  return String(process.env.VENDUS_API_KEY ?? "").trim();
}

function getBaseUrl(): string {
  const custom = String(process.env.VENDUS_BASE_URL ?? "").trim();
  return custom || "https://www.vendus.pt/ws/v1.2";
}

function getDocumentType(): VendusDocumentType {
  const raw = String(process.env.VENDUS_DOCUMENT_TYPE ?? "FR").trim().toUpperCase();
  return raw === "FT" ? "FT" : "FR";
}

function mapPaymentMethod(method: FiscalIssueInvoiceInput["paymentMethod"]): string {
  switch ((method ?? "STRIPE").toUpperCase()) {
    case "CARD":
      return "Cartao Bancario";
    case "BANK_TRANSFER":
      return "Transferencia Bancaria";
    case "CASH":
      return "Numerario";
    default:
      return "Stripe";
  }
}

function normalizeTaxId(input: FiscalIssueInvoiceInput): string | undefined {
  if (!input.customerTaxId) return undefined;
  const digits = input.customerTaxId.replace(/\D/g, "");
  if (digits.length !== 9) {
    console.warn(`[Vendus] Ignoring invalid customerTaxId for booking ${input.bookingId}: "${input.customerTaxId}"`);
    return undefined;
  }
  return digits;
}

function buildServiceDescription(input: FiscalIssueInvoiceInput): string {
  return `Servico de Transporte: ${input.pickup} -> ${input.dropoff}`;
}

function buildPayload(input: FiscalIssueInvoiceInput): VendusDocumentPayload {
  const serviceDescription = buildServiceDescription(input);
  const taxId = normalizeTaxId(input);
  const date = input.issuedAtIso.slice(0, 10);
  return {
    external_id: input.externalReference,
    type: getDocumentType(),
    date,
    client: {
      name: input.customerName,
      email: input.customerEmail,
      ...(taxId ? { fiscal_id: taxId } : {}),
    },
    currency: input.currency,
    observations: `Booking ${input.bookingId} via ${input.provider}`,
    items: [
      {
        reference: "WAY2GO-TRANSPORTE",
        title: serviceDescription,
        qty: 1,
        gross_price: Number(input.amount.toFixed(2)),
      },
    ],
    payments: [
      {
        date,
        value: Number(input.amount.toFixed(2)),
        method: mapPaymentMethod(input.paymentMethod),
      },
    ],
  };
}

class VendusFiscalProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
    public readonly code: "VENDUS_INVALID_NIF" | "VENDUS_REQUEST_FAILED",
  ) {
    super(message);
    this.name = "VendusFiscalProviderError";
  }
}

function extractInvoiceNumber(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const direct = obj.number ?? obj.id ?? obj.reference;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (typeof direct === "number" && Number.isFinite(direct)) return String(direct);
  const document = obj.document;
  if (document && typeof document === "object") {
    const doc = document as Record<string, unknown>;
    const fromDoc = doc.number ?? doc.id ?? doc.reference;
    if (typeof fromDoc === "string" && fromDoc.trim()) return fromDoc.trim();
    if (typeof fromDoc === "number" && Number.isFinite(fromDoc)) return String(fromDoc);
  }
  return null;
}

function extractInvoiceUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  const direct = obj.url ?? obj.permalink;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const document = obj.document;
  if (document && typeof document === "object") {
    const doc = document as Record<string, unknown>;
    const fromDoc = doc.url ?? doc.permalink;
    if (typeof fromDoc === "string" && fromDoc.trim()) return fromDoc.trim();
  }
  return undefined;
}

export class VendusFiscalProvider implements IFiscalProvider {
  readonly name = "VENDUS";

  async issueInvoice(input: FiscalIssueInvoiceInput): Promise<FiscalIssueInvoiceResult> {
    const mode = getVendusMode();
    if (mode === "MOCK") {
      console.info(
        `[Vendus Mock] Seria emitida fatura para o cliente ${input.customerName} com o valor ${input.amount.toFixed(2)} ${input.currency}.`,
      );
      const invoiceNumber = `VENDUS-MOCK-${Date.now()}`;
      return {
        provider: `${this.name}_MOCK`,
        invoiceNumber,
        invoiceUrl: `https://vendus.mock/invoices/${invoiceNumber}`,
        issuedAtIso: input.issuedAtIso,
      };
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("VENDUS_API_KEY is required when VENDUS_MODE=PRODUCTION.");
    }

    const payload = buildPayload(input);
    const response = await fetch(`${getBaseUrl().replace(/\/+$/, "")}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      const code = /nif|fiscal/i.test(body) ? "VENDUS_INVALID_NIF" : "VENDUS_REQUEST_FAILED";
      throw new VendusFiscalProviderError(
        `Vendus invoice request failed with HTTP ${response.status}: ${body}`,
        response.status,
        body,
        code,
      );
    }
    const data = (await response.json()) as unknown;
    const invoiceNumber = extractInvoiceNumber(data);
    if (!invoiceNumber) {
      throw new Error("Vendus response does not include an invoice identifier.");
    }

    return {
      provider: this.name,
      invoiceNumber,
      invoiceUrl: extractInvoiceUrl(data),
      issuedAtIso: input.issuedAtIso,
    };
  }
}

