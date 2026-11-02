import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney, minorToMajorString } from "@/lib/money";
import { saveShippingZoneAction } from "@/features/admin/misc-actions";
import { EGYPT_GOVERNORATES } from "@/features/shipping/governorates";
import { Badge, PageHeader } from "@/components/admin/ui";
import { ActionForm, L } from "@/components/admin/forms";

export const metadata = { title: "Shipping" };

export default async function ShippingAdmin() {
  await requireStaff("shipping:manage");
  const zones = await db.shippingZone.findMany({ orderBy: { sortOrder: "asc" } });
  type Zone = (typeof zones)[number];
  const Fields = ({ z }: { z?: Zone }) => (
    <>
      {z && <input type="hidden" name="id" value={z.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <L label="Name"><input name="name" defaultValue={z?.name} required className="input !py-2" placeholder="Greater Cairo" /></L>
        <L label="Fee (EGP)"><input name="fee" defaultValue={z ? minorToMajorString(z.feeMinor) : ""} required inputMode="decimal" className="input !py-2" /></L>
        <L label="Free shipping over (EGP)"><input name="freeOver" defaultValue={z?.freeShippingThreshold != null ? minorToMajorString(z.freeShippingThreshold) : ""} inputMode="decimal" className="input !py-2" /></L>
        <L label="Min days"><input name="estimatedDaysMin" type="number" min={0} defaultValue={z?.estimatedDaysMin ?? 2} className="input !py-2" /></L>
        <L label="Max days"><input name="estimatedDaysMax" type="number" min={0} defaultValue={z?.estimatedDaysMax ?? 5} className="input !py-2" /></L>
        <L label="Display order"><input name="sortOrder" type="number" min={0} defaultValue={z?.sortOrder ?? 0} className="input !py-2" /></L>
      </div>
      <fieldset className="text-sm"><legend className="label">Governorates covered (none selected = all remaining areas)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{EGYPT_GOVERNORATES.map((g) => <label key={g} className="flex items-center gap-2"><input type="checkbox" name="regions" value={g} defaultChecked={z?.regions.includes(g)} className="h-4 w-4 accent-forest" />{g}</label>)}</div>
      </fieldset>
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="codAvailable" defaultChecked={z?.codAvailable ?? true} className="h-4 w-4 accent-forest" /> Cash on delivery available</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={z?.isActive ?? true} className="h-4 w-4 accent-forest" /> Active</label>
      </div>
    </>
  );
  return (
    <>
      <PageHeader title="Shipping zones" description="Zone-based flat fees with optional free-shipping thresholds." />
      <div className="space-y-3">
        {zones.map((z) => (
          <details key={z.id} className="card p-4">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span><span className="font-medium">{z.name}</span> <span className="text-sm text-muted">· {formatMoney(z.feeMinor)}{z.freeShippingThreshold != null && ` · free over ${formatMoney(z.freeShippingThreshold)}`} · {z.regions.length ? `${z.regions.length} governorates` : "All other areas"}</span></span>
              <Badge tone={z.isActive ? "green" : "dark"}>{z.isActive ? "Active" : "Inactive"}</Badge>
            </summary>
            <div className="mt-4"><ActionForm action={saveShippingZoneAction}><Fields z={z} /></ActionForm></div>
          </details>
        ))}
      </div>
      <section className="card mt-8 p-6"><h2 className="mb-4 text-xl">Add zone</h2><ActionForm action={saveShippingZoneAction} submitLabel="Create zone"><Fields /></ActionForm></section>
    </>
  );
}
