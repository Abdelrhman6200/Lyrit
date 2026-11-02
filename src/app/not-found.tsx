import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-serif text-2xl tracking-[0.35em]">LYRIT</p>
      <h1 className="mt-8 text-5xl">Page not found</h1>
      <p className="mt-3 text-sm text-muted">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-8 flex gap-3"><Link href="/" className="btn-primary">Go home</Link><Link href="/shop" className="btn-secondary">Shop all</Link></div>
    </main>
  );
}
