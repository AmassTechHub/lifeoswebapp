// ── Currency utilities ────────────────────────────────────────────────────────
// Single source of truth for all money formatting across LifeOS.
// Every component that shows monetary values should use formatMoney() instead
// of hardcoding ₵ or GHS.

export type CurrencyOption = {
  code: string;       // ISO 4217
  symbol: string;     // display symbol
  label: string;      // human-readable name
  locale: string;     // BCP 47 locale for number formatting
};

export const CURRENCIES: CurrencyOption[] = [
  { code: "GHS", symbol: "₵",  label: "Ghana Cedi (₵)",          locale: "en-GH" },
  { code: "NGN", symbol: "₦",  label: "Nigerian Naira (₦)",       locale: "en-NG" },
  { code: "KES", symbol: "KSh",label: "Kenyan Shilling (KSh)",    locale: "en-KE" },
  { code: "ZAR", symbol: "R",  label: "South African Rand (R)",   locale: "en-ZA" },
  { code: "USD", symbol: "$",  label: "US Dollar ($)",             locale: "en-US" },
  { code: "GBP", symbol: "£",  label: "British Pound (£)",        locale: "en-GB" },
  { code: "EUR", symbol: "€",  label: "Euro (€)",                 locale: "en-EU" },
  { code: "CAD", symbol: "CA$",label: "Canadian Dollar (CA$)",    locale: "en-CA" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (A$)",   locale: "en-AU" },
  { code: "INR", symbol: "₹",  label: "Indian Rupee (₹)",         locale: "en-IN" },
  { code: "UGX", symbol: "USh",label: "Ugandan Shilling (USh)",   locale: "en-UG" },
  { code: "TZS", symbol: "TSh",label: "Tanzanian Shilling (TSh)", locale: "sw-TZ" },
  { code: "XOF", symbol: "CFA",label: "West African CFA (CFA)",   locale: "fr-SN" },
  { code: "EGP", symbol: "E£", label: "Egyptian Pound (E£)",      locale: "ar-EG" },
  { code: "MAD", symbol: "MAD",label: "Moroccan Dirham (MAD)",    locale: "ar-MA" },
  { code: "JPY", symbol: "¥",  label: "Japanese Yen (¥)",         locale: "ja-JP" },
  { code: "CNY", symbol: "¥",  label: "Chinese Yuan (¥)",         locale: "zh-CN" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real (R$)",      locale: "pt-BR" },
  { code: "MXN", symbol: "MX$",label: "Mexican Peso (MX$)",       locale: "es-MX" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (S$)",    locale: "en-SG" },
];

export const DEFAULT_CURRENCY = "GHS";

export function getCurrencyOption(code: string): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Format a number as a monetary value using the user's currency.
 *
 * @param amount     - the numeric value
 * @param currencyCode - ISO 4217 code stored on the user (e.g. "USD", "GHS")
 * @param opts       - optional overrides
 */
export function formatMoney(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  const currency = getCurrencyOption(currencyCode);
  const { decimals = 2, compact = false } = opts;

  if (compact && Math.abs(amount) >= 1000) {
    const k = amount / 1000;
    return `${currency.symbol}${k.toFixed(1)}k`;
  }

  return `${currency.symbol}${amount.toFixed(decimals)}`;
}

/**
 * Format with sign prefix (for net/balance figures).
 */
export function formatMoneyWithSign(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const formatted = formatMoney(Math.abs(amount), currencyCode);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}
