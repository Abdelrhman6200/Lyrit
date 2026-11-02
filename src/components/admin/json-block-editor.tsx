"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { ImageUploadButton } from "./image-upload";

type State = { error?: string; success?: string } | undefined;

/**
 * Structured content editor. Content is edited as validated JSON with an image upload helper,
 * so new block shapes don't require new UI. Validation runs server-side against Zod schemas.
 */
export function JsonBlockEditor({
  action,
  hidden,
  initial,
  help,
  showActive,
  active = true,
  sortOrder,
}: {
  action: (s: State, fd: FormData) => Promise<State>;
  hidden: Record<string, string>;
  initial: unknown;
  help?: string;
  showActive?: boolean;
  active?: boolean;
  sortOrder?: number;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [text, setText] = useState(JSON.stringify(initial, null, 2));
  const [uploaded, setUploaded] = useState<string | null>(null);
  let valid = true;
  try {
    JSON.parse(text);
  } catch {
    valid = false;
  }
  return (
    <form action={formAction} className="space-y-3">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <FormMessage state={state} />
      {help && <p className="text-xs text-muted">{help}</p>}
      <textarea name="data" value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(24, text.split("\n").length + 1)} spellCheck={false} className="input font-mono text-xs" aria-invalid={!valid} aria-label="Content JSON" />
      {!valid && <p className="field-error">JSON is not valid yet.</p>}
      <div className="flex flex-wrap items-center gap-4">
        {showActive && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={active} className="h-4 w-4 accent-forest" /> Visible</label>}
        {sortOrder !== undefined && <label className="flex items-center gap-2 text-sm">Order <input type="number" name="sortOrder" defaultValue={sortOrder} className="w-16 rounded border border-line px-2 py-1" /></label>}
        <ImageUploadButton label="Upload image → copy URL" onUploaded={setUploaded} />
        {uploaded && <code className="rounded bg-beige px-2 py-1 text-xs">{uploaded}</code>}
      </div>
      <SubmitButton className="btn-primary !py-2" pendingLabel="Saving…" disabled={!valid}>Save</SubmitButton>
    </form>
  );
}
