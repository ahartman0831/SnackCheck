import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-link": "That sign-in link is incomplete. Request a fresh link below.",
  "expired-link":
    "That sign-in link expired or was already used. Request a fresh link below.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <p className="text-accent text-sm font-semibold uppercase tracking-[0.18em]">
        Private staging workspace
      </p>
      <h1 className="mt-3 text-4xl font-semibold">Reviewer sign-in</h1>
      <p className="text-muted mt-3 text-lg">
        We will email you a one-time sign-in code. Enter it here to continue. An account
        still needs an active SnackCheck reviewer role before it can see candidates or
        make decisions.
      </p>
      {error ? (
        <p role="alert" className="border-warning bg-elevated mt-5 rounded-xl border p-4">
          {ERROR_MESSAGES[error] ?? "Sign-in did not complete. Request a fresh link."}
        </p>
      ) : null}
      <AdminLoginForm />
      <p className="text-muted mt-8 text-sm">
        This area is separate from the public product experience. Signing in does not
        publish a product or change a ruleset.
      </p>
      <Link href="/" className="mt-5 inline-block text-sm font-semibold underline">
        Return to SnackCheck
      </Link>
    </div>
  );
}
