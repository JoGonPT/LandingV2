import { describe, expect, it } from "vitest";
import { firstTransferCrmValidationMessage, formatTransferCrmValidationMessages } from "@/lib/transfercrm/validation-errors";

describe("validation-errors", () => {
  it("formats field messages", () => {
    const text = formatTransferCrmValidationMessages({
      pickup_date: ["The pickup date must be in the future."],
    });
    expect(text).toContain("pickup_date:");
  });

  it("returns first message", () => {
    expect(
      firstTransferCrmValidationMessage({
        a: ["first"],
        b: ["second"],
      }),
    ).toBe("first");
  });
});
