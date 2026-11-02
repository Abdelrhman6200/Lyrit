"use client";

import { useEffect, useState } from "react";
import { Media } from "@/components/ui/media";
import { ChevronLeft, ChevronRight, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: { id: string; url: string; altText: string }[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[index];

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom, images.length]);

  if (!current) return <div className="aspect-square rounded-[var(--radius-card)] bg-beige/60" />;

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto lg:w-20 lg:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={cn("relative block h-20 w-16 overflow-hidden rounded-lg border-2 bg-beige/50 transition", i === index ? "border-forest" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <Media src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative flex-1">
        <button type="button" onClick={() => setZoom(true)} className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-[var(--radius-card)] bg-beige/50" aria-label={`Enlarge image: ${current.altText}`}>
          <Media key={current.id} src={current.url} alt={current.altText} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="animate-fade-up object-cover" />
        </button>
      </div>
      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={`${name} images`} className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/90 p-4" onClick={() => setZoom(false)}>
          <button type="button" autoFocus className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close" onClick={() => setZoom(false)}>
            <CloseIcon />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" className="absolute left-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-6" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }}>
                <ChevronLeft />
              </button>
              <button type="button" className="absolute right-2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-6" aria-label="Next image" onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); }}>
                <ChevronRight />
              </button>
            </>
          )}
          <div className="relative h-[85vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Media src={current.url} alt={current.altText} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
