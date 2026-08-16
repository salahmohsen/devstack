import { describe, expect, it } from "vitest";

import { comparableMonthlyPay } from "#@/job-preference/salary-compare";

describe("comparableMonthlyPay §6.4", () => {
  it("returns null when pay is unknown", () => {
    expect(comparableMonthlyPay({})).toBeNull();
    expect(comparableMonthlyPay({ salaryRange: "competitive" })).toBeNull();
  });

  it("treats structured amount < 15_000 with no period as unknown", () => {
    expect(comparableMonthlyPay({ salaryMin: 8_000, salaryCurrency: "USD" })).toBeNull();
    expect(comparableMonthlyPay({ salaryMin: 14_999, salaryCurrency: "usd" })).toBeNull();
  });

  it("treats structured amount ≥ 15_000 with no period as annual / 12", () => {
    expect(comparableMonthlyPay({ salaryMin: 15_000, salaryCurrency: "usd" })).toEqual({
      monthly: 1_250,
      currency: "USD"
    });
    expect(comparableMonthlyPay({ salaryMin: 60_000, salaryCurrency: "USD" })).toEqual({
      monthly: 5_000,
      currency: "USD"
    });
  });

  it("uses explicit period tokens on salaryRange", () => {
    expect(comparableMonthlyPay({ salaryRange: "2000 USD/mo" })).toEqual({
      monthly: 2_000,
      currency: "USD"
    });
    expect(comparableMonthlyPay({ salaryRange: "$4,000 per month" })).toEqual({
      monthly: 4_000,
      currency: "USD"
    });
    expect(comparableMonthlyPay({ salaryRange: "60,000 USD/yr" })).toEqual({
      monthly: 5_000,
      currency: "USD"
    });
    expect(comparableMonthlyPay({ salaryRange: "50k/year USD" })).toEqual({
      monthly: 50_000 / 12,
      currency: "USD"
    });
    expect(comparableMonthlyPay({ salaryRange: "48000 EUR per annum" })).toEqual({
      monthly: 4_000,
      currency: "EUR"
    });
  });

  it("uses structured salaryPeriod when the range has no period token", () => {
    expect(
      comparableMonthlyPay({
        salaryMin: 2_000,
        salaryCurrency: "USD",
        salaryPeriod: "month"
      })
    ).toEqual({ monthly: 2_000, currency: "USD" });
    expect(
      comparableMonthlyPay({
        salaryMin: 48_000,
        salaryCurrency: "EUR",
        salaryPeriod: "year"
      })
    ).toEqual({ monthly: 4_000, currency: "EUR" });
  });

  it("does not invent a monthly amount when currency is missing", () => {
    expect(comparableMonthlyPay({ salaryMin: 60_000, salaryPeriod: "year" })).toBeNull();
  });
});
