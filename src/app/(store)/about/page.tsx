import type { Metadata } from "next";
import Link from "next/link";
import { getPage } from "@/features/content/queries";
import { RichText } from "@/components/content/rich-text";
import { Media } from "@/components/ui/media";

export const metadata: Metadata = { title: "About LYRIT", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const page = await getPage("about");
  return (
    <div className="container-page py-14">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Our story</p>
          <h1 className="mt-2 text-4xl sm:text-6xl">{page?.title ?? "About LYRIT"}</h1>
          <div className="mt-8">{page ? <RichText body={page.body} /> : null}</div>
          <Link href="/shop" className="btn-primary mt-4">Discover the collection</Link>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-beige">
          <Media src="/images/photos/about.webp" alt="Long, glossy, healthy wavy hair" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </div>
    </div>
  );
}
