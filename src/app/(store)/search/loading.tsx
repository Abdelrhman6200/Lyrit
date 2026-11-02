import { ProductGridSkeleton } from "@/components/product/product-card";

export default function Loading() {
  return (
    <div className="container-page py-12" aria-busy="true" aria-label="Loading">
      <div className="skeleton mx-auto mb-10 h-10 w-64" />
      <ProductGridSkeleton />
    </div>
  );
}
