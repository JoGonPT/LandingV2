import type { FiscalIssueInvoiceInput, FiscalIssueInvoiceResult, IFiscalProvider } from "@/modules/booking-engine/services/fiscal.service";

type VendusMode = "PRODUCTION" | "MOCK";

interface VendusDocumentItem {
  reference: string;
  title: string;
  qty: number;
  gross_price: number;
  tax_exemption_reason?: string;
}

interface VendusDocumentPayload {
  external_id: string;
  type: "FT";
  date: string;
  due_date?: string;
  customer: {
    name: string;
    email: string;
  };
  items: VendusDocumentItem[];
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
  return custom || "https://www.vendus.pt/ws/v1.1";
}

function buildServiceDescription(input: FiscalIssueInvoiceInput): string {
  return `Servico de Transporte: ${input.pickup} -> ${input.dropoff}`;
}

function buildPayload(input: FiscalIssueInvoiceInput): VendusDocumentPayload {
  const serviceDescription = buildServiceDescription(input);
  return {
    external_id: input.externalReference,
    type: "FT",
    date: input.issuedAtIso.slice(0, 10),
    customer: {
      name: input.customerName,
      email: input.customerEmail,
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
  };
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
    const response = await fetch(`${getBaseUrl()}/documents/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Vendus invoice request failed with HTTP ${response.status}: ${body}`);
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

