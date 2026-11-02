import Link from "next/link";
import { getAnnouncement, getNavigation } from "@/features/content/queries";
import { findCart } from "@/features/cart/service";
import { getCurrentUser } from "@/lib/auth/session";
import { BagIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { AnnouncementBar } from "./announcement-bar";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const [nav, announcement, cart, user] = await Promise.all([getNavigation(), getAnnouncement(), findCart(), getCurrentUser()]);
  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      {announcement && announcement.messages.length > 0 && <AnnouncementBar messages={announcement.messages} />}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/80">
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileMenu items={nav.items} signedIn={!!user} />
          </div>
          <Link href="/" className="font-serif text-2xl tracking-[0.35em] lg:text-3xl" aria-label="LYRIT home">
            LYRIT
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-8 text-sm tracking-wide">
              {nav.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="relative py-2 transition-colors hover:text-forest after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-forest after:transition-transform hover:after:scale-x-100">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/search" className="btn-ghost !px-2.5" aria-label="Search">
              <SearchIcon />
            </Link>
            <Link href="/account" className="btn-ghost hidden !px-2.5 sm:inline-flex" aria-label={user ? "My account" : "Sign in"}>
              <UserIcon />
            </Link>
            <Link href="/cart" className="btn-ghost relative !px-2.5" aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}>
              <BagIcon />
              {count > 0 && (
                <span key={count} className="animate-fade-up absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1 text-[11px] font-medium text-white">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
