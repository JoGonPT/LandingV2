import { describe, expect, it } from "vitest";
import { minorUnitsMatchStripeIntent, toStripeMinorUnits } from "@/lib/checkout/stripe-money";

describe("stripe-money", () => {
  it("converts EUR to cents", () => {
    expect(toStripeMinorUnits(120, "EUR")).toBe(12000);
    expect(toStripeMinorUnits(120.5, "eur")).toBe(12050);
  });

  it("keeps zero-decimal currencies as whole units", () => {
    expect(toStripeMinorUnits(5000, "JPY")).toBe(5000);
  });

  it("compares intent amount", () => {
    expect(minorUnitsMatchStripeIntent(12000, 12000)).toBe(true);
    expect(minorUnitsMatchStripeIntent(12000, 11999)).toBe(false);
    expect(minorUnitsMatchStripeIntent(12000, null)).toBe(false);
  });
});
