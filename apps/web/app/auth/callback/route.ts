import { NextResponse } from "next/server";
import { safeAdminDestination } from "@/lib/auth/admin-destination";
import { createUserServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = safeAdminDestination(url.searchParams.get("next"));
  const supabase = await createUserServerClient();
  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/admin/login?error=missing-link", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=expired-link", request.url));
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
