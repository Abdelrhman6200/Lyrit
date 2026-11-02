// All monetary values are integer minor units (e.g. piasters). Never use floats for money.

export const STORE_CURRENCY = (process.env.STORE_CURRENCY ?? "EGP").toUpperCase();

export function formatMoney(minor: number, currency: string = STORE_CURRENCY, locale = "en-EG"): string {
  const amount = minor / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Parses a user-entered major-unit amount ("149.50") into minor units without float error. */
export function parseMajorToMinor(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function minorToMajorString(minor: number): string {
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

/** Integer percentage of an amount, rounded half-up to the nearest minor unit. */
export function percentOf(minor: number, percent: number): number {
  return Math.floor((minor * percent + 50) / 100);
}
