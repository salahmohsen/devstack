export type SalaryPeriod = "month" | "year" | "day" | "hour";

export type StatedJobPay = {
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriod | null;
};

/** Structured amounts below this with no period are unknown — not guessed as monthly. */
export const ANNUAL_AMOUNT_WITHOUT_PERIOD = 15_000;

const ISO_CURRENCY =
  /\b(USD|EUR|GBP|EGP|SAR|AED|CAD|AUD|CHF|JPY|INR|SEK|NOK|DKK|PLN|BRL|MXN|ZAR|NZD|SGD|HKD|TRY|KWD|QAR|BHD)\b/i;
const YEAR_PERIOD =
  /(?:\/\s*y(?:ea)?r\b|per\s+(?:year|annum)\b|\ba\s+year\b|annually\b|k\/year\b)/i;
const MONTH_PERIOD = /(?:\/\s*mo(?:nth)?\b|per\s+month\b|\ba\s+month\b|monthly\b)/i;
const AMOUNT =
  /(?:USD|EUR|GBP|EGP|SAR|AED|CAD|AUD|\$|€|£)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k)?/i;

function upperCurrency(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function currencyFromRange(range: string): string | null {
  const iso = range.match(ISO_CURRENCY)?.[1];
  if (iso) return iso.toUpperCase();
  if (range.includes("$")) return "USD";
  if (range.includes("€")) return "EUR";
  if (range.includes("£")) return "GBP";
  return null;
}

function periodFromRange(range: string): SalaryPeriod | null {
  if (MONTH_PERIOD.test(range)) return "month";
  if (YEAR_PERIOD.test(range)) return "year";
  if (/(?:\/\s*(?:h|hr|hour)\b|per\s+hour\b|hourly\b)/i.test(range)) return "hour";
  if (/(?:\/\s*day\b|per\s+day\b|daily\b)/i.test(range)) return "day";
  return null;
}

function amountFromRange(range: string): number | null {
  const match = range.match(AMOUNT);
  if (!match?.[1]) return null;
  const raw = Number.parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(raw)) return null;
  const thousands = match[2] != null && match[2].toLowerCase() === "k";
  return thousands ? raw * 1000 : raw;
}

function finiteAmount(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

/**
 * Convert stated pay to monthly in its own currency.
 * Missing currency, unparsable ranges, and < 15_000 with no period are unknown.
 */
export function comparableMonthlyPay(
  pay: StatedJobPay
): { monthly: number; currency: string } | null {
  const range = pay.salaryRange?.trim() ?? "";
  const amount = (range ? amountFromRange(range) : null) ?? finiteAmount(pay.salaryMin);
  const currency = (range ? currencyFromRange(range) : null) ?? upperCurrency(pay.salaryCurrency);
  const period = (range ? periodFromRange(range) : null) ?? pay.salaryPeriod ?? null;
  if (amount == null || currency == null || /period (?:not stated|unknown)/i.test(range)) {
    return null;
  }

  if (period === "month") return { monthly: amount, currency };
  if (period === "year") return { monthly: amount / 12, currency };
  if (period === "day" || period === "hour") return null;
  if (amount >= ANNUAL_AMOUNT_WITHOUT_PERIOD) {
    return { monthly: amount / 12, currency };
  }
  return null;
}

export function formatSalaryRangeDisplay(pay: StatedJobPay): string | null {
  const stated = pay.salaryRange?.trim();
  if (stated) return stated;
  if (pay.salaryMin == null || !Number.isFinite(pay.salaryMin)) return null;
  const currency = upperCurrency(pay.salaryCurrency) ?? "";
  const period =
    pay.salaryPeriod === "year" ? "/year" : pay.salaryPeriod === "month" ? "/month" : "";
  const head = currency ? `${pay.salaryMin} ${currency}` : String(pay.salaryMin);
  return `${head}${period}`;
}
