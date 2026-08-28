import { NextResponse } from "next/server";
import { fail, ok, requestId } from "@/lib/api/envelope";
import {
  isUsablePublishedRuleset,
  loadArizonaSources,
  loadPublishedArizonaRuleset,
} from "@/lib/rules/arizona";

export async function GET() {
  const id = requestId();
  const [ruleset, sources] = await Promise.all([
    loadPublishedArizonaRuleset(),
    loadArizonaSources(),
  ]);
  if (!isUsablePublishedRuleset(ruleset)) {
    return NextResponse.json(
      fail(
        "RULESET_UNAVAILABLE",
        "A published Arizona ruleset is not available. Evaluations cannot return PASS.",
        { id },
      ),
      { status: 503 },
    );
  }
  return NextResponse.json(ok({ ruleset, sources }, id));
}
