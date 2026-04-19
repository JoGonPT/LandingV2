import { afterEach, describe, expect, it, vi } from "vitest";

import { VendusFiscalProvider } from "@/modules/booking-engine/providers/fiscal/vendus.provider";

describe("VendusFiscalProvider", () => {
  afterEach(() => {
    delete process.env.VENDUS_MODE;
    delete process.env.VENDUS_API_KEY;
    delete process.env.VENDUS_BASE_URL;
    vi.restoreAllMocks();
  });

  it("uses mock mode without HTTP request", async () => {
    process.env.VENDUS_MODE = "MOCK";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const provider = new VendusFiscalProvider();

    const result = await provider.issueInvoice({
      bookingId: "bo_test_1",
      provider: "WAY2GO_NATIVE",
      externalReference: "REF-123",
      customerName: "Cliente Teste",
      customerEmail: "cliente@teste.pt",
      amount: 42.75,
      currency: "EUR",
      pickup: "Lisboa",
      dropoff: "Porto",
      issuedAtIso: "2026-04-19T19:00:00.000Z",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      "[Vendus Mock] Seria emitida fatura para o cliente Cliente Teste com o valor 42.75 EUR.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.provider).toBe("VENDUS_MOCK");
    expect(result.invoiceNumber).toContain("VENDUS-MOCK-");
  });

  it("maps invoice item and external_id in production payload", async () => {
    process.env.VENDUS_MODE = "PRODUCTION";
    process.env.VENDUS_API_KEY = "vendus_test_key";
    process.env.VENDUS_BASE_URL = "https://vendus.test/ws/v1.1";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          document: {
            number: "FT 2026/123",
            url: "https://vendus.test/doc/123",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = new VendusFiscalProvider();

    const result = await provider.issueInvoice({
      bookingId: "bo_test_2",
      provider: "TRANSFER_CRM",
      externalReference: "BOOK-EXT-1",
      customerName: "Empresa XPTO",
      customerEmail: "finance@xpto.pt",
      amount: 99.99,
      currency: "EUR",
      pickup: "Aeroporto Lisboa",
      dropoff: "Cascais",
      issuedAtIso: "2026-04-19T19:10:00.000Z",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://vendus.test/ws/v1.1/documents/");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.external_id).toBe("BOOK-EXT-1");
    expect(body.items[0].title).toBe("Servico de Transporte: Aeroporto Lisboa -> Cascais");
    expect(body.items[0].gross_price).toBe(99.99);
    expect(result.invoiceNumber).toBe("FT 2026/123");
    expect(result.invoiceUrl).toBe("https://vendus.test/doc/123");
  });
});
