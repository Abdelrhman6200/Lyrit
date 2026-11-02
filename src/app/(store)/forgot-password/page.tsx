import Link from "next/link";
import { AuthShell, ForgotPasswordForm } from "@/components/auth/forms";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link." footer={<Link href="/login" className="underline">Back to sign in</Link>}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
