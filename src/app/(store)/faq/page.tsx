import type { Metadata } from "next";
import Link from "next/link";
import { getFaqs } from "@/features/content/queries";

export const metadata: Metadata = { title: "FAQs", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const faqs = await getFaqs();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <div className="container-page max-w-3xl py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="eyebrow text-center">Help</p>
      <h1 className="mt-2 text-center text-4xl sm:text-5xl">Frequently asked questions</h1>
      <div className="mt-12 border-t border-line">
        {faqs.map((f) => (
          <details key={f.id} className="group border-b border-line py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl">
              {f.question}
              <span aria-hidden className="text-2xl font-light transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-charcoal/85">{f.answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-center text-sm">Still have a question? <Link href="/contact" className="underline">Contact us</Link></p>
    </div>
  );
}
