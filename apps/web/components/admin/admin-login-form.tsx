"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminLoginForm({ next = "/admin/catalog" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Staging sign-in is not configured yet.");
      setBusy(false);
      return;
    }

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callback.toString(),
        shouldCreateUser: true,
      },
    });

    setMessage(
      error
        ? "The sign-in email could not be sent. Please wait a moment and try again."
        : "Check your email for a one-time SnackCheck sign-in link.",
    );
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-lg flex-col gap-4">
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
        {busy ? "Sending secure link…" : "Email me a secure sign-in link"}
      </Button>
      <p aria-live="polite" role="status" className="text-muted text-sm">
        {message}
      </p>
    </form>
  );
}
