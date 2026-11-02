import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, LoginForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to view orders and check out faster." footer={<>New to LYRIT? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Create an account</Link></>}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
