import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  amount,
  compareAt,
  currency,
  from,
  className,
}: {
  amount: number;
  compareAt?: number | null;
  currency?: string;
  from?: boolean;
  className?: string;
}) {
  const onSale = compareAt != null && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-medium", onSale && "text-forest")}>
        {from && <span className="mr-1 text-xs font-normal text-muted">From</span>}
        {formatMoney(amount, currency)}
      </span>
      {onSale && (
        <s className="text-sm text-muted" aria-label={`Was ${formatMoney(compareAt!, currency)}`}>
          {formatMoney(compareAt!, currency)}
        </s>
      )}
    </span>
  );
}

export function discountPercent(amount: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= amount) return null;
  return Math.round(((compareAt - amount) / compareAt) * 100);
}
