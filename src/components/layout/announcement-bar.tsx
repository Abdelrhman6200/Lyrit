"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AnnouncementBar({ messages }: { messages: { text: string; href?: string }[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (messages.length < 2 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 5000);
    return () => clearInterval(t);
  }, [messages.length, paused]);
  const m = messages[i];
  return (
    <div
      className="bg-forest text-ivory"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-page flex h-9 items-center justify-center text-center text-xs tracking-wide sm:text-[13px]">
        <p key={i} className="animate-fade-up truncate">
          {m.href ? (
            <Link href={m.href} className="underline-offset-4 hover:underline">{m.text}</Link>
          ) : (
            m.text
          )}
        </p>
      </div>
    </div>
  );
}
