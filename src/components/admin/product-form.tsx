"use client";

import { useActionState, useState } from "react";
import { saveProductAction } from "@/features/admin/product-actions";
import { minorToMajorString, parseMajorToMinor } from "@/lib/money";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { Media } from "@/components/ui/media";
import { ImageUploadButton } from "./image-upload";

type Variant = { id?: string; sku: string; variantName: string; priceMinor: number; compareAtPriceMinor: number | null; stockQuantity: number; lowStockThreshold: number; isActive: boolean };
type Img = { id?: string; url: string; altText: string };
export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  benefits: string;
  ingredients: string;
  usageInstructions: string;
  precautions: string;
  tags: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  featuredOrder: number;
  seoTitle: string;
  seoDescription: string;
  categoryIds: string[];
  relatedIds: string[];
  images: Img[];
  variants: Variant[];
};

const EMPTY: ProductFormValue = {
  name: "", slug: "", shortDescription: "", description: "", benefits: "", ingredients: "", usageInstructions: "", precautions: "", tags: "",
  status: "DRAFT", isFeatured: false, featuredOrder: 0, seoTitle: "", seoDescription: "", categoryIds: [], relatedIds: [], images: [],
  variants: [{ sku: "", variantName: "Standard", priceMinor: 0, compareAtPriceMinor: null, stockQuantity: 0, lowStockThreshold: 5, isActive: true }],
};

function TextInput({ label, value, onChange, textarea, hint, error, ...rest }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; hint?: string; error?: string } & Record<string, unknown>) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="block text-sm">
      <span className="label">{label}</span>
      <Tag className={`input ${textarea ? "min-h-24" : ""}`} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value)} aria-invalid={!!error} {...rest} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}

function MoneyInput({ label, value, onChange, nullable }: { label: string; value: number | null; onChange: (v: number | null) => void; nullable?: boolean }) {
  const [text, setText] = useState(value === null ? "" : minorToMajorString(value));
  const parsed = text.trim() === "" ? null : parseMajorToMinor(text);
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted">{label}</span>
      <input
        className="input !py-2"
        inputMode="decimal"
        value={text}
        aria-invalid={text.trim() !== "" && parsed === null}
        onChange={(e) => {
          setText(e.target.value);
          const p = e.target.value.trim() === "" ? null : parseMajorToMinor(e.target.value);
          if (p !== null || (nullable && e.target.value.trim() === "")) onChange(p);
        }}
      />
    </label>
  );
}

export function ProductForm({ product, categories, allProducts }: { product?: ProductFormValue; categories: { id: string; name: string }[]; allProducts: { id: string; name: string }[] }) {
  const [v, setV] = useState<ProductFormValue>(product ?? EMPTY);
  const [state, action] = useActionState(saveProductAction, undefined);
  const fe = state?.fieldErrors ?? {};
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const setVariant = (i: number, patch: Partial<Variant>) => set("variants", v.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setImage = (i: number, patch: Partial<Img>) => set("images", v.images.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const moveImage = (i: number, d: -1 | 1) => {
    const arr = [...v.images];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("images", arr);
  };

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <input type="hidden" name="id" value={v.id ?? ""} />
      <input type="hidden" name="payload" value={JSON.stringify(v)} />
      <div className="space-y-6">
        <FormMessage state={state} />
        <section className="card space-y-4 p-6">
          <h2 className="text-xl">Details</h2>
          <TextInput label="Name" value={v.name} onChange={(x) => set("name", x)} required error={fe.name} />
          <TextInput label="URL slug" value={v.slug} onChange={(x) => set("slug", x)} hint="Leave blank to generate from the name." error={fe.slug} />
          <TextInput label="Short description" value={v.shortDescription} onChange={(x) => set("shortDescription", x)} textarea hint="Shown near the price and in search results." error={fe.shortDescription} />
          <TextInput label="Description" value={v.description} onChange={(x) => set("description", x)} textarea rows={6} error={fe.description} />
          <TextInput label="Benefits" value={v.benefits} onChange={(x) => set("benefits", x)} textarea hint="One per line. Only include verified claims." />
          <TextInput label="Ingredients" value={v.ingredients} onChange={(x) => set("ingredients", x)} textarea />
          <TextInput label="Directions for use" value={v.usageInstructions} onChange={(x) => set("usageInstructions", x)} textarea />
          <TextInput label="Precautions" value={v.precautions} onChange={(x) => set("precautions", x)} textarea />
          <TextInput label="Tags" value={v.tags} onChange={(x) => set("tags", x)} hint="Comma separated — used for search and related products." />
        </section>

        <section className="card space-y-4 p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl">Images</h2><ImageUploadButton onUploaded={(url) => set("images", [...v.images, { url, altText: v.name }])} /></div>
          {v.images.length === 0 && <p className="text-sm text-muted">No images yet. At least one is required to publish.</p>}
          <ul className="space-y-3">
            {v.images.map((img, i) => (
              <li key={img.url + i} className="flex items-center gap-3 rounded-lg border border-line p-2">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-beige"><Media src={img.url} alt="" fill sizes="64px" className="object-cover" /></div>
                <label className="flex-1 text-xs"><span className="text-muted">Alt text {i === 0 && "(main image)"}</span><input className="input !py-2" value={img.altText} onChange={(e) => setImage(i, { altText: e.target.value })} /></label>
                <div className="flex flex-col gap-1 text-xs">
                  <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} aria-label="Move down">↓</button>
                </div>
                <button type="button" className="text-xs text-danger underline" onClick={() => set("images", v.images.filter((_, j) => j !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Variants & inventory</h2>
            <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => set("variants", [...v.variants, { sku: "", variantName: "", priceMinor: v.variants[0]?.priceMinor ?? 0, compareAtPriceMinor: null, stockQuantity: 0, lowStockThreshold: 5, isActive: true }])}>Add variant</button>
          </div>
          <p className="text-xs text-muted">Prices in EGP. Stock edits here are recorded as inventory adjustments; use Inventory for restocks with reasons.</p>
          {v.variants.map((vr, i) => (
            <div key={vr.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-6">
              <label className="text-xs sm:col-span-2"><span className="mb-1 block text-muted">Size / name</span><input className="input !py-2" value={vr.variantName} onChange={(e) => setVariant(i, { variantName: e.target.value })} placeholder="250 ml" /></label>
              <label className="text-xs sm:col-span-2"><span className="mb-1 block text-muted">SKU</span><input className="input !py-2 font-mono uppercase" value={vr.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} /></label>
              <MoneyInput label="Price" value={vr.priceMinor} onChange={(x) => setVariant(i, { priceMinor: x ?? 0 })} />
              <MoneyInput label="Compare-at" value={vr.compareAtPriceMinor} nullable onChange={(x) => setVariant(i, { compareAtPriceMinor: x })} />
              <label className="text-xs"><span className="mb-1 block text-muted">Stock</span><input type="number" min={0} className="input !py-2" value={vr.stockQuantity} onChange={(e) => setVariant(i, { stockQuantity: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} /></label>
              <label className="text-xs"><span className="mb-1 block text-muted">Low-stock alert</span><input type="number" min={0} className="input !py-2" value={vr.lowStockThreshold} onChange={(e) => setVariant(i, { lowStockThreshold: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} /></label>
              <label className="flex items-end gap-2 pb-2 text-xs"><input type="checkbox" checked={vr.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} className="h-4 w-4 accent-forest" /> Active</label>
              <div className="flex items-end justify-end pb-2 sm:col-span-3">
                {v.variants.length > 1 && <button type="button" className="text-xs text-danger underline" onClick={() => set("variants", v.variants.filter((_, j) => j !== i))}>Remove variant</button>}
              </div>
            </div>
          ))}
          {fe.variants && <p className="field-error">{fe.variants}</p>}
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-xl">Search engine listing</h2>
          <TextInput label="SEO title" value={v.seoTitle} onChange={(x) => set("seoTitle", x)} maxLength={70} hint={`${v.seoTitle.length}/70`} />
          <TextInput label="SEO description" value={v.seoDescription} onChange={(x) => set("seoDescription", x)} textarea maxLength={170} hint={`${v.seoDescription.length}/170`} />
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="text-xl">Status</h2>
          <select className="input" value={v.status} onChange={(e) => set("status", e.target.value as ProductFormValue["status"])} aria-label="Status">
            <option value="DRAFT">Draft (hidden)</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 accent-forest" /> Featured on homepage</label>
          {v.isFeatured && <label className="block text-xs"><span className="text-muted">Featured position</span><input type="number" min={0} className="input !py-2" value={v.featuredOrder} onChange={(e) => set("featuredOrder", Number(e.target.value) || 0)} /></label>}
          <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">Save product</SubmitButton>
        </section>
        <section className="card space-y-3 p-6">
          <h2 className="text-xl">Categories</h2>
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-forest" checked={v.categoryIds.includes(c.id)} onChange={(e) => set("categoryIds", e.target.checked ? [...v.categoryIds, c.id] : v.categoryIds.filter((x) => x !== c.id))} />
              {c.name}
            </label>
          ))}
        </section>
        <section className="card space-y-3 p-6">
          <h2 className="text-xl">Related products</h2>
          <p className="text-xs text-muted">Optional manual picks (max 8). Otherwise related items come from shared categories and tags.</p>
          <select multiple className="input h-48" value={v.relatedIds} onChange={(e) => set("relatedIds", Array.from(e.target.selectedOptions).map((o) => o.value).slice(0, 8))} aria-label="Related products">
            {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </section>
      </aside>
    </form>
  );
}
