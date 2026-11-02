import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/features/content/queries";
import { RichText } from "@/components/content/rich-text";
import { formatDate } from "@/lib/utils";

const ALLOWED = ["shipping-returns", "privacy", "terms"] as const;
type Props = { params: Promise<{ page: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  if (!ALLOWED.includes(page as (typeof ALLOWED)[number])) return {};
  const p = await getPage(page);
  return p ? { title: p.title, description: p.seoDescription ?? undefined, alternates: { canonical: `/${page}` } } : {};
}

export default async function StaticPage({ params }: Props) {
  const { page } = await params;
  if (!ALLOWED.includes(page as (typeof ALLOWED)[number])) notFound();
  const p = await getPage(page);
  if (!p) notFound();
  return (
    <article className="container-page max-w-3xl py-14">
      <h1 className="text-4xl sm:text-5xl">{p.title}</h1>
      <p className="mt-3 text-xs text-muted">Last updated {formatDate(p.updatedAt, { dateStyle: "long" })}</p>
      <div className="mt-10"><RichText body={p.body} /></div>
    </article>
  );
}
