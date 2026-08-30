import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fail, ok, requestId } from "@/lib/api/envelope";

export async function GET() {
  const id = requestId();
  const auth = await requireAdmin(["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"]);
  if (!auth.allowed || !auth.user || !auth.role) {
    return NextResponse.json(
      fail("UNAUTHORIZED", "Admin authentication required.", { id }),
      {
        status: 401,
      },
    );
  }
  return NextResponse.json(ok({ userId: auth.user.id, role: auth.role }, id));
}
