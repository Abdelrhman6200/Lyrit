export type TotalsInput = {
  lines: { unitPriceMinor: number; quantity: number }[];
  discountMinor: number;
  shippingMinor: number;
};

export type Totals = { subtotalMinor: number; discountMinor: number; shippingMinor: number; totalMinor: number };

export function computeTotals({ lines, discountMinor, shippingMinor }: TotalsInput): Totals {
  for (const l of lines) {
    if (!Number.isInteger(l.unitPriceMinor) || l.unitPriceMinor < 0) throw new Error("Invalid unit price");
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new Error("Invalid quantity");
  }
  const subtotalMinor = lines.reduce((s, l) => s + l.unitPriceMinor * l.quantity, 0);
  const discount = Math.min(Math.max(0, discountMinor), subtotalMinor);
  const shipping = Math.max(0, shippingMinor);
  return { subtotalMinor, discountMinor: discount, shippingMinor: shipping, totalMinor: subtotalMinor - discount + shipping };
}
