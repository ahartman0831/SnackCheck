"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminSignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={signOut}
      className="border-border hover:bg-elevated rounded-full border px-3 py-2 text-sm font-semibold"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
