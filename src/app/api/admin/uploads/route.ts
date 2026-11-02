import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/roles";
import { MAX_UPLOAD_BYTES, storeImage } from "@/lib/media/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user.roles, "products:manage") || hasPermission(user.roles, "content:manage")))
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  // CSRF: only accept same-origin requests.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || new URL(origin).host !== host) return NextResponse.json({ error: "Bad origin" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image is larger than 5 MB." }, { status: 413 });
  try {
    const { url } = await storeImage(Buffer.from(await file.arrayBuffer()));
    await audit(user.id, "media.upload", "media", url);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
