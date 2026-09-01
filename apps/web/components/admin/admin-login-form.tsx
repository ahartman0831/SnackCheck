"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function isEmailRateLimitError(error: { code?: string; status?: number }) {
  return error.status === 429 || error.code === "over_email_send_rate_limit";
}

export function AdminLoginForm({ next = "/admin/catalog" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Staging sign-in is not configured yet.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error && isEmailRateLimitError(error)) {
      setAwaitingCode(true);
      setMessage(
        "Staging has temporarily paused new sign-in emails. Enter your most recent code, or wait up to an hour before requesting another.",
      );
    } else if (error) {
      setMessage(
        "The sign-in code could not be sent. Please wait a moment and try again.",
      );
    } else {
      setAwaitingCode(true);
      setMessage("Enter the one-time code from your SnackCheck email.");
    }
    setBusy(false);
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Staging sign-in is not configured yet.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });

    if (error) {
      setMessage("That code is incorrect or expired. Request a new code and try again.");
      setBusy(false);
      return;
    }

    setMessage("Signed in. Opening the reviewer workspace…");
    router.replace(next);
    router.refresh();
    setBusy(false);
  }

  if (awaitingCode) {
    return (
      <form onSubmit={verifyCode} className="mt-6 flex max-w-lg flex-col gap-4">
        <p className="text-muted text-sm">
          We sent a code to <span className="text-foreground font-semibold">{email}</span>
          .
        </p>
        <label className="text-sm font-semibold" htmlFor="admin-code">
          Sign-in code
        </label>
        <input
          id="admin-code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          pattern="[A-Za-z0-9]{6,10}"
          minLength={6}
          maxLength={10}
          required
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 10))
          }
          className="border-border bg-surface rounded-xl border px-4 py-3 text-center font-mono text-2xl tracking-[0.3em]"
          aria-describedby="admin-login-status"
        />
        <Button type="submit" disabled={busy || code.length < 6}>
          {busy ? "Checking code…" : "Sign in"}
        </Button>
        <div className="flex flex-wrap gap-4 text-sm">
          <button
            type="button"
            className="font-semibold underline"
            disabled={busy}
            onClick={() => void sendCode()}
          >
            Send a new code
          </button>
          <button
            type="button"
            className="font-semibold underline"
            disabled={busy}
            onClick={() => {
              setAwaitingCode(false);
              setCode("");
              setMessage(null);
            }}
          >
            Use a different email
          </button>
        </div>
        <p
          id="admin-login-status"
          aria-live="polite"
          role="status"
          className="text-muted text-sm"
        >
          {message}
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="mt-6 flex max-w-lg flex-col gap-4">
      <label className="text-sm font-semibold" htmlFor="admin-email">
        Email address
      </label>
      <input
        id="admin-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="border-border bg-surface rounded-xl border px-4 py-3"
        placeholder="you@example.com"
      />
      <Button type="submit" disabled={busy || !email.trim()}>
        {busy ? "Sending code…" : "Email me a sign-in code"}
      </Button>
      <button
        type="button"
        className="self-start text-sm font-semibold underline"
        disabled={busy || !email.trim()}
        onClick={() => {
          setAwaitingCode(true);
          setMessage("Enter the most recent one-time code sent to this email address.");
        }}
      >
        I already have a code
      </button>
      <p
        id="admin-login-status"
        aria-live="polite"
        role="status"
        className="text-muted text-sm"
      >
        {message}
      </p>
    </form>
  );
}
