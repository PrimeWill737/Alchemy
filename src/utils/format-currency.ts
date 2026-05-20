import { convertFromNgn, localeForCurrency } from "@/lib/display-currencies";

export function formatCurrency(valueNgn: number, currencyCode = "NGN") {
  const convertedValue = convertFromNgn(valueNgn, currencyCode);
  const maxFractionDigits = currencyCode === "NGN" ? 0 : 2;
  return new Intl.NumberFormat(localeForCurrency(currencyCode), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: maxFractionDigits,
  }).format(convertedValue);
}
