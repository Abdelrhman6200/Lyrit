"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">Please try again. If the problem continues, contact us.</p>
      <button type="button" onClick={reset} className="btn-primary mt-8">Try again</button>
    </main>
  );
}
