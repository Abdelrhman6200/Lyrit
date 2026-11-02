"use client";

import { useRef, useState } from "react";

/** Uploads an image to /api/admin/uploads and returns its URL. */
export function ImageUploadButton({ onUploaded, label = "Upload image" }: { onUploaded: (url: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        aria-label={label}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          const fd = new FormData();
          fd.append("file", file);
          try {
            const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Upload failed");
            onUploaded(json.url);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <button type="button" className="btn-secondary !py-2 text-xs" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Uploading…" : label}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
