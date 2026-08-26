import { NextResponse } from "next/server";
import { createUserServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await createUserServerClient();
  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/admin", request.url));
}
