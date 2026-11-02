import type { Metadata } from "next";
import { getFooter } from "@/features/content/queries";
import { ContactForm } from "@/components/content/contact-form";

export const metadata: Metadata = { title: "Contact us", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const footer = await getFooter();
  return (
    <div className="container-page grid gap-12 py-14 lg:grid-cols-2">
      <div>
        <p className="eyebrow">We're here to help</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Contact us</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-charcoal/80">Questions about an order, a product or your hair care routine? Send us a message and our team will reply within one working day.</p>
        <dl className="mt-8 space-y-4 text-sm">
          {footer.email && <div><dt className="eyebrow">Email</dt><dd className="mt-1"><a href={`mailto:${footer.email}`} className="underline">{footer.email}</a></dd></div>}
          {footer.phone && <div><dt className="eyebrow">Phone</dt><dd className="mt-1">{footer.phone}</dd></div>}
          {footer.address && <div><dt className="eyebrow">Address</dt><dd className="mt-1">{footer.address}</dd></div>}
        </dl>
      </div>
      <div className="card p-6 sm:p-8"><ContactForm /></div>
    </div>
  );
}
