import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-beige text-charcoal",
  green: "bg-success/15 text-success",
  amber: "bg-[#F4E3C1] text-[#7A5216]",
  red: "bg-danger/10 text-danger",
  dark: "bg-charcoal text-white",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-ivory/60 text-xs uppercase tracking-wider text-muted">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {hasRows ? children : <tr><td colSpan={head.length} className="px-4 py-10 text-center text-muted">{empty ?? "Nothing here yet."}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-end gap-2 text-sm">
      {page > 1 && <Link href={href(page - 1)} className="btn-secondary !py-2">Previous</Link>}
      <span className="px-2 text-muted">Page {page} of {pageCount}</span>
      {page < pageCount && <Link href={href(page + 1)} className="btn-secondary !py-2">Next</Link>}
    </nav>
  );
}

export const paymentTone = (s: string) => (s === "PAID" ? "green" : s === "FAILED" ? "red" : s.includes("REFUND") ? "dark" : "amber") as keyof typeof TONES;
export const fulfilTone = (s: string) => (s === "DELIVERED" ? "green" : s === "SHIPPED" ? "neutral" : s === "RETURNED" ? "red" : "amber") as keyof typeof TONES;
export const orderTone = (s: string) => (s === "CANCELED" ? "red" : s === "PENDING" ? "amber" : "green") as keyof typeof TONES;
