import { NextResponse } from "next/server";
import { ok, requestId } from "@/lib/api/envelope";
import { loadArizonaSources, loadPublishedArizonaRuleset } from "@/lib/rules/arizona";

export async function GET() {
  const [ruleset, sources] = await Promise.all([
    loadPublishedArizonaRuleset(),
    loadArizonaSources(),
  ]);
  return NextResponse.json(ok({ ruleset, sources }, requestId()));
}
