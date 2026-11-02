import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge pre-check: bounce visitors without a session cookie away from protected areas early.
 * Real authorisation (session validity + role permissions) is enforced server-side in every
 * admin page, server action and route handler.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("lyrit_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
