import Link from "next/link";
import { AuthShell } from "@/components/auth/forms";
import { verifyEmailToken } from "@/features/customers/auth-actions";

export const metadata = { title: "Verify email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <AuthShell title={ok ? "Email verified" : "Link expired"}>
      <p className="text-sm">{ok ? "Thank you — your email address is confirmed." : "This verification link is invalid or has expired. Sign in to request a new one."}</p>
      <Link href="/account" className="btn-primary mt-6 w-full">Go to my account</Link>
    </AuthShell>
  );
}
