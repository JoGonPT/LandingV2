import { describe, expect, it } from "vitest";
import { buildTransferCrmAuthHeaders } from "@/lib/transfercrm/config";

describe("buildTransferCrmAuthHeaders", () => {
  it("builds bearer header", () => {
    expect(buildTransferCrmAuthHeaders({ mode: "bearer", token: "abc" })).toEqual({
      Authorization: "Bearer abc",
    });
  });

  it("builds X-API-Key header", () => {
    expect(buildTransferCrmAuthHeaders({ mode: "x_api_key", apiKey: "k" })).toEqual({
      "X-API-Key": "k",
    });
  });

  it("builds ApiKey authorization", () => {
    expect(buildTransferCrmAuthHeaders({ mode: "authorization_api_key", apiKey: "k" })).toEqual({
      Authorization: "ApiKey k",
    });
  });

  it("builds Basic authorization", () => {
    const h = buildTransferCrmAuthHeaders({ mode: "basic", apiKey: "u", apiSecret: "p" });
    expect(h.Authorization).toMatch(/^Basic /);
  });
});
