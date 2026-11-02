import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "image/avif", ext: "avif", test: (b) => b.subarray(4, 12).toString() === "ftypavif" },
];

/** Detects image type from magic bytes (never trusts the client-supplied MIME type or filename). */
export function detectImage(buf: Buffer) {
  return SIGNATURES.find((s) => s.test(buf)) ?? null;
}

export const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

/**
 * Local-disk storage served via /media/*. For production at scale, replace with an
 * S3-compatible adapter (same interface) and set MEDIA_PUBLIC_HOST.
 */
export async function storeImage(buf: Buffer): Promise<{ url: string }> {
  const kind = detectImage(buf);
  if (!kind) throw new Error("Unsupported image type. Use JPEG, PNG, WebP or AVIF.");
  if (buf.length > MAX_UPLOAD_BYTES) throw new Error("Image is larger than 5 MB.");
  const now = new Date();
  const rel = path.posix.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"), `${randomUUID()}.${kind.ext}`);
  const abs = path.join(uploadRoot(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buf, { mode: 0o644 });
  return { url: `/media/${rel}` };
}

export async function readStoredFile(segments: string[]) {
  const root = uploadRoot();
  const abs = path.resolve(root, ...segments);
  if (!abs.startsWith(root + path.sep)) return null; // path traversal guard
  try {
    const buf = await readFile(abs);
    const kind = detectImage(buf);
    return kind ? { buf, mime: kind.mime } : null;
  } catch {
    return null;
  }
}
