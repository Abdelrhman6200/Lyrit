import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { saveCategoryAction } from "@/features/admin/product-actions";
import { Badge, PageHeader } from "@/components/admin/ui";
import { ActionForm, L } from "@/components/admin/forms";

export const metadata = { title: "Categories" };

export default async function CategoriesAdmin() {
  await requireStaff("products:manage");
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const CategoryFields = ({ c }: { c?: (typeof categories)[number] }) => (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Name"><input name="name" defaultValue={c?.name} required className="input !py-2" /></L>
        <L label="Slug"><input name="slug" defaultValue={c?.slug} className="input !py-2" placeholder="auto from name" /></L>
        <L label="Thumbnail URL"><input name="thumbnailUrl" defaultValue={c?.thumbnailUrl ?? ""} className="input !py-2" /></L>
        <L label="Banner URL"><input name="bannerUrl" defaultValue={c?.bannerUrl ?? ""} className="input !py-2" /></L>
        <L label="Parent"><select name="parentId" defaultValue={c?.parentId ?? ""} className="input !py-2"><option value="">None (top level)</option>{categories.filter((x) => x.id !== c?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></L>
        <L label="Display order"><input name="sortOrder" type="number" min={0} defaultValue={c?.sortOrder ?? 0} className="input !py-2" /></L>
        <L label="Description" className="sm:col-span-2"><textarea name="description" defaultValue={c?.description ?? ""} className="input" rows={2} /></L>
        <L label="SEO title"><input name="seoTitle" defaultValue={c?.seoTitle ?? ""} maxLength={70} className="input !py-2" /></L>
        <L label="SEO description"><input name="seoDescription" defaultValue={c?.seoDescription ?? ""} maxLength={170} className="input !py-2" /></L>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked={c?.isVisible ?? true} className="h-4 w-4 accent-forest" /> Visible on storefront</label>
    </>
  );
  return (
    <>
      <PageHeader title="Categories" description="Order and visibility control the homepage category row and navigation." />
      <div className="space-y-3">
        {categories.map((c) => (
          <details key={c.id} className="card p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-4">
              <span className="font-medium">{c.sortOrder}. {c.name} <span className="text-xs text-muted">/{c.slug} · {c._count.products} products</span></span>
              {!c.isVisible && <Badge tone="dark">Hidden</Badge>}
            </summary>
            <div className="mt-4"><ActionForm action={saveCategoryAction}><CategoryFields c={c} /></ActionForm></div>
          </details>
        ))}
      </div>
      <section className="card mt-8 p-6"><h2 className="mb-4 text-xl">Add category</h2><ActionForm action={saveCategoryAction} submitLabel="Create category"><CategoryFields /></ActionForm></section>
    </>
  );
}
