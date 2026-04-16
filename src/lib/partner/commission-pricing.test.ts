import { describe, expect, it } from "vitest";
import { computePartnerCommissionBreakdown } from "@/lib/partner/commission-pricing";

describe("computePartnerCommissionBreakdown", () => {
  it("applies markup retail and earnings", () => {
    const b = computePartnerCommissionBreakdown(100, 10, "MARKUP");
    expect(b.retailPrice).toBeCloseTo(110, 10);
    expect(b.partnerEarnings).toBeCloseTo(10, 10);
    expect(b.netDueToWay2Go).toBe(100);
    expect(b.crmPrice).toBe(100);
  });

  it("keeps retail on net model and splits settlement", () => {
    const b = computePartnerCommissionBreakdown(100, 10, "NET_PRICE");
    expect(b.retailPrice).toBe(100);
    expect(b.partnerEarnings).toBe(10);
    expect(b.netDueToWay2Go).toBe(90);
  });
});
