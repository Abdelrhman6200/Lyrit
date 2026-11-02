import Link from "next/link";
import { AuthShell, ResetPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Set a new password">
      {token ? <ResetPasswordForm token={token} /> : <p className="text-sm">This link is invalid. <Link href="/forgot-password" className="underline">Request a new one</Link>.</p>}
    </AuthShell>
  );
}
