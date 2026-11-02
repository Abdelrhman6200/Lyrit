import Link from "next/link";
import type { Category } from "@prisma/client";
import type { Benefits, Hero, Promo } from "@/features/content/types";
import { Media } from "@/components/ui/media";
import { BENEFIT_ICONS } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function HeroSection({ hero }: { hero: Hero }) {
  return (
    <section className="container-page pt-6 lg:pt-10">
      <div className="grid overflow-hidden rounded-[1.5rem] bg-beige lg:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-6 py-12 sm:px-12 lg:order-1 lg:py-24">
          {hero.eyebrow && <p className="eyebrow">{hero.eyebrow}</p>}
          <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{hero.headline}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-charcoal/80">{hero.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={hero.primaryCta.href} className="btn-primary">{hero.primaryCta.label}</Link>
            {hero.secondaryCta && <Link href={hero.secondaryCta.href} className="btn-secondary">{hero.secondaryCta.label}</Link>}
          </div>
        </div>
        <div className="relative order-1 aspect-[4/3] lg:order-2 lg:aspect-auto lg:min-h-[560px]">
          {hero.imageMobile ? (
            <>
              <Media src={hero.imageMobile} alt={hero.imageAlt} fill priority sizes="100vw" className="object-cover lg:hidden" />
              <Media src={hero.imageDesktop} alt={hero.imageAlt} fill priority sizes="50vw" className="hidden object-cover lg:block" />
            </>
          ) : (
            <Media src={hero.imageDesktop} alt={hero.imageAlt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}

export function CategoriesSection({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <section className="container-page mt-20" aria-labelledby="cat-heading">
      <div className="text-center">
        <p className="eyebrow">Explore</p>
        <h2 id="cat-heading" className="mt-2 text-3xl sm:text-4xl">Shop by category</h2>
      </div>
      <ul className="-mx-4 mt-10 flex snap-x gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {categories.map((c) => (
          <li key={c.id} className="w-28 shrink-0 snap-start sm:w-auto">
            <Link href={`/collections/${c.slug}`} className="group flex flex-col items-center text-center">
              <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-beige ring-1 ring-line transition group-hover:ring-forest">
                {c.thumbnailUrl && <Media src={c.thumbnailUrl} alt="" fill sizes="(min-width:1024px) 16vw, 120px" className="object-cover transition duration-500 group-hover:scale-105" />}
              </span>
              <span className="mt-3 text-sm font-medium tracking-wide group-hover:text-forest">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BenefitsSection({ benefits }: { benefits: Benefits }) {
  if (!benefits.items.length) return null;
  return (
    <section className="mt-20 border-y border-line bg-white/60" aria-label="Why LYRIT">
      <ul className="container-page grid grid-cols-2 gap-8 py-10 lg:grid-cols-4">
        {benefits.items.map((b) => {
          const Icon = BENEFIT_ICONS[b.icon];
          return (
            <li key={b.title} className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-beige text-forest"><Icon /></span>
              <div className="mt-3 sm:mt-0">
                <h3 className="font-sans text-sm font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted">{b.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const PROMO_THEME = {
  beige: "bg-beige text-charcoal",
  ivory: "bg-white text-charcoal",
  green: "bg-forest text-ivory",
};

export function PromoSection({ promos }: { promos: Promo[] }) {
  if (!promos.length) return null;
  return (
    <section className="container-page mt-24 grid gap-6 lg:grid-cols-2" aria-label="Promotions">
      {promos.map((p, i) => (
        <article key={i} className={cn("grid overflow-hidden rounded-[1.5rem] sm:grid-cols-2", PROMO_THEME[p.theme], promos.length === 1 && "lg:col-span-2")}>
          <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[320px]">
            <Media src={p.image} alt={p.imageAlt} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center p-8">
            {p.eyebrow && <p className={cn("eyebrow", p.theme === "green" && "!text-ivory/70")}>{p.eyebrow}</p>}
            <h2 className="mt-2 text-3xl leading-tight">{p.headline}</h2>
            <p className={cn("mt-3 text-sm leading-6", p.theme === "green" ? "text-ivory/80" : "text-charcoal/75")}>{p.description}</p>
            <Link href={p.cta.href} className={cn("mt-6 self-start", p.theme === "green" ? "btn bg-ivory text-forest hover:bg-white" : "btn-primary")}>
              {p.cta.label}
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
