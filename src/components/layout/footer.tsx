import Link from "next/link";
import { getFooter } from "@/features/content/queries";
import { getVisibleCategories } from "@/features/catalog/queries";
import { NewsletterForm } from "@/components/home/newsletter-form";

export async function Footer() {
  const [footer, categories] = await Promise.all([getFooter(), getVisibleCategories()]);
  return (
    <footer className="mt-24 bg-forest text-ivory">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-serif text-3xl tracking-[0.35em]">LYRIT</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-ivory/80">{footer.description}</p>
          {footer.social.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4 text-sm">
              {footer.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-ivory/80 underline-offset-4 hover:text-white hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav aria-label="Shop" className="lg:col-span-2">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-ivory/60">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/shop" className="hover:underline">All products</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link href={`/collections/${c.slug}`} className="hover:underline">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Support" className="lg:col-span-2">
          <h2 className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-ivory/60">Support</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {footer.supportLinks.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:underline">{l.label}</Link></li>
            ))}
          </ul>
          {(footer.email || footer.phone || footer.address) && (
            <address className="mt-6 space-y-1 text-sm not-italic text-ivory/80">
              {footer.email && <p><a href={`mailto:${footer.email}`} className="hover:underline">{footer.email}</a></p>}
              {footer.phone && <p><a href={`tel:${footer.phone}`} className="hover:underline">{footer.phone}</a></p>}
              {footer.address && <p>{footer.address}</p>}
            </address>
          )}
        </nav>
        <div className="md:col-span-2 lg:col-span-4">
          <h2 className="font-serif text-2xl">Join the LYRIT circle</h2>
          <p className="mt-2 text-sm text-ivory/80">Hair care rituals, new launches and members-first offers.</p>
          <NewsletterForm tone="dark" source="footer" />
        </div>
      </div>
      <div className="border-t border-ivory/15">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-ivory/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LYRIT. All rights reserved.</p>
          <ul className="flex flex-wrap gap-5">
            <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:underline">Terms & Conditions</Link></li>
            <li><Link href="/shipping-returns" className="hover:underline">Shipping & Returns</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
