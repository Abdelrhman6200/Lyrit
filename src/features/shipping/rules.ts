import type { ShippingZone } from "@prisma/client";

type Zone = Pick<ShippingZone, "id" | "regions" | "feeMinor" | "freeShippingThreshold" | "isActive">;

/** Shipping fee for a zone given the post-discount merchandise total. */
export function shippingFeeFor(zone: Zone, merchandiseMinor: number): number {
  if (zone.freeShippingThreshold !== null && merchandiseMinor >= zone.freeShippingThreshold) return 0;
  return zone.feeMinor;
}

export function zoneCoversRegion(zone: Zone, governorate: string): boolean {
  if (!zone.isActive) return false;
  if (zone.regions.length === 0) return true; // catch-all zone
  const g = governorate.trim().toLowerCase();
  return zone.regions.some((r) => r.toLowerCase() === g);
}
