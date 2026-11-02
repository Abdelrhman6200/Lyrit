import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, RegisterForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <AuthShell title="Create an account" subtitle="Track orders, save addresses and check out faster." footer={<>Already have an account? <Link href="/login" className="underline">Sign in</Link></>}>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
