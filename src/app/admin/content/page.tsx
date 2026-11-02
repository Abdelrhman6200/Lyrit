import { requireStaff } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteContentBlockAction, deleteFaqAction, saveContentBlockAction, saveFaqAction, savePageAction, saveSettingAction } from "@/features/admin/misc-actions";
import { getFooter, getNavigation } from "@/features/content/queries";
import { PageHeader } from "@/components/admin/ui";
import { ActionForm, L } from "@/components/admin/forms";
import { JsonBlockEditor } from "@/components/admin/json-block-editor";

export const metadata = { title: "Storefront content" };

const PROMO_TEMPLATE = { eyebrow: "New", headline: "Headline", description: "Short description", cta: { label: "Shop now", href: "/shop" }, image: "/images/promo-treatments.svg", imageAlt: "Describe the image", theme: "beige" };

function Section({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="card p-6" open={open}>
      <summary className="cursor-pointer text-xl font-serif">{title}</summary>
      <div className="mt-4 space-y-6">{children}</div>
    </details>
  );
}

export default async function ContentAdmin() {
  await requireStaff("content:manage");
  const [blocks, pages, faqs, nav, footer] = await Promise.all([
    db.contentBlock.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }),
    db.page.findMany({ orderBy: { slug: "asc" } }),
    db.faq.findMany({ orderBy: { sortOrder: "asc" } }),
    getNavigation(),
    getFooter(),
  ]);
  const block = (key: string) => blocks.find((b) => b.key === key);
  const promos = blocks.filter((b) => b.type === "promo");
  const announcement = block("announcement");
  const hero = block("hero");
  const benefits = block("benefits");

  return (
    <>
      <PageHeader title="Storefront content" description="Changes go live immediately — no redeploy needed. Featured products are set on each product; category order under Categories." />
      <div className="space-y-4">
        <Section title="Announcement bar" open>
          <JsonBlockEditor action={saveContentBlockAction} hidden={{ key: "announcement", type: "announcement" }} initial={announcement?.data ?? { messages: [{ text: "Free delivery on orders over EGP 1,000", href: "/shipping-returns" }] }} showActive active={announcement?.isActive ?? true} help="Up to 5 rotating messages. href is optional." />
        </Section>
        <Section title="Hero banner">
          <JsonBlockEditor action={saveContentBlockAction} hidden={{ key: "hero", type: "hero" }} initial={hero?.data ?? {}} showActive active={hero?.isActive ?? true} help="imageDesktop is required; imageMobile is optional. secondaryCta can be null." />
        </Section>
        <Section title="Brand benefits">
          <JsonBlockEditor action={saveContentBlockAction} hidden={{ key: "benefits", type: "benefits" }} initial={benefits?.data ?? { items: [] }} showActive active={benefits?.isActive ?? true} help='Up to 4 items. icon: leaf | shield | truck | chat | drop | sparkle. Only use verified claims.' />
        </Section>
        <Section title="Promotional blocks">
          {promos.map((p) => (
            <div key={p.id} className="rounded-xl border border-line p-4">
              <div className="mb-2 flex items-center justify-between"><p className="font-mono text-sm">{p.key}</p><form action={deleteContentBlockAction}><input type="hidden" name="key" value={p.key} /><button className="text-xs text-danger underline">Delete</button></form></div>
              <JsonBlockEditor action={saveContentBlockAction} hidden={{ key: p.key, type: "promo" }} initial={p.data} showActive active={p.isActive} sortOrder={p.sortOrder} help="theme: beige | green | ivory" />
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-line p-4">
            <p className="mb-2 text-sm font-medium">New promo block</p>
            <JsonBlockEditor action={saveContentBlockAction} hidden={{ key: `promo-${Date.now().toString(36)}`, type: "promo" }} initial={PROMO_TEMPLATE} showActive sortOrder={promos.length} />
          </div>
        </Section>
        <Section title="Main navigation">
          <JsonBlockEditor action={saveSettingAction} hidden={{ key: "navigation" }} initial={nav} help="Up to 10 links: { label, href }." />
        </Section>
        <Section title="Footer">
          <JsonBlockEditor action={saveSettingAction} hidden={{ key: "footer" }} initial={footer} />
        </Section>
        <Section title="Pages (About, Shipping & Returns, Privacy, Terms)">
          <p className="text-xs text-muted">Formatting: blank line between paragraphs, “## ” for headings, “- ” for bullet lists, [text](url) for links, **bold**.</p>
          {(["about", "shipping-returns", "privacy", "terms"] as const).map((slug) => {
            const p = pages.find((x) => x.slug === slug);
            return (
              <div key={slug} className="rounded-xl border border-line p-4">
                <ActionForm action={savePageAction} submitLabel={`Save /${slug}`}>
                  <input type="hidden" name="slug" value={slug} />
                  <L label="Title"><input name="title" defaultValue={p?.title ?? ""} required className="input !py-2" /></L>
                  <L label="SEO description"><input name="seoDescription" defaultValue={p?.seoDescription ?? ""} maxLength={170} className="input !py-2" /></L>
                  <L label="Body"><textarea name="body" defaultValue={p?.body ?? ""} rows={10} className="input font-mono text-xs" /></L>
                </ActionForm>
              </div>
            );
          })}
        </Section>
        <Section title="FAQs">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-line p-4">
              <ActionForm action={saveFaqAction}>
                <input type="hidden" name="id" value={f.id} />
                <L label="Question"><input name="question" defaultValue={f.question} required className="input !py-2" /></L>
                <L label="Answer"><textarea name="answer" defaultValue={f.answer} rows={3} required className="input" /></L>
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">Order <input type="number" name="sortOrder" defaultValue={f.sortOrder} className="w-16 rounded border border-line px-2 py-1" /></label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="isVisible" defaultChecked={f.isVisible} className="h-4 w-4 accent-forest" /> Visible</label>
                </div>
              </ActionForm>
              <form action={deleteFaqAction} className="mt-2"><input type="hidden" name="id" value={f.id} /><button className="text-xs text-danger underline">Delete FAQ</button></form>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-line p-4">
            <ActionForm action={saveFaqAction} submitLabel="Add FAQ">
              <L label="Question"><input name="question" required className="input !py-2" /></L>
              <L label="Answer"><textarea name="answer" rows={3} required className="input" /></L>
              <input type="hidden" name="sortOrder" value={faqs.length} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked className="h-4 w-4 accent-forest" /> Visible</label>
            </ActionForm>
          </div>
        </Section>
      </div>
    </>
  );
}
