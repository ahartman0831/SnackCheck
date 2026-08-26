import { NextResponse } from "next/server";
import { createUserServerClient } from "@/lib/supabase/server";
import { fail, ok, requestId } from "@/lib/api/envelope";

export async function GET() {
  const id = requestId();
  const supabase = await createUserServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) {
    return NextResponse.json(
      fail("UNAUTHORIZED", "Admin authentication required.", { id }),
      {
        status: 401,
      },
    );
  }
  return NextResponse.json(ok({ userId: user.id }, id));
}
