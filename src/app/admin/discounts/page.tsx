import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney, minorToMajorString } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { saveDiscountAction } from "@/features/admin/misc-actions";
import { Badge, PageHeader } from "@/components/admin/ui";
import { ActionForm, L } from "@/components/admin/forms";

export const metadata = { title: "Discounts" };

const toLocal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function DiscountsAdmin() {
  await requireStaff("discounts:manage");
  const [codes, categories] = await Promise.all([db.discountCode.findMany({ orderBy: { createdAt: "desc" } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  type Code = (typeof codes)[number];
  const Fields = ({ d }: { d?: Code }) => (
    <>
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <L label="Code"><input name="code" defaultValue={d?.code} required className="input !py-2 uppercase" /></L>
        <L label="Type"><select name="type" defaultValue={d?.type ?? "PERCENTAGE"} className="input !py-2"><option value="PERCENTAGE">Percentage (%)</option><option value="FIXED_AMOUNT">Fixed amount (EGP)</option></select></L>
        <L label="Value"><input name="value" defaultValue={d ? (d.type === "PERCENTAGE" ? d.value : minorToMajorString(d.value)) : ""} required inputMode="decimal" className="input !py-2" /></L>
        <L label="Minimum order (EGP)"><input name="minOrder" defaultValue={d?.minOrderMinor != null ? minorToMajorString(d.minOrderMinor) : ""} inputMode="decimal" className="input !py-2" /></L>
        <L label="Max discount (EGP)"><input name="maxDiscount" defaultValue={d?.maxDiscountMinor != null ? minorToMajorString(d.maxDiscountMinor) : ""} inputMode="decimal" className="input !py-2" /></L>
        <L label="Total usage limit"><input name="usageLimit" type="number" min={1} defaultValue={d?.usageLimit ?? ""} className="input !py-2" /></L>
        <L label="Per-customer limit"><input name="perCustomerLimit" type="number" min={1} defaultValue={d?.perCustomerLimit ?? ""} className="input !py-2" /></L>
        <L label="Starts"><input name="startsAt" type="datetime-local" defaultValue={toLocal(d?.startsAt ?? null)} className="input !py-2" /></L>
        <L label="Expires"><input name="expiresAt" type="datetime-local" defaultValue={toLocal(d?.expiresAt ?? null)} className="input !py-2" /></L>
        <L label="Internal description" className="sm:col-span-3"><input name="description" defaultValue={d?.description ?? ""} className="input !py-2" /></L>
      </div>
      <fieldset className="text-sm"><legend className="label">Limit to categories (optional)</legend>
        <div className="flex flex-wrap gap-4">{categories.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="eligibleCategoryIds" value={c.id} defaultChecked={d?.eligibleCategoryIds.includes(c.id)} className="h-4 w-4 accent-forest" />{c.name}</label>)}</div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={d?.isActive ?? true} className="h-4 w-4 accent-forest" /> Active</label>
    </>
  );
  const now = new Date();
  return (
    <>
      <PageHeader title="Discount codes" description="All discount rules are validated on the server at checkout." />
      <div className="space-y-3">
        {codes.map((d) => {
          const expired = d.expiresAt && d.expiresAt <= now;
          const exhausted = d.usageLimit !== null && d.usageCount >= d.usageLimit;
          return (
            <details key={d.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                <span><span className="font-mono font-medium">{d.code}</span> <span className="text-sm text-muted">· {d.type === "PERCENTAGE" ? `${d.value}%` : formatMoney(d.value)} off · used {d.usageCount}{d.usageLimit ? `/${d.usageLimit}` : ""}{d.expiresAt && ` · until ${formatDate(d.expiresAt)}`}</span></span>
                <Badge tone={!d.isActive || expired || exhausted ? "dark" : "green"}>{!d.isActive ? "Inactive" : expired ? "Expired" : exhausted ? "Used up" : "Active"}</Badge>
              </summary>
              <div className="mt-4"><ActionForm action={saveDiscountAction}><Fields d={d} /></ActionForm></div>
            </details>
          );
        })}
      </div>
      <section className="card mt-8 p-6"><h2 className="mb-4 text-xl">Create discount</h2><ActionForm action={saveDiscountAction} submitLabel="Create discount"><Fields /></ActionForm></section>
    </>
  );
}
