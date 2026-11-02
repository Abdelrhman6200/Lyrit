import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { simulateMockPayment } from "@/features/payments/mock-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Test payment", robots: { index: false } };

type SP = Promise<Record<string, string | undefined>>;

/** Development stand-in for a hosted gateway page. Disabled in production unless explicitly allowed. */
export default async function MockGateway({ searchParams }: { searchParams: SP }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") notFound();
  const sp = await searchParams;
  if (!sp.ref || !sp.return) notFound();
  return (
    <div className="container-page max-w-md py-20">
      <div className="card space-y-6 p-8 text-center">
        <p className="eyebrow">Test payment gateway</p>
        <h1 className="text-3xl">Order {sp.order}</h1>
        <p className="text-2xl">{formatMoney(Number(sp.amount ?? 0), sp.currency)}</p>
        <p className="text-sm text-muted">This simulates the provider-hosted payment page. No real card is charged.</p>
        <form action={simulateMockPayment} className="space-y-3">
          <input type="hidden" name="ref" value={sp.ref} />
          <input type="hidden" name="amount" value={sp.amount} />
          <input type="hidden" name="currency" value={sp.currency} />
          <input type="hidden" name="return" value={sp.return} />
          <button name="outcome" value="succeeded" className="btn-primary w-full">Simulate successful payment</button>
          <button name="outcome" value="failed" className="btn-secondary w-full">Simulate declined payment</button>
        </form>
      </div>
    </div>
  );
}
