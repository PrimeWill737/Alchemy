/** ISO 4217 codes surfaced in admin UI */
export type DisplayCurrencyCode =
  | "NGN"
  | "USD"
  | "EUR"
  | "GBP"
  | "CAD"
  | "AUD"
  | "INR"
  | "ZAR";

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrencyCode = "NGN";

export const DISPLAY_CURRENCY_OPTIONS: { code: DisplayCurrencyCode; label: string }[] = [
  { code: "NGN", label: "NGN (₦)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "CAD", label: "CAD ($)" },
  { code: "AUD", label: "AUD ($)" },
  { code: "INR", label: "INR (₹)" },
  { code: "ZAR", label: "ZAR (R)" },
];

const codes = new Set(DISPLAY_CURRENCY_OPTIONS.map((o) => o.code));

export function isDisplayCurrencyCode(value: unknown): value is DisplayCurrencyCode {
  return typeof value === "string" && codes.has(value as DisplayCurrencyCode);
}

export function localeForCurrency(code: string): string {
  const map: Record<string, string> = {
    USD: "en-US",
    NGN: "en-NG",
    EUR: "de-DE",
    GBP: "en-GB",
    CAD: "en-CA",
    AUD: "en-AU",
    INR: "en-IN",
    ZAR: "en-ZA",
  };
  return map[code] ?? "en-US";
}

/**
 * All monetary values in the app are stored in NGN.
 * Convert from NGN into the selected display currency.
 */
export function convertFromNgn(valueNgn: number, currencyCode: string): number {
  if (currencyCode === "NGN") return valueNgn;

  const ngnPerUnit: Record<string, number> = {
    USD: 1550,
    EUR: 1680,
    GBP: 1960,
    CAD: 1140,
    AUD: 1030,
    INR: 18.7,
    ZAR: 84.2,
  };

  const rate = ngnPerUnit[currencyCode] ?? ngnPerUnit.USD;
  return valueNgn / rate;
}
